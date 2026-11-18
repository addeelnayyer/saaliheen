// The Passage tables and their one load (#171, ADR 0011, ADR 0015). The load
// carries its own input, 0013-load-passages-and-phrases-files.json beside it:
// the Passages file and the Phrases file as last committed (3a52736), never
// edited (ADR 0041). It is read here, and only here, once per database, inside
// the content migration's transaction. The load makes the checks the dataset
// build made: each Surah's Passages keep the Passages module's rules, and each
// Phrase the Phrase rules; a refusal names the Surah or the Phrase and, rolled
// back with its transaction, writes nothing and is not recorded as run. It
// writes one `seed` Passage revision per Surah (base 0, version 1) and each
// Surah's content hash, the SHA-256 of the Surah file /data/v1 serves for it.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { problems, type Passage } from "@saaliheen/passages";
import type { Phrase, Surah } from "@saaliheen/dataset/types";
import { readSurahs } from "../../src/quran/quran.ts";
import { surahContentHash, withAyahThemes, withPassagesAndPhrases } from "../../src/passages/served-surah.ts";
import { everyAyahThemes } from "../../src/themes/themes.ts";
import { auditTable } from "./content-audit.ts";
import { insertAll } from "./themes.ts";

const LOAD_INPUT = fileURLToPath(new URL("./0013-load-passages-and-phrases-files.json", import.meta.url));

/** The load's input: the Passages file's entries, as it wrote them, and the Phrases file's. */
export interface PassagesInput {
  passages: { surah_no: number; ayah_from: number; ayah_till: number; title_en: string; title_ur: string }[];
  phrases: Phrase[];
}

/**
 * Create `passage`, `phrase`, `passage_revision` and `surah_content_hash`.
 * The first three are audited in `content_audit` (ADR 0038); a stored content
 * hash is derived from them and the Quran dataset, so it is not. Word
 * locations sort by their bytes (`collate "C"`). A Passage revision's version
 * is the one after its base, from 1.
 */
export async function createPassageTables(client: PoolClient): Promise<void> {
  await client.query(`
    create table passage (
      surah smallint not null check (surah between 1 and 114),
      ayah_from smallint not null check (ayah_from >= 1),
      ayah_till smallint not null,
      title_en text not null,
      title_ur text not null,
      primary key (surah, ayah_from),
      check (ayah_till >= ayah_from)
    )`);
  await client.query(`
    create table phrase (
      surah smallint not null check (surah between 1 and 114),
      first_word text collate "C" primary key,
      last_word text collate "C" not null
    )`);
  await client.query(`create index phrase_by_surah on phrase (surah)`);
  await client.query(`
    create table passage_revision (
      surah smallint not null check (surah between 1 and 114),
      author text not null,
      created_at timestamptz not null default now(),
      edits jsonb not null,
      base integer not null check (base >= 0),
      version integer not null,
      primary key (surah, version),
      check (version = base + 1)
    )`);
  await client.query(`
    create table surah_content_hash (
      surah smallint primary key check (surah between 1 and 114),
      hash text collate "C" not null check (hash ~ '^[0-9a-f]{64}$')
    )`);
  for (const table of ["passage", "phrase", "passage_revision"]) await auditTable(client, table);
}

/** Each Surah's Passages from `input`, by Surah number, in file order. */
function passagesBySurah(input: PassagesInput): Map<number, Passage[]> {
  const bySurah = new Map<number, Passage[]>();
  for (const p of input.passages) {
    const list = bySurah.get(p.surah_no) ?? bySurah.set(p.surah_no, []).get(p.surah_no)!;
    list.push({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur });
  }
  return bySurah;
}

/** Throws, naming the Surah and its Ayahs, when any Surah's Passages break the Passages module's rules, or name a Surah there is not. */
function checkPassages(bySurah: Map<number, Passage[]>, surahs: Surah[]) {
  const stray = [...bySurah.keys()].find((n) => !surahs.some((s) => s.number === n));
  if (stray !== undefined) throw new Error(`Passage load: Passages for Surah ${stray}, which is not a Surah`);
  const found = surahs.flatMap(({ number, ayahCount }) => problems(bySurah.get(number) ?? [], ayahCount).map((p) => `Surah ${number}, ${p}`));
  if (found.length) throw new Error(`Passage load: ${found.join("; ")}`);
}

/** The Surah of Phrase `p`'s first Word. */
const surahOf = (p: Phrase) => Number(p.first.split(":")[0]);

/** Throws, naming it, at a Phrase in no Surah of the Quran (the Phrase rules check those in one). */
function checkPhraseSurahs(phrases: Phrase[], surahs: Surah[]) {
  const numbers = new Set(surahs.map((s) => s.number));
  const stray = phrases.find((p) => !numbers.has(surahOf(p)));
  if (stray) throw new Error(`Passage load: Phrase ${stray.first}–${stray.last} is in no Surah`);
}

/** Each Surah's content hash, `{ surah, hash }`, of `served`, each Surah as /data/v1 serves it, with each Ayah's Themes as `client` holds them. */
async function contentHashes(client: PoolClient, served: Surah[]) {
  const themes = await everyAyahThemes(client);
  return served.map((surah) => ({ surah: surah.number, hash: surahContentHash(withAyahThemes(surah, themes[surah.number - 1] ?? [])) }));
}

/**
 * `input` checked as the load checks it before it writes a row: each Surah's
 * Passages keep the Passages module's rules, and each Phrase is in a Surah of
 * the Quran and keeps the Phrase rules. Gives each of `surahs` (every Surah of
 * the Quran, Surah 1 first) served with them; throws, naming the Surah and its
 * Ayahs or the Phrase, at input that breaks a rule. It reads no database.
 */
export function checkedLoad(input: PassagesInput, surahs: Surah[]): Surah[] {
  const bySurah = passagesBySurah(input);
  checkPassages(bySurah, surahs);
  checkPhraseSurahs(input.phrases, surahs);
  return surahs.map((surah) => withPassagesAndPhrases(surah, bySurah.get(surah.number)!, input.phrases));
}

/**
 * Load every Passage and Phrase from `input` (by default the carried files),
 * one `seed` Passage revision per Surah (base 0, version 1, no edits), and each
 * Surah's content hash. Throws, naming the Surah or the Phrase, when a Passage
 * or a Phrase breaks its rules. The Quran is `client`'s, as the import loads
 * it before the content migrations run (ADR 0049).
 */
export async function loadPassages(client: PoolClient, input: PassagesInput = readPassagesFiles()): Promise<void> {
  const surahs = await readSurahs(client);
  const hashes = await contentHashes(client, checkedLoad(input, surahs));
  await insertAll(
    client,
    "passage",
    "surah smallint, ayah_from smallint, ayah_till smallint, title_en text, title_ur text",
    input.passages.map(({ surah_no, ...p }) => ({ surah: surah_no, ...p })),
  );
  await insertAll(
    client,
    "phrase",
    "surah smallint, first_word text, last_word text",
    input.phrases.map(({ first, last }) => ({ surah: surahOf({ first, last }), first_word: first, last_word: last })),
  );
  await client.query(
    `insert into passage_revision (surah, author, edits, base, version) select number, 'seed', '[]'::jsonb, 0, 1 from unnest($1::smallint[]) as number`,
    [surahs.map((s) => s.number)],
  );
  await insertAll(client, "surah_content_hash", "surah smallint, hash text", hashes);
}

/** The load's input, the Passages and Phrases files as last committed. */
function readPassagesFiles(): PassagesInput {
  return JSON.parse(fs.readFileSync(LOAD_INPUT, "utf8")) as PassagesInput;
}
