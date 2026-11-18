// The Quran import (#172, #173, ADR 0049): the dataset builder's transform,
// with every check it makes, writing normalized rows into Postgres rather than
// files: the Quran text, Word meanings and Recitation timings, every Root with
// its Lemmas and Spellings, every particle with its Spellings (#249), each
// Word's grammar, Segment by Segment (#275), and each Script's Juz list. It hashes the sources it reads (and the builder that reads them): the
// same hash as the last import's writes nothing. A new one replaces every row
// of the Quran's tables, stores the hash and refreshes each Surah's stored
// content hash, in one transaction; a source failing a check throws before a
// row is written. scripts/db-import.ts runs it, and `pnpm db:migrate` runs it
// before the content migrations, which read the Surahs it loads (./quran.ts).

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";
import { buildDataset, readWordGrammar, WORD_GRAMMAR_SOURCE, type Dataset, type Report } from "@saaliheen/dataset";
import type { Segment } from "@saaliheen/dataset/grammar";
import { SCRIPTS, type Particle, type Root } from "@saaliheen/dataset/types";
import { publishedHash } from "@saaliheen/dataset/published";
import { storeContentHash, surahPassages } from "../passages/passages.ts";
import { servedSurahHash } from "../passages/served-surah.ts";
import { everyAyahThemes } from "../themes/themes.ts";

/** The Quran's tables, children first: the order their rows are deleted in. */
const TABLES = [
  "word_segment",
  "particle_word",
  "particle_spelling",
  "spelling_word",
  "spelling",
  "lemma",
  "recitation_timing",
  "recitation_ayah",
  "recitation",
  "section_mark",
  "word",
  "ayah",
  "surah",
  "root",
  "particle",
  "juz",
];

/** Serialises concurrent imports into one database. */
const LOCK = "select pg_advisory_xact_lock(hashtext('dataset_import'))";

/** The files beside `qul/` the builder reads. */
const BESIDE_QUL = ["roots.json", "indopak-juz-starts.json", WORD_GRAMMAR_SOURCE];

/**
 * The builder's own code, the Passage rules it checks with, and this module,
 * which lays out the rows: a change to any may change what the import makes of
 * the same sources.
 */
const BUILDER = [
  ["builder", path.dirname(fileURLToPath(import.meta.resolve("@saaliheen/dataset")))],
  ["passages", path.dirname(fileURLToPath(import.meta.resolve("@saaliheen/passages")))],
];
const IMPORTER = fileURLToPath(import.meta.url);

/** Each file of `dir` (following links), not its directories, by name. */
const filesIn = (dir: string) => fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isFile()).sort();

/**
 * The hash of the sources in `sourceDir` (laid out as apps/web/data) and of the
 * builder: each file's name and the SHA-256 of its bytes, so a complete copy
 * of the sources elsewhere hashes the same, and a file changed, added or
 * removed does not.
 */
export function sourcesHash(sourceDir: string): string {
  const qul = path.join(sourceDir, "qul");
  const files = [
    ...(fs.existsSync(qul) ? filesIn(qul).map((name) => [`qul/${name}`, path.join(qul, name)]) : []),
    ...BESIDE_QUL.filter((name) => fs.existsSync(path.join(sourceDir, name))).map((name) => [name, path.join(sourceDir, name)]),
    ...BUILDER.flatMap(([label, dir]) =>
      filesIn(dir)
        .filter((name) => name.endsWith(".ts"))
        .map((name) => [`${label}/${name}`, path.join(dir, name)]),
    ),
    ["quran/import.ts", IMPORTER],
  ];
  const hash = createHash("sha256");
  for (const [name, file] of files) hash.update(`${name}\0${createHash("sha256").update(fs.readFileSync(file)).digest("hex")}\n`);
  return hash.digest("hex");
}

/** The sources hash the last import into `client`'s database stored, or undefined when none has run. */
export async function storedSourcesHash(client: Pick<PoolClient, "query">): Promise<string | undefined> {
  const table = await client.query<{ exists: boolean }>(`select to_regclass('dataset_import') is not null as exists`);
  if (!table.rows[0].exists) return undefined;
  const { rows } = await client.query<{ sources_hash: string }>(`select sources_hash from dataset_import order by imported_at desc limit 1`);
  return rows[0]?.sources_hash;
}

/**
 * Create the Quran's tables where they are not yet, and bring an earlier
 * import's up to date: a Word's Root tag takes its letters from its Root
 * (#173). Word locations sort by their bytes (`collate "C"`). A Word has a
 * Root or a particle, never both (#249).
 */
async function createTables(client: PoolClient) {
  await client.query(`
    create table if not exists root (
      id integer primary key,
      letters text not null,
      transliteration text not null,
      occurrences integer not null,
      unique_words integer not null,
      hash text collate "C" not null check (hash ~ '^[0-9a-f]{64}$')
    );
    create table if not exists particle (
      id integer primary key,
      kind text not null check (kind in ('lemma', 'spelling')),
      text text not null,
      indopak text not null,
      occurrences integer not null,
      hash text collate "C" not null check (hash ~ '^[0-9a-f]{64}$')
    );
    create table if not exists surah (
      number smallint primary key check (number between 1 and 114),
      name_arabic text not null,
      name_latin text not null,
      revelation_place text not null check (revelation_place in ('makki', 'madani')),
      ayah_count smallint not null,
      bismillah boolean not null
    );
    create table if not exists ayah (
      surah smallint not null references surah,
      number smallint not null check (number >= 1),
      indopak_end text not null,
      translation_ur text not null,
      translation_en text not null,
      primary key (surah, number)
    );
    create table if not exists word (
      location text collate "C" primary key,
      surah smallint not null,
      ayah smallint not null,
      position smallint not null check (position >= 1),
      uthmani text not null,
      indopak text not null,
      meaning_ur text not null,
      meaning_en text not null,
      root_id integer references root,
      particle_id integer references particle,
      constraint word_root_or_particle check ((root_id is null) <> (particle_id is null)),
      unique (surah, ayah, position),
      foreign key (surah, ayah) references ayah
    );
    create table if not exists section_mark (
      surah smallint not null,
      ayah smallint not null,
      kind text not null check (kind in ('hizb-quarter', 'ruku')),
      label text not null,
      primary key (surah, ayah, kind),
      foreign key (surah, ayah) references ayah
    );
    create table if not exists recitation (
      surah smallint primary key references surah,
      reciter text not null,
      audio text not null,
      hash text collate "C" not null check (hash ~ '^[0-9a-f]{64}$')
    );
    create table if not exists recitation_ayah (
      surah smallint not null references recitation,
      ayah smallint not null,
      from_ms integer not null,
      to_ms integer not null,
      primary key (surah, ayah),
      foreign key (surah, ayah) references ayah
    );
    create table if not exists recitation_timing (
      surah smallint not null,
      ayah smallint not null,
      position smallint not null check (position >= 1),
      word smallint not null,
      start_ms integer not null,
      end_ms integer not null,
      primary key (surah, ayah, position),
      foreign key (surah, ayah) references recitation_ayah
    );
    create table if not exists lemma (
      root integer not null references root,
      position smallint not null check (position >= 1),
      qul_id integer,
      text text,
      primary key (root, position),
      check ((qul_id is null) = (text is null))
    );
    create table if not exists spelling (
      root integer not null,
      lemma smallint not null,
      position smallint not null check (position >= 1),
      uthmani text not null,
      indopak text not null,
      meaning_ur text not null,
      meaning_en text not null,
      primary key (root, lemma, position),
      foreign key (root, lemma) references lemma
    );
    create table if not exists spelling_word (
      location text collate "C" primary key references word on delete cascade,
      root integer not null,
      lemma smallint not null,
      spelling smallint not null,
      foreign key (root, lemma, spelling) references spelling
    );
    create index if not exists spelling_word_spelling on spelling_word (root, lemma, spelling);
    create table if not exists particle_spelling (
      particle integer not null references particle,
      position smallint not null check (position >= 1),
      uthmani text not null,
      indopak text not null,
      meaning_ur text not null,
      meaning_en text not null,
      primary key (particle, position)
    );
    create table if not exists particle_word (
      location text collate "C" primary key references word on delete cascade,
      particle integer not null,
      spelling smallint not null,
      foreign key (particle, spelling) references particle_spelling
    );
    create index if not exists particle_word_spelling on particle_word (particle, spelling);
    create table if not exists word_segment (
      location text collate "C" not null references word on delete cascade,
      position smallint not null check (position >= 1),
      uthmani text not null,
      part_of_speech text not null check (part_of_speech in ('N', 'V', 'P')),
      affix text not null check (affix in ('prefix', 'stem', 'suffix')),
      kind text,
      derivation text check (derivation in ('ACT_PCPL', 'PASS_PCPL', 'VN')),
      adjective boolean not null,
      "case" text check ("case" in ('NOM', 'ACC', 'GEN')),
      indefinite boolean not null,
      person smallint check (person between 1 and 3),
      gender text check (gender in ('M', 'F')),
      number text check (number in ('S', 'D', 'P')),
      aspect text check (aspect in ('PERF', 'IMPF', 'IMPV')),
      verb_form smallint check (verb_form between 1 and 12),
      mood text check (mood in ('IND', 'SUBJ', 'JUS')),
      passive boolean not null,
      family text check (family in ('INNA', 'KANA', 'KADA')),
      primary key (location, position)
    );
    create table if not exists juz (
      script text not null check (script in ('uthmani', 'indopak')),
      number smallint not null check (number between 1 and 30),
      name text not null,
      first_ayah text not null,
      last_ayah text not null,
      primary key (script, number)
    );
    create table if not exists dataset_import (
      sources_hash text collate "C" not null,
      imported_at timestamptz not null default clock_timestamp()
    )`);
}

/**
 * Bring a Word table an earlier import made up to date, once it is emptied:
 * its Root tag's letters are its Root's (#173), and a Word with no Root has a
 * particle (#249).
 */
async function upgradeWordTable(client: PoolClient) {
  await client.query(`
    alter table word drop constraint if exists word_check;
    alter table word drop column if exists root_letters;
    alter table word add column if not exists particle_id integer references particle;
    do $$ begin
      if not exists (select from pg_constraint where conname = 'word_root_id_fkey') then
        alter table word add constraint word_root_id_fkey foreign key (root_id) references root;
      end if;
      if not exists (select from pg_constraint where conname = 'word_root_or_particle') then
        alter table word add constraint word_root_or_particle check ((root_id is null) <> (particle_id is null));
      end if;
    end $$`);
}

/** Insert `rows` into `table`, one array per column, typed as `columns` names them, in one statement. */
async function insertColumns(client: PoolClient, table: string, columns: Record<string, string>, rows: unknown[][]) {
  const names = Object.keys(columns);
  const arrays = names.map((_, i) => rows.map((row) => row[i]));
  const unnest = Object.values(columns).map((type, i) => `$${i + 1}::${type}[]`);
  await client.query(`insert into ${table} (${names.join(", ")}) select * from unnest(${unnest.join(", ")})`, arrays);
}

/** Write every row of `dataset`'s Roots, particles, Surahs, Recitations and Juz lists, and each Word's `segments`, into the emptied tables. */
async function insertQuran(client: PoolClient, { surahs, recitations, roots, particles, juz }: Dataset, segments: Segment[]) {
  await insertColumns(
    client,
    "root",
    { id: "integer", letters: "text", transliteration: "text", occurrences: "integer", unique_words: "integer", hash: "text" },
    roots.map((r) => [r.id, r.letters, r.transliteration, r.occurrences, r.uniqueWords, publishedHash(r)]),
  );
  await insertColumns(
    client,
    "particle",
    { id: "integer", kind: "text", text: "text", indopak: "text", occurrences: "integer", hash: "text" },
    particles.map((p) => [p.id, p.kind, p.text, p.indopak, p.occurrences, publishedHash(p)]),
  );
  await insertColumns(
    client,
    "surah",
    { number: "smallint", name_arabic: "text", name_latin: "text", revelation_place: "text", ayah_count: "smallint", bismillah: "boolean" },
    surahs.map((s) => [s.number, s.nameArabic, s.nameLatin, s.revelationPlace, s.ayahCount, s.bismillah]),
  );
  const ayahs = surahs.flatMap((s) => s.ayahs.map((a) => ({ surah: s.number, ayah: a })));
  await insertColumns(
    client,
    "ayah",
    { surah: "smallint", number: "smallint", indopak_end: "text", translation_ur: "text", translation_en: "text" },
    ayahs.map(({ surah, ayah }) => [surah, ayah.number, ayah.indopakEnd, ayah.translation.ur, ayah.translation.en]),
  );
  await insertColumns(
    client,
    "word",
    {
      location: "text",
      surah: "smallint",
      ayah: "smallint",
      position: "smallint",
      uthmani: "text",
      indopak: "text",
      meaning_ur: "text",
      meaning_en: "text",
      root_id: "integer",
      particle_id: "integer",
    },
    ayahs.flatMap(({ surah, ayah }) =>
      ayah.words.map((w, i) => [
        w.location,
        surah,
        ayah.number,
        i + 1,
        w.uthmani,
        w.indopak,
        w.meaning.ur,
        w.meaning.en,
        w.root?.id ?? null,
        w.particle?.id ?? null,
      ]),
    ),
  );
  await insertRoots(client, roots);
  await insertParticles(client, particles);
  await insertColumns(
    client,
    "word_segment",
    {
      location: "text",
      position: "smallint",
      uthmani: "text",
      part_of_speech: "text",
      affix: "text",
      kind: "text",
      derivation: "text",
      adjective: "boolean",
      '"case"': "text",
      indefinite: "boolean",
      person: "smallint",
      gender: "text",
      number: "text",
      aspect: "text",
      verb_form: "smallint",
      mood: "text",
      passive: "boolean",
      family: "text",
    },
    segments.map((g) => [
      g.location,
      g.position,
      g.uthmani,
      g.partOfSpeech,
      g.affix,
      g.kind,
      g.derivation,
      g.adjective,
      g.case,
      g.indefinite,
      g.person,
      g.gender,
      g.number,
      g.aspect,
      g.verbForm,
      g.mood,
      g.passive,
      g.family,
    ]),
  );
  await insertColumns(
    client,
    "juz",
    { script: "text", number: "smallint", name: "text", first_ayah: "text", last_ayah: "text" },
    SCRIPTS.flatMap((script) => juz[script].map((j) => [script, j.number, j.name, j.firstAyah, j.lastAyah])),
  );
  await insertColumns(
    client,
    "section_mark",
    { surah: "smallint", ayah: "smallint", kind: "text", label: "text" },
    surahs.flatMap((s) => [
      ...s.sectionMarks.hizbQuarters.map((m) => [s.number, m.ayah, "hizb-quarter", m.label]),
      ...s.sectionMarks.rukus.map((m) => [s.number, m.ayah, "ruku", m.label]),
    ]),
  );
  await insertColumns(
    client,
    "recitation",
    { surah: "smallint", reciter: "text", audio: "text", hash: "text" },
    recitations.map((r) => [r.surah, r.reciter, r.audio, publishedHash(r)]),
  );
  await insertColumns(
    client,
    "recitation_ayah",
    { surah: "smallint", ayah: "smallint", from_ms: "integer", to_ms: "integer" },
    recitations.flatMap((r) => r.ayahs.map((a) => [r.surah, a.number, a.from, a.to])),
  );
  await insertColumns(
    client,
    "recitation_timing",
    { surah: "smallint", ayah: "smallint", position: "smallint", word: "smallint", start_ms: "integer", end_ms: "integer" },
    recitations.flatMap((r) => r.ayahs.flatMap((a) => a.words.map(([word, start, end], i) => [r.surah, a.number, i + 1, word, start, end]))),
  );
}

/**
 * Write each Root's Lemmas, their Spellings and each Spelling's Words: each by
 * its position in the builder's order, from 1, the Words in Quran order. A
 * Lemma's count and representative meaning are its Spellings'.
 */
async function insertRoots(client: PoolClient, roots: Root[]) {
  const lemmas = roots.flatMap((r) => r.lemmas.map((l, i) => ({ root: r.id, position: i + 1, lemma: l })));
  const spellings = lemmas.flatMap((l) => l.lemma.spellings.map((s, i) => ({ ...l, spellingAt: i + 1, spelling: s })));
  await insertColumns(
    client,
    "lemma",
    { root: "integer", position: "smallint", qul_id: "integer", text: "text" },
    lemmas.map((l) => [l.root, l.position, l.lemma.id, l.lemma.text]),
  );
  await insertColumns(
    client,
    "spelling",
    { root: "integer", lemma: "smallint", position: "smallint", uthmani: "text", indopak: "text", meaning_ur: "text", meaning_en: "text" },
    spellings.map((s) => [s.root, s.position, s.spellingAt, s.spelling.uthmani, s.spelling.indopak, s.spelling.meaning.ur, s.spelling.meaning.en]),
  );
  await insertColumns(
    client,
    "spelling_word",
    { location: "text", root: "integer", lemma: "smallint", spelling: "smallint" },
    spellings.flatMap((s) => s.spelling.locations.map((location) => [location, s.root, s.position, s.spellingAt])),
  );
}

/**
 * Write each particle's Spellings and each Spelling's Words (#249), as a
 * Lemma's are: each Spelling by its position in the builder's order, from 1.
 */
async function insertParticles(client: PoolClient, particles: Particle[]) {
  const spellings = particles.flatMap((p) => p.spellings.map((s, i) => ({ particle: p.id, position: i + 1, spelling: s })));
  await insertColumns(
    client,
    "particle_spelling",
    { particle: "integer", position: "smallint", uthmani: "text", indopak: "text", meaning_ur: "text", meaning_en: "text" },
    spellings.map((s) => [s.particle, s.position, s.spelling.uthmani, s.spelling.indopak, s.spelling.meaning.ur, s.spelling.meaning.en]),
  );
  await insertColumns(
    client,
    "particle_word",
    { location: "text", particle: "integer", spelling: "smallint" },
    spellings.flatMap((s) => s.spelling.locations.map((location) => [location, s.particle, s.position])),
  );
}

/**
 * Where the Passage load has run (#171), each Surah's stored content hash
 * made again over `surahs`, as /data/v1 serves each with its Passages, Phrases
 * and Themes from `client`: a change to the Quran text changes its Surah's file.
 */
async function refreshContentHashes(client: PoolClient, surahs: Dataset["surahs"]) {
  const table = await client.query<{ exists: boolean }>(`select to_regclass('surah_content_hash') is not null as exists`);
  if (!table.rows[0].exists) return;
  const themes = await everyAyahThemes(client);
  for (const surah of surahs) {
    const { passages, phrases } = await surahPassages(surah.number, client);
    await storeContentHash(client, surah.number, servedSurahHash(surah, passages, phrases, themes[surah.number - 1] ?? []));
  }
}

/** The lines reporting what the sources lack, as the builder's report lists it, and the Words the Word grammar leaves out (ADR 0064). */
export function reportLines({ report, dividedDifferently }: { report: Report; dividedDifferently: string[] }): string[] {
  const gaps = report.wordMeaningGaps.map((g) => `${g.location} (${g.language})`);
  return [
    `${gaps.length} Word meaning gaps, imported as "": ${gaps.join(", ")}`,
    `${report.untimedWords.length} untimed Words: ${report.untimedWords.join(", ")}`,
    `${report.rootDisagreements.length} Root disagreements (QUL / roots.json): ${report.rootDisagreements
      .map((d) => `${d.location} (${d.qul ?? "none"} / ${d.rootsJson ?? "none"})`)
      .join(", ")}`,
    `${dividedDifferently.length} Words the Corpus divides differently, without Word grammar: ${dividedDifferently.join(", ")}`,
  ];
}

/** What one import did: the sources hash, and, when it wrote, the builder's report, the Words without Word grammar and the Words written. */
export type ImportOutcome =
  | { imported: false; sourcesHash: string }
  | { imported: true; sourcesHash: string; report: Report; dividedDifferently: string[]; words: number };

/**
 * Import the Quran from `sourceDir` into `pool`'s database, unless its sources
 * hash is the one stored; throws, naming the source and what is wrong, when a
 * source fails one of the builder's checks, having written nothing.
 */
export async function importQuran(pool: Pool, sourceDir: string): Promise<ImportOutcome> {
  const hash = sourcesHash(sourceDir);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(LOCK);
    if ((await storedSourcesHash(client)) === hash) {
      await client.query("commit");
      return { imported: false, sourcesHash: hash };
    }
    const { dataset, report } = buildDataset({ sourceDir });
    const { segments, dividedDifferently } = readWordGrammar(sourceDir, dataset.surahs);
    await createTables(client);
    for (const table of TABLES) await client.query(`delete from ${table}`);
    await upgradeWordTable(client);
    await insertQuran(client, dataset, segments);
    await client.query(`insert into dataset_import (sources_hash) values ($1)`, [hash]);
    await refreshContentHashes(client, dataset.surahs);
    await client.query("commit");
    const words = dataset.surahs.reduce((n, s) => n + s.ayahs.reduce((m, a) => m + a.words.length, 0), 0);
    return { imported: true, sourcesHash: hash, report, dividedDifferently, words };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
