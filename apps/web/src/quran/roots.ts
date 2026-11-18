// The Roots and Juz lists read from Neon (#173, ADR 0003, ADR 0021, ADR 0049):
// every Root with its Lemmas and Spellings, and each Script's Juz list, as the
// import (./import.ts) loads them, read back key for key in the shapes the
// dataset builder gives them, so a Root file or the Juz file /data/v1 serves
// keeps its bytes. Plain reads, each taking the database it reads, as
// ./quran.ts's are: the pages read them through ./cached.ts.

import type { Pool } from "pg";
import { SCRIPTS, type Juz, type JuzLists, type Language, type Lemma, type ListedRoot, type ListedRootRow, type Root, type Script, type Spelling } from "@saaliheen/dataset/types";
import type { AyahKey } from "@saaliheen/dataset/parts";
import { database } from "../database.ts";

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

interface RootRow {
  id: number;
  letters: string;
  transliteration: string;
  occurrences: number;
  unique_words: number;
}
interface LemmaRow {
  position: number;
  qul_id: number | null;
  text: string | null;
}
/** A Spelling as Neon holds it, a Root's or a particle's (./particles.ts), its Word locations aggregated in Quran order. */
export interface SpellingRow {
  uthmani: string;
  indopak: string;
  meaning_ur: string;
  meaning_en: string;
  locations: string[];
}

/** A Spelling row as the builder gives it. */
export const spellingOf = (s: SpellingRow): Spelling => ({
  uthmani: s.uthmani,
  indopak: s.indopak,
  meaning: { ur: s.meaning_ur, en: s.meaning_en },
  locations: s.locations,
});

/** The Root with QUL id `id`, its Lemmas and Spellings in the builder's order; undefined when no Root has that id. */
export async function readRoot(id: number, db: Database = database()): Promise<Root | undefined> {
  const [root, lemmas, spellings] = await Promise.all([
    db.query<RootRow>(`select id, letters, transliteration, occurrences, unique_words from root where id = $1`, [id]),
    db.query<LemmaRow>(`select position, qul_id, text from lemma where root = $1 order by position`, [id]),
    db.query<SpellingRow & { lemma: number }>(
      `select s.lemma, s.uthmani, s.indopak, s.meaning_ur, s.meaning_en,
              array_agg(w.location order by w.surah, w.ayah, w.position) as locations
         from spelling s
         join spelling_word sw on (sw.root, sw.lemma, sw.spelling) = (s.root, s.lemma, s.position)
         join word w on w.location = sw.location
        where s.root = $1
        group by s.root, s.lemma, s.position
        order by s.lemma, s.position`,
      [id],
    ),
  ]);
  if (!root.rows.length) return undefined;
  const byLemma = Map.groupBy(spellings.rows, (s) => s.lemma);
  const { letters, transliteration, occurrences, unique_words } = root.rows[0];
  return {
    id,
    letters,
    transliteration,
    occurrences,
    uniqueWords: unique_words,
    lemmas: lemmas.rows.map((l): Lemma => {
      const list = (byLemma.get(l.position) ?? []).map(spellingOf);
      return {
        id: l.qul_id,
        text: l.text,
        occurrences: list.reduce((n, s) => n + s.locations.length, 0),
        meaning: list[0].meaning,
        spellings: list,
      };
    }),
  };
}

/** The id of the Root whose letters, their spaces taken out, are `letters` (ADR 0065, as `addressLetters` writes them); undefined when none is. */
export async function readRootId(letters: string, db: Database = database()): Promise<number | undefined> {
  const { rows } = await db.query<{ id: number }>(`select id from root where replace(letters, ' ', '') = $1`, [letters]);
  return rows[0]?.id;
}

/** An Ayah holding a Spelling, as a Root page lists it: its Words one by one in each Script, and its Ayah translation in each Language. */
export interface SpellingAyah {
  surah: number;
  number: number;
  indopakEnd: string;
  translation: Record<Language, string>;
  words: ({ location: string } & Record<Script, string>)[];
}

/** The Ayahs at `keys`, in the order given, each with its Words and its Ayah translations; a key naming no Ayah is left out. */
export async function readAyahsAt(keys: AyahKey[], db: Database = database()): Promise<SpellingAyah[]> {
  const { rows } = await db.query<{ surah: number; number: number; indopak_end: string; translation_ur: string; translation_en: string; words: SpellingAyah["words"] }>(
    `select a.surah, a.number, a.indopak_end, a.translation_ur, a.translation_en,
            json_agg(json_build_object('location', w.location, 'uthmani', w.uthmani, 'indopak', w.indopak) order by w.position) as words
       from ayah a
       join word w on (w.surah, w.ayah) = (a.surah, a.number)
      where (a.surah, a.number) in (select * from unnest($1::int[], $2::int[]))
      group by a.surah, a.number`,
    [keys.map((k) => k.surah), keys.map((k) => k.ayah)],
  );
  const byPlace = new Map(
    rows.map((a): [string, SpellingAyah] => [
      `${a.surah}:${a.number}`,
      { surah: a.surah, number: a.number, indopakEnd: a.indopak_end, translation: { ur: a.translation_ur, en: a.translation_en }, words: a.words },
    ]),
  );
  return keys.flatMap(({ surah, ayah }) => byPlace.get(`${surah}:${ayah}`) ?? []);
}

/** Every Root, by ascending QUL id, with its Lemmas' representative meanings (each Lemma's first Spelling's), empty ones left out. */
export async function readRootList(db: Database = database()): Promise<ListedRoot[]> {
  const { rows } = await db.query<{ letters: string; ur: string[]; en: string[] }>(
    `select r.letters,
            array_remove(array_agg(s.meaning_ur order by l.position), '') as ur,
            array_remove(array_agg(s.meaning_en order by l.position), '') as en
       from root r
       join lemma l on l.root = r.id
       join spelling s on (s.root, s.lemma, s.position) = (l.root, l.position, 1)
      group by r.id
      order by r.id`,
  );
  return rows.map(({ letters, ur, en }) => ({ letters, meanings: { ur, en } }));
}

/** Every Root, by ascending QUL id, as the Roots list shows it (#290): its letters, transliteration and count of occurrences. */
export async function readRootRows(db: Database = database()): Promise<ListedRootRow[]> {
  return (await db.query<ListedRootRow>(`select letters, transliteration, occurrences from root order by id`)).rows;
}

/** A Root file's hash, which the import stores: the SHA-256 of the bytes /data/v1 serves for it. */
export interface RootHash {
  id: number;
  hash: string;
}

/** Every Root's stored hash, by ascending QUL id: one per Root file. */
export async function readRootHashes(db: Database = database()): Promise<RootHash[]> {
  return (await db.query<RootHash>(`select id, hash from root order by id`)).rows;
}

/** Each Script's 30 Juz, Juz 1 first. */
export async function readJuz(db: Database = database()): Promise<JuzLists> {
  const { rows } = await db.query<Juz & { script: Script }>(
    `select script, number, name, first_ayah as "firstAyah", last_ayah as "lastAyah" from juz order by script, number`,
  );
  return Object.fromEntries(
    SCRIPTS.map((script) => [script, rows.filter((j) => j.script === script).map(({ number, name, firstAyah, lastAyah }) => ({ number, name, firstAyah, lastAyah }))]),
  ) as JuzLists;
}
