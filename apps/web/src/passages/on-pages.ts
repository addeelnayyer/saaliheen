// The Passages and Phrases as the pages show them (#171): ./cached.ts's reads
// from Neon, joined with the Quran the pages read beside them, Neon's too
// (#172). A Surah is the Quran's, with its Passages, its Phrases and each
// Word's Phrase colour from Neon in place of the file's (./served-surah.ts),
// so every page, part and file reads Neon's.

import { partAyahs, surahParts } from "@saaliheen/dataset/parts";
import type { Language, PartAyah, PartPassage, Passage, Surah } from "@saaliheen/dataset/types";
import { passageInLanguage } from "@saaliheen/passages";
import { getSurah } from "../dataset/reader.ts";
import { cachedSurahPassages } from "./cached.ts";
import { withPassagesAndPhrases } from "./served-surah.ts";

/** Surah `number` with its Passages and Phrases from Neon; undefined when `number` is not 1..114. */
export async function surahWithPassages(number: number): Promise<Surah | undefined> {
  const [surah, { passages, phrases }] = await Promise.all([getSurah(number), cachedSurahPassages(number)]);
  if (!surah) return undefined;
  return withPassagesAndPhrases(surah, passages, phrases);
}

/** Part `part` (from 1) of Surah `number` in `lang`, Passages and Phrase colours from Neon; undefined when there is no such part. */
export async function surahPartWithPassages(lang: Language, number: number, part: number): Promise<PartAyah[] | undefined> {
  const surah = await surahWithPassages(number);
  const range = surah && surahParts(surah.ayahs.map((a) => a.words.length))[part - 1];
  return range ? partAyahs(surah, range, lang) : undefined;
}

/** Surah `number`'s Passages from Neon in order, each with its Passage title in `lang` only (#43). */
export async function passagesInLanguage(number: number, lang: Language): Promise<PartPassage[]> {
  return (await cachedSurahPassages(number)).passages.map((passage) => passageInLanguage(passage, lang));
}

/** Each of `surahs`' Passages from Neon, by Surah number. */
export async function passagesBySurah(surahs: Iterable<number>): Promise<Map<number, Passage[]>> {
  const numbers = [...new Set(surahs)];
  const read = await Promise.all(numbers.map(async (n) => [n, (await cachedSurahPassages(n)).passages] as const));
  return new Map(read);
}
