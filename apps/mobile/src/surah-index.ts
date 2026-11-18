// The Surah index on the Read screen (#193): its Surahs and Juz tabs, each
// Juz row saying where the Juz runs, the one search box over both tabs, and
// which Juz holds the latest Reading place. The Juz follow the reader's Script
// (ADR 0021) and come from /data/v1/juz.json; the search rules and Juz rows
// are @saaliheen/dataset/index-search's, shared with the website, and the words
// are the website's (DELIVERY/mockup.html). This module imports nothing from React
// Native or Expo, so the app's scenarios (features/surahs-and-juz-index.feature)
// run it in Node.

import { findJuz, findSurahs, foldNames, juzHolds, juzRuns, type FoldedNames } from "@saaliheen/dataset/index-search";
import type { Juz } from "@saaliheen/dataset/types";
import type { SurahIndexEntry } from "./quran-analysis";

export type { Juz };

/** The Surah index's tabs, in order: Surahs first. */
export type IndexTab = "Surahs" | "Juz";
export const INDEX_TABS: readonly IndexTab[] = ["Surahs", "Juz"];

/** One row of the Juz tab: the Juz in the reader's Script and where it runs ("Al-Baqarah 142 → 252"). */
export interface JuzIndexEntry extends Juz {
  runs: string;
}

/** What the one search box finds on each tab, by number, and what each tab says when it finds nothing. */
export interface IndexSearch {
  surahs: number[];
  juz: number[];
  /** What the Surahs tab says when no Surah matches, else null. */
  noSurah: string | null;
  /** What the Juz tab says when no Juz matches, else null. */
  noJuz: string | null;
  /** What the index says when the search finds neither a Surah nor a Juz, else null. */
  nothingFound: string | null;
}

/** The Juz tab's rows: each Juz of the reader's Script with where it runs, named by the Surah index. */
export function juzIndex(juz: Juz[], surahs: SurahIndexEntry[]): JuzIndexEntry[] {
  const names = new Map(surahs.map((s) => [s.number, s.nameLatin]));
  const nameOf = (surah: number) => names.get(surah) ?? String(surah);
  return juz.map((j) => ({ ...j, runs: juzRuns(j, nameOf) }));
}

/** The number of the Juz holding Ayah `ayah` of Surah `surah`, or null. */
export const juzHolding = (juz: Juz[], place: { surah: number; ayah: number } | undefined): number | null =>
  (place && juz.find((j) => juzHolds(j, place.surah, place.ayah))?.number) ?? null;

/** The words each tab says when the search finds nothing. */
const NO_SURAH = (query: string) => `No Surah matches “${query}”. Try a number from 1 to 114.`;
const NO_JUZ = (query: string) => `No Juz matches “${query}”. Try a number from 1 to 30 or a Surah name.`;

/**
 * The one search box over both tabs, as the rows each tab shows: a number
 * finds the Surah and the Juz with that number; text finds each Surah whose
 * Latin or Arabic name holds it, and each Juz holding such a Surah. A blank
 * search finds everything. `names` is `foldNames(surahs)`.
 */
export function searchRows<S extends SurahIndexEntry, J extends Juz>(query: string, surahs: S[], juz: J[], names: FoldedNames = foldNames(surahs)) {
  const q = query.trim();
  const rows = { surahRows: findSurahs(q, surahs, names), juzRows: findJuz(q, juz, surahs, names) };
  const noSurah = q !== "" && rows.surahRows.length === 0 ? NO_SURAH(q) : null;
  const noJuz = q !== "" && rows.juzRows.length === 0 ? NO_JUZ(q) : null;
  return { ...rows, noSurah, noJuz, nothingFound: noSurah && noJuz };
}

/** The one search box over both tabs (searchRows), by number. */
export function searchIndex(query: string, surahs: SurahIndexEntry[], juz: Juz[]): IndexSearch {
  const { surahRows, juzRows, ...said } = searchRows(query, surahs, juz);
  return { surahs: surahRows.map((s) => s.number), juz: juzRows.map((j) => j.number), ...said };
}
