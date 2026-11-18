// Shared by the import features' steps (#172 AC-1, AC-2, AC-8). The Quran
// import is the dataset builder's transform, with its checks, writing
// normalized rows into Postgres (ADR 0049). Its entry point runs as a process,
// as `pnpm db:migrate` and the deploy run it:
//
//   DATABASE_URL=<postgres> node scripts/db-import.ts [<sources directory>]
//
// the sources directory laid out as apps/web/data (its `qul/`, roots.json and quran-morphology.txt),
// apps/web/data when none is given. The steps run it, then read back what it
// wrote, and hold it to the committed sources and to what the builder makes
// of them. The rows it writes (ADR 0049):
//
//   surah             (number, name_arabic, name_latin, revelation_place, ayah_count, bismillah)
//   ayah              (surah, number, indopak_end, translation_ur, translation_en)
//   root              (id, letters, transliteration, occurrences, unique_words, hash), hash the Root file's SHA-256
//   lemma             (root, position, qul_id, text), position the Lemma's in its Root's order, from 1
//   spelling          (root, lemma, position, uthmani, indopak, meaning_ur, meaning_en)
//   spelling_word     (location, root, lemma, spelling): each Word of a Spelling, in Quran order by its Word
//   word              (location, surah, ayah, position, uthmani, indopak, meaning_ur, meaning_en, root_id), its Root tag's letters its Root's
//   word_segment      (location, position, uthmani, part_of_speech, affix, kind, …), each Word's Segments from quran-morphology.txt (#275)
//   juz               (script, number, name, first_ayah, last_ayah)
//   section_mark      (surah, ayah, kind 'hizb-quarter' | 'ruku', label)
//   recitation        (surah, reciter, audio)
//   recitation_ayah   (surah, ayah, from_ms, to_ms)
//   recitation_timing (surah, ayah, position, word, start_ms, end_ms), position the order the Reciter says them
//   dataset_import    (sources_hash, imported_at), one row per load; the latest is the stored hash
//
// An Ayah's Word count is the number of its Word rows.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { Client, Pool } from "pg";
import { expect } from "vitest";
import type { Recitation, SectionMarks, SurahSummary } from "@saaliheen/dataset";
import { buildFromCommittedSources, DATA } from "../dataset/support.ts";
import { importDatabase, runPort } from "./import-database.ts";

export const WEB = path.join(import.meta.dirname, "..", "..");
/** The import's entry point (ADR 0049). */
export const IMPORT_SCRIPT = path.join(WEB, "scripts", "db-import.ts");
const NODE_FLAGS = ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--disable-warning=ExperimentalWarning"];

/** The address of database `name` in the run's import Postgres. */
export const databaseUrl = (name: string) => importDatabase(runPort()).url.replace(/\/saaliheen_test$/, `/${name}`);

/** Run `sql` against `url`, giving its rows. */
export async function query<T extends object>(url: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

const admin = (sql: string) => query(importDatabase(runPort()).url, sql);
const exists = async (name: string) =>
  (await query<{ n: number }>(importDatabase(runPort()).url, "select count(*)::int as n from pg_database where datname = $1", [name]))[0].n > 0;

/** A new, empty database `name` (or a copy of `template`), replacing any left by an earlier run; its address. */
export async function freshDatabase(name: string, template?: string): Promise<string> {
  await admin(`drop database if exists "${name}" with (force)`);
  await admin(`create database "${name}"${template ? ` template "${template}"` : ""}`);
  return databaseUrl(name);
}

/** Remove database `name`, which the run's Postgres keeps in memory. */
export async function dropDatabase(name: string) {
  await admin(`drop database if exists "${name}" with (force)`);
}

/** What one run of the import did: its exit status and all it wrote to stdout and stderr. */
export interface ImportRun {
  status: number | null;
  output: string;
}

/** Run the import into `url` on `sourceDir` (the committed sources when none is given), as a process, and wait for it. */
export function runImport(url: string, sourceDir?: string): ImportRun {
  const run = spawnSync("node", [...NODE_FLAGS, IMPORT_SCRIPT, ...(sourceDir ? [sourceDir] : [])], {
    cwd: WEB,
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: run.status, output: `${run.stdout ?? ""}${run.stderr ?? ""}${run.error ? String(run.error) : ""}` };
}

export function expectSucceeded(run: ImportRun) {
  expect(run.status, `the import failed:\n${run.output.slice(-3000)}`).toBe(0);
}

const BASE = "imported_base";

/**
 * A database holding the import of the committed sources, made once per run
 * (under another name, renamed when the import succeeds, so a failed import
 * never leaves one behind), and copied for each scenario that changes it.
 */
export async function importedCopy(name: string): Promise<string> {
  if (!(await exists(BASE))) {
    const making = `${BASE}_making`;
    expectSucceeded(runImport(await freshDatabase(making)));
    await admin(`alter database "${making}" rename to "${BASE}"`);
  }
  return freshDatabase(name, BASE);
}

/** The sources hash the import stored last in `url`, or undefined when it stored none. */
export async function storedSourcesHash(url: string): Promise<string | undefined> {
  const tables = await query<{ n: number }>(url, "select count(*)::int as n from pg_tables where schemaname = 'public' and tablename = 'dataset_import'");
  if (tables[0].n === 0) return undefined;
  const rows = await query<{ sources_hash: string }>(url, "select sources_hash from dataset_import order by imported_at desc limit 1");
  return rows[0]?.sources_hash;
}

/** Every table in `url` with its row count, and a transaction id no later write can be older than. */
export interface Snapshot {
  rows: Record<string, number>;
  txid: string;
}

const tables = async (url: string) =>
  (await query<{ tablename: string }>(url, "select tablename from pg_tables where schemaname = 'public' order by tablename")).map((t) => t.tablename);

export async function snapshot(url: string): Promise<Snapshot> {
  const rows: Record<string, number> = {};
  for (const table of await tables(url)) rows[table] = (await query<{ n: number }>(url, `select count(*)::int as n from "${table}"`))[0].n;
  const [{ txid }] = await query<{ txid: string }>(url, "select txid_current()::text as txid");
  return { rows, txid };
}

/**
 * What was written to `url` since `before`: each table added or removed, each
 * whose row count changed, and each holding a row written by a later
 * transaction (a row inserted or updated, or deleted and put back). Empty
 * when nothing was written.
 */
export async function writtenSince(url: string, before: Snapshot): Promise<string[]> {
  const now = await tables(url);
  const written = Object.keys(before.rows)
    .filter((t) => !now.includes(t))
    .map((t) => `${t} removed`);
  for (const table of now) {
    if (!(table in before.rows)) {
      written.push(`${table} added`);
      continue;
    }
    const [{ n, newer }] = await query<{ n: number; newer: number }>(
      url,
      `select count(*)::int as n, count(*) filter (where xmin::text::bigint > $1::bigint)::int as newer from "${table}"`,
      [before.txid],
    );
    if (n !== before.rows[table]) written.push(`${table}: ${before.rows[table]} rows, now ${n}`);
    if (newer > 0) written.push(`${table}: ${newer} rows written`);
  }
  return written;
}

/** One Word as the import's rows give it, in the builder's shape. */
export interface ImportedWord {
  location: string;
  uthmani: string;
  indopak: string;
  meaning: { ur: string; en: string };
  root: { id: number; letters: string } | null;
}
export interface ImportedAyah {
  number: number;
  indopakEnd: string;
  translation: { ur: string; en: string };
  words: ImportedWord[];
}
export interface ImportedSurah extends SurahSummary {
  sectionMarks: SectionMarks;
  ayahs: ImportedAyah[];
}
export interface Imported {
  surahs: ImportedSurah[];
  recitations: Recitation[];
}

/** Everything the import wrote to `url`, read back into the builder's shapes, Surah 1 first and each list in its order. */
export async function readImported(url: string): Promise<Imported> {
  const surahRows = await query<{ number: number; name_arabic: string; name_latin: string; revelation_place: "makki" | "madani"; ayah_count: number; bismillah: boolean }>(
    url,
    "select number, name_arabic, name_latin, revelation_place, ayah_count, bismillah from surah order by number",
  );
  const ayahRows = await query<{ surah: number; number: number; indopak_end: string; translation_ur: string; translation_en: string }>(
    url,
    "select surah, number, indopak_end, translation_ur, translation_en from ayah order by surah, number",
  );
  const wordRows = await query<{ location: string; surah: number; ayah: number; uthmani: string; indopak: string; meaning_ur: string; meaning_en: string; root_id: number | null; root_letters: string | null }>(
    url,
    "select w.location, w.surah, w.ayah, w.uthmani, w.indopak, w.meaning_ur, w.meaning_en, w.root_id, r.letters as root_letters from word w left join root r on r.id = w.root_id order by w.surah, w.ayah, w.position",
  );
  const markRows = await query<{ surah: number; ayah: number; kind: string; label: string }>(url, "select surah, ayah, kind, label from section_mark order by surah, ayah, kind");
  const recitationRows = await query<{ surah: number; reciter: string; audio: string }>(url, "select surah, reciter, audio from recitation order by surah");
  const recitedRows = await query<{ surah: number; ayah: number; from_ms: number; to_ms: number }>(url, "select surah, ayah, from_ms, to_ms from recitation_ayah order by surah, ayah");
  const timingRows = await query<{ surah: number; ayah: number; word: number; start_ms: number; end_ms: number }>(
    url,
    "select surah, ayah, word, start_ms, end_ms from recitation_timing order by surah, ayah, position",
  );

  const key = (s: number, a: number) => `${s}:${a}`;
  const words = new Map<string, ImportedWord[]>();
  for (const w of wordRows) {
    const list = words.get(key(w.surah, w.ayah)) ?? [];
    list.push({ location: w.location, uthmani: w.uthmani, indopak: w.indopak, meaning: { ur: w.meaning_ur, en: w.meaning_en }, root: w.root_id === null ? null : { id: w.root_id, letters: w.root_letters! } });
    words.set(key(w.surah, w.ayah), list);
  }
  const surahs: ImportedSurah[] = surahRows.map((s) => ({
    number: s.number,
    nameArabic: s.name_arabic,
    nameLatin: s.name_latin,
    revelationPlace: s.revelation_place,
    ayahCount: s.ayah_count,
    bismillah: s.bismillah,
    sectionMarks: {
      hizbQuarters: markRows.filter((m) => m.surah === s.number && m.kind === "hizb-quarter").map((m) => ({ ayah: m.ayah, label: m.label })),
      rukus: markRows.filter((m) => m.surah === s.number && m.kind === "ruku").map((m) => ({ ayah: m.ayah, label: m.label })),
    },
    ayahs: ayahRows
      .filter((a) => a.surah === s.number)
      .map((a) => ({ number: a.number, indopakEnd: a.indopak_end, translation: { ur: a.translation_ur, en: a.translation_en }, words: words.get(key(a.surah, a.number)) ?? [] })),
  }));
  const timings = new Map<string, [number, number, number][]>();
  for (const t of timingRows) timings.set(key(t.surah, t.ayah), [...(timings.get(key(t.surah, t.ayah)) ?? []), [t.word, t.start_ms, t.end_ms]]);
  const recitations: Recitation[] = recitationRows.map((r) => ({
    surah: r.surah,
    reciter: r.reciter,
    audio: r.audio,
    ayahs: recitedRows.filter((a) => a.surah === r.surah).map((a) => ({ number: a.ayah, from: a.from_ms, to: a.to_ms, words: timings.get(key(a.surah, a.ayah)) ?? [] })),
  }));
  return { surahs, recitations };
}

/**
 * What the builder makes of the committed sources, in the import's shapes:
 * the Quran text, Word meanings, Ayah translations, Surah metadata, Section
 * marks and Recitations, without what Neon already holds from elsewhere
 * (Passages, Phrases, Phrase colours, Themes), or the Roots and Juz lists (roots-import.feature).
 */
export function builtExpected(): Imported {
  const { dataset } = buildFromCommittedSources();
  return {
    surahs: dataset.surahs.map((s) => ({
      number: s.number,
      nameArabic: s.nameArabic,
      nameLatin: s.nameLatin,
      revelationPlace: s.revelationPlace,
      ayahCount: s.ayahCount,
      bismillah: s.bismillah,
      sectionMarks: s.sectionMarks,
      ayahs: s.ayahs.map((a) => ({
        number: a.number,
        indopakEnd: a.indopakEnd,
        translation: { ur: a.translation.ur, en: a.translation.en },
        words: a.words.map((w) => ({ location: w.location, uthmani: w.uthmani, indopak: w.indopak, meaning: { ur: w.meaning.ur, en: w.meaning.en }, root: w.root ? { id: w.root.id, letters: w.root.letters } : null })),
      })),
    })),
    recitations: dataset.recitations,
  };
}

export { DATA };

/** Read `url` through the site's own reads of Neon, closing the pool after. */
export async function throughSite<T>(url: string, read: (db: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    return await read(pool);
  } finally {
    await pool.end();
  }
}
