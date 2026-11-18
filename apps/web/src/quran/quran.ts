// The Quran read from Neon (#172, ADR 0011, ADR 0049): the Surahs, Ayahs,
// Words, Section marks and Recitations the import (./import.ts) loads, read
// back key for key in the shapes the dataset builder gives them, so a Surah
// file or Recitation file /data/v1 serves keeps its bytes. Plain reads, each
// taking the database it reads: the pages read them through ./cached.ts, in
// Next's data cache; the scripts (the content migrations, the warm-up, the
// import's own content hashes) read them here, where that cache is not.

import type { Pool } from "pg";
import type { Ayah, ParticleKind, Recitation, SectionMarks, Surah, SurahSummary, Word } from "@saaliheen/dataset/types";
import { database } from "../database.ts";

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

/** Whether `number` names a Surah: 1 to 114. */
export const isSurahNumber = (number: number) => Number.isInteger(number) && number >= 1 && number <= 114;

const SUMMARY = `number, name_arabic as "nameArabic", name_latin as "nameLatin", revelation_place as "revelationPlace", ayah_count as "ayahCount", bismillah`;

/** All 114 Surahs in order, without their Ayahs: the Surah index. */
export async function readSurahSummaries(db: Database = database()): Promise<SurahSummary[]> {
  return (await db.query<SurahSummary>(`select ${SUMMARY} from surah order by number`)).rows;
}

interface AyahRow {
  surah: number;
  number: number;
  indopak_end: string;
  translation_ur: string;
  translation_en: string;
}
interface WordRow {
  surah: number;
  ayah: number;
  location: string;
  uthmani: string;
  indopak: string;
  meaning_ur: string;
  meaning_en: string;
  root_id: number | null;
  root_letters: string | null;
  particle_id: number | null;
  particle_kind: ParticleKind | null;
  particle_text: string | null;
  particle_indopak: string | null;
}
interface MarkRow {
  surah: number;
  ayah: number;
  kind: "hizb-quarter" | "ruku";
  label: string;
}

/** The rows of `surahs`' Ayahs, Words and Section marks, each list in its order; every Surah's when `surahs` is null. */
async function quranRows(db: Database, surahs: number[] | null) {
  const whereSurah = (column: string) => (surahs ? `where ${column} = any($1::smallint[])` : "");
  const where = whereSurah("surah");
  const params = surahs ? [surahs] : [];
  const [ayahs, words, marks] = await Promise.all([
    db.query<AyahRow>(`select surah, number, indopak_end, translation_ur, translation_en from ayah ${where} order by surah, number`, params),
    db.query<WordRow>(
      `select w.surah, w.ayah, w.location, w.uthmani, w.indopak, w.meaning_ur, w.meaning_en, w.root_id, r.letters as root_letters,
              w.particle_id, p.kind as particle_kind, p.text as particle_text, p.indopak as particle_indopak
         from word w left join root r on r.id = w.root_id left join particle p on p.id = w.particle_id ${whereSurah("w.surah")} order by w.surah, w.ayah, w.position`,
      params,
    ),
    db.query<MarkRow>(`select surah, ayah, kind, label from section_mark ${where} order by surah, ayah`, params),
  ]);
  return { ayahs: ayahs.rows, words: words.rows, marks: marks.rows };
}

const wordOf = (w: WordRow): Word => ({
  location: w.location,
  uthmani: w.uthmani,
  indopak: w.indopak,
  meaning: { ur: w.meaning_ur, en: w.meaning_en },
  root: w.root_id === null ? null : { id: w.root_id, letters: w.root_letters! },
  // A Word with no Root carries its particle (#249), as the builder gives it.
  ...(w.particle_id === null ? {} : { particle: { id: w.particle_id, kind: w.particle_kind!, text: w.particle_text!, indopak: w.particle_indopak! } }),
});

/** Each of `summaries` with its Section marks and Ayahs from `rows`, in the builder's shape: no Passages, Phrases or Themes, which Neon holds elsewhere. */
function surahsOf(summaries: SurahSummary[], rows: Awaited<ReturnType<typeof quranRows>>): Surah[] {
  const words = new Map<string, Word[]>();
  for (const w of rows.words) {
    const key = `${w.surah}:${w.ayah}`;
    const list = words.get(key) ?? words.set(key, []).get(key)!;
    list.push(wordOf(w));
  }
  const ayahs = new Map<number, Ayah[]>();
  for (const a of rows.ayahs) {
    const list = ayahs.get(a.surah) ?? ayahs.set(a.surah, []).get(a.surah)!;
    list.push({ number: a.number, words: words.get(`${a.surah}:${a.number}`) ?? [], indopakEnd: a.indopak_end, translation: { ur: a.translation_ur, en: a.translation_en }, themes: [] });
  }
  const marks = new Map<number, SectionMarks>();
  for (const m of rows.marks) {
    const surahMarks = marks.get(m.surah) ?? marks.set(m.surah, { hizbQuarters: [], rukus: [] }).get(m.surah)!;
    (m.kind === "ruku" ? surahMarks.rukus : surahMarks.hizbQuarters).push({ ayah: m.ayah, label: m.label });
  }
  return summaries.map((summary) => ({
    ...summary,
    sectionMarks: marks.get(summary.number) ?? { hizbQuarters: [], rukus: [] },
    passages: [],
    phrases: [],
    ayahs: ayahs.get(summary.number) ?? [],
  }));
}

/** Surah `number` with its Section marks, Ayahs and Words, as the builder gives it; undefined when `number` is not 1..114. */
export async function readSurah(number: number, db: Database = database()): Promise<Surah | undefined> {
  if (!isSurahNumber(number)) return undefined;
  const [summary, rows] = await Promise.all([
    db.query<SurahSummary>(`select ${SUMMARY} from surah where number = $1`, [number]),
    quranRows(db, [number]),
  ]);
  return summary.rows.length ? surahsOf(summary.rows, rows)[0] : undefined;
}

/** Every Surah with its Section marks, Ayahs and Words, Surah 1 first. */
export async function readSurahs(db: Database = database()): Promise<Surah[]> {
  const [summaries, rows] = await Promise.all([readSurahSummaries(db), quranRows(db, null)]);
  return surahsOf(summaries, rows);
}

/** How many Words each Ayah of every Surah holds, Surah 1 first: the number of its Word rows. */
export async function readAyahWordCounts(db: Database = database()): Promise<number[][]> {
  const { rows } = await db.query<{ surah: number; ayah: number; words: number }>(
    `select a.surah, a.number as ayah, count(w.location)::int as words
       from ayah a left join word w on w.surah = a.surah and w.ayah = a.number
      group by a.surah, a.number order by a.surah, a.number`,
  );
  const counts: number[][] = [];
  for (const { surah, words } of rows) (counts[surah - 1] ??= []).push(words);
  return counts;
}

/** Surah `number`'s Recitation (#115), as the builder gives it; undefined when `number` is not 1..114. */
export async function readRecitation(number: number, db: Database = database()): Promise<Recitation | undefined> {
  if (!isSurahNumber(number)) return undefined;
  const [recitation, ayahs, timings] = await Promise.all([
    db.query<{ surah: number; reciter: string; audio: string }>(`select surah, reciter, audio from recitation where surah = $1`, [number]),
    db.query<{ ayah: number; from_ms: number; to_ms: number }>(`select ayah, from_ms, to_ms from recitation_ayah where surah = $1 order by ayah`, [number]),
    db.query<{ ayah: number; word: number; start_ms: number; end_ms: number }>(
      `select ayah, word, start_ms, end_ms from recitation_timing where surah = $1 order by ayah, position`,
      [number],
    ),
  ]);
  if (!recitation.rows.length) return undefined;
  const words = new Map<number, [number, number, number][]>();
  for (const t of timings.rows) (words.get(t.ayah) ?? words.set(t.ayah, []).get(t.ayah)!).push([t.word, t.start_ms, t.end_ms]);
  const { surah, reciter, audio } = recitation.rows[0];
  return { surah, reciter, audio, ayahs: ayahs.rows.map((a) => ({ number: a.ayah, from: a.from_ms, to: a.to_ms, words: words.get(a.ayah) ?? [] })) };
}

/** A Surah's Recitation file hash, which the import stores: the SHA-256 of the bytes /data/v1 serves for it. */
export interface RecitationHash {
  surah: number;
  hash: string;
}

/** Every Recitation file's stored hash, Surah 1 first. */
export async function readRecitationHashes(db: Database = database()): Promise<RecitationHash[]> {
  return (await db.query<RecitationHash>(`select surah, hash from recitation order by surah`)).rows;
}
