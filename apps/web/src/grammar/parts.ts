// A Grammar page's Ayahs (#278), as the page and its Grammar parts carry them:
// each Word whole in both Scripts with its Word meaning in the Language and its
// Grammar line (#275), each Ayah's Ayah translation in the Language and, on the
// Ayah a Passage begins at, that Passage with its title in the Language. Cut
// into parts as a Surah is (surahParts): the page arrives with the first, and
// fills in the rest from /parts/<lang>/grammar/<Surah>/<part>.json (ADR 0066).
// The Quran, its Passages and its Word grammar are read from Neon.

import type { GrammarLine } from "@saaliheen/dataset/grammar";
import { surahParts, type SurahPart } from "@saaliheen/dataset/parts";
import type { Language, PartPassage, Passage, Surah } from "@saaliheen/dataset/types";
import { passageInLanguage } from "@saaliheen/passages";
import { getSurah, getSurahGrammarLines } from "../dataset/reader.ts";
import { cachedSurahPassages } from "../passages/cached.ts";

/** A Word as a Grammar page shows it: its Grammar line absent when it has no Word grammar. */
export interface GrammarWord {
  location: string;
  uthmani: string;
  indopak: string;
  /** In the page's Language only; empty when QUL gives none. */
  meaning: string;
  line?: GrammarLine;
}

/** An Ayah as a Grammar page shows it. */
export interface GrammarAyah {
  number: number;
  words: GrammarWord[];
  /** In the page's Language only. */
  translation: string;
  /** The Passage beginning at this Ayah, its title in the page's Language only. */
  passage?: PartPassage;
}

/** What a Grammar page arrives with: its Surah, its first part's Ayahs, and what the rest are cut into. */
export interface GrammarOpening {
  number: number;
  nameLatin: string;
  first: GrammarAyah[];
  partCount: number;
  /** The Word count of each Ayah after the first part, in order, for the skeleton. */
  laterWordCounts: number[];
}

/** What a Grammar page and its parts are made from. */
interface GrammarSource {
  surah: Surah;
  passages: Passage[];
  lines: Record<string, GrammarLine>;
  parts: SurahPart[];
}

/** The Ayahs of `part` of `source` in `lang`, each Word with its Grammar line. */
function grammarAyahs({ surah, passages, lines }: GrammarSource, lang: Language, part: SurahPart): GrammarAyah[] {
  const starting = new Map(passages.map((passage) => [passage.from, passage]));
  return surah.ayahs.slice(part.first - 1, part.last).map((ayah) => {
    const passage = starting.get(ayah.number);
    return {
      number: ayah.number,
      words: ayah.words.map(({ location, uthmani, indopak, meaning }) => ({
        location,
        uthmani,
        indopak,
        meaning: meaning[lang],
        ...(lines[location] && { line: lines[location] }),
      })),
      translation: ayah.translation[lang],
      ...(passage && { passage: passageInLanguage(passage, lang) }),
    };
  });
}

/** Surah `number` with its Passages from Neon, its Grammar lines and its parts; undefined when `number` is not 1..114. */
async function readGrammar(number: number): Promise<GrammarSource | undefined> {
  // The Passages alone: a Grammar page draws no Phrase colours, so none are worked out.
  const [surah, { passages }, lines] = await Promise.all([getSurah(number), cachedSurahPassages(number), getSurahGrammarLines(number)]);
  return surah && { surah, passages, lines, parts: surahParts(surah.ayahs.map((a) => a.words.length)) };
}

/** Surah `number`'s Grammar page in `lang` as it arrives; undefined when `number` is not 1..114. */
export async function readGrammarOpening(number: number, lang: Language): Promise<GrammarOpening | undefined> {
  const source = await readGrammar(number);
  if (!source) return undefined;
  const { surah, parts } = source;
  return {
    number: surah.number,
    nameLatin: surah.nameLatin,
    first: grammarAyahs(source, lang, parts[0]),
    partCount: parts.length,
    laterWordCounts: surah.ayahs.slice(parts[0].last).map((a) => a.words.length),
  };
}

/** Part `part` (from 1) of Surah `number`'s Grammar page in `lang`; undefined when there is no such part. */
export async function grammarPartOf(number: number, lang: Language, part: number): Promise<GrammarAyah[] | undefined> {
  const source = await readGrammar(number);
  const range = source?.parts[part - 1];
  return source && range && grammarAyahs(source, lang, range);
}
