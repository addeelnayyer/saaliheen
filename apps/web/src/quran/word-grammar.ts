// Word grammar read from Neon (#275, ADR 0064): each Word's Segments, as the
// import (./import.ts) writes them from the Quranic Arabic Corpus, in the
// shape the dataset's reader (@saaliheen/dataset's readWordGrammar) gives
// them, a Surah's or one Ayah's (the Word grammar dialog's, #277), or each
// Word's Grammar line alone, all a Grammar page shows. Plain
// reads taking the database they read, as ./quran.ts's are: the pages read
// them through ./cached.ts.

import type { Pool } from "pg";
import { grammarLine, type GrammarLine, type Segment } from "@saaliheen/dataset/grammar";
import { database } from "../database.ts";

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

const COLUMNS = `s.location, s.position, s.uthmani, s.part_of_speech as "partOfSpeech", s.affix, s.kind, s.derivation,
  s.adjective, s."case", s.indefinite, s.person, s.gender, s.number, s.aspect, s.verb_form as "verbForm", s.mood,
  s.passive, s.family`;

/** The Segments of the Words `where` picks, by Word location, each Word's in order; a Word with no Word grammar has no entry. */
async function readGrammar(where: string, params: number[], db: Database): Promise<Record<string, Segment[]>> {
  const { rows } = await db.query<Segment>(
    `select ${COLUMNS}
       from word_segment s
       join word w on w.location = s.location
      where ${where}
      order by w.ayah, w.position, s.position`,
    params,
  );
  const words: Record<string, Segment[]> = {};
  for (const row of rows) (words[row.location] ??= []).push(row);
  return words;
}

/** Surah `surah`'s Segments by Word location, each Word's in order; a Word with no Word grammar has no entry. */
export const readSurahGrammar = (surah: number, db: Database = database()) => readGrammar("w.surah = $1", [surah], db);

/** Ayah `surah`:`ayah`'s Segments by Word location, as `readSurahGrammar` gives a Surah's: what a Word grammar dialog shows (#277). */
export const readAyahGrammar = (surah: number, ayah: number, db: Database = database()) =>
  readGrammar("w.surah = $1 and w.ayah = $2", [surah, ayah], db);

/** Surah `surah`'s Grammar lines by Word location; a Word with no Word grammar has no entry. */
export async function readSurahGrammarLines(surah: number, db: Database = database()): Promise<Record<string, GrammarLine>> {
  const words = await readSurahGrammar(surah, db);
  return Object.fromEntries(
    Object.entries(words).flatMap(([location, segments]) => {
      const line = grammarLine(segments);
      return line ? [[location, line]] : [];
    }),
  );
}
