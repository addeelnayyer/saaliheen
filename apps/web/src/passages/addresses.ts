// The addresses that show one Surah's Passages and are warmed (#171, ADR
// 0020): its Surah page and every Surah part, each in Urdu and in English.
// The deploy's warm-up (scripts/warm-up.ts) asks for every Surah's, and a
// Publish (./refresh.ts) for its Surah's. Plain: the warm-up runs in Node,
// outside Next.

import { partUrl, surahParts, surahPartsAddress } from "@saaliheen/dataset/parts";
import { LANGUAGES } from "@saaliheen/dataset/types";

/** Surah `surah`'s page in each Language: `/ur/<n>`, `/en/<n>`. */
export const surahPageAddresses = (surah: number): string[] => LANGUAGES.map((lang) => `/${lang}/${surah}`);

/** Every part of Surah `surah` in each Language, cut by `wordCounts`, its Ayahs' Word counts, as its parts are. */
export const surahPartAddresses = (surah: number, wordCounts: number[]): string[] =>
  LANGUAGES.flatMap((lang) => surahParts(wordCounts).map((_, i) => partUrl(surahPartsAddress(lang, surah), i + 1)));

/** Surah `surah`'s page and every part, in each Language. */
export const surahAddresses = (surah: number, wordCounts: number[]): string[] => [...surahPageAddresses(surah), ...surahPartAddresses(surah, wordCounts)];
