// An Iltifat's Marked Words (#143, ADR 0026): the Words that carry its turn,
// each a Word location and its side, "from" or "to". What the Iltifat module
// keeps in `iltifat_marked_word`, what a save sends and is checked by, and
// whether an Iltifat counts as marked: both sides hold a Word.

import { compareLocations, isWithin, isWord, plainLocation, type Run } from "../word-locations.ts";

/** The two sides of an Iltifat's Marked Words. */
export const SIDES = ["from", "to"] as const;
export type Side = (typeof SIDES)[number];

/** One Marked Word: a Word location (s:a:w) and its side. */
export interface MarkedWord {
  location: string;
  side: Side;
}

/** What a save's checks need of the Quran text: each Surah's Ayah count and each Ayah's Word count. */
export interface QuranShape {
  ayahCount(surah: number): number;
  /** Ayah `ayah` of Surah `surah`'s Word count, Ayah-end marker left out; 0 when there is no such Ayah. */
  wordCount(surah: number, ayah: number): number;
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isSide = (v: unknown): v is Side => (SIDES as readonly unknown[]).includes(v);
const isMarkedWord = (v: unknown): v is MarkedWord => isRecord(v) && typeof v.location === "string" && isSide(v.side);

/** `value` as a save's Marked Words, or undefined when it is not a list of { location: text, side: "from" | "to" }. */
export function markedWordsOf(value: unknown): MarkedWord[] | undefined {
  if (!Array.isArray(value) || !value.every(isMarkedWord)) return undefined;
  return value.map(({ location, side }) => ({ location, side }));
}

/** `words` in reading order, by Ayah then Word; one side's Word before the other's at the same location. */
export const inReadingOrder = (words: MarkedWord[]): MarkedWord[] =>
  [...words].sort((a, b) => compareLocations(a.location, b.location) || SIDES.indexOf(a.side) - SIDES.indexOf(b.side));

/** `words` with each Word location and side named once, in reading order, each location written s:a:w plainly. */
export function distinctMarkedWords(words: MarkedWord[]): MarkedWord[] {
  const byKey = new Map<string, MarkedWord>();
  for (const { location, side } of words) {
    const plain = plainLocation(location);
    byKey.set(`${plain} ${side}`, { location: plain, side });
  }
  return inReadingOrder([...byKey.values()]);
}

/** The location of a Word marked on both sides, if any. */
function onBothSides(words: MarkedWord[]): string | undefined {
  const sides = new Map<string, Side>();
  for (const { location, side } of words) {
    const seen = sides.get(location);
    if (seen && seen !== side) return location;
    sides.set(location, side);
  }
  return undefined;
}

/**
 * Why `words` (distinct, in reading order) may not be saved with `run`, or
 * undefined when they may: the first that is no Word, then the first outside
 * the run, then a Word marked on both sides.
 */
export function markedWordsRefusal(words: MarkedWord[], run: Run, quran: QuranShape): string | undefined {
  const notAWord = words.find((w) => !isWord(w.location, quran.wordCount));
  if (notAWord) return `There is no Word at ${notAWord.location}.`;
  const outside = words.find((w) => !isWithin(w.location, run));
  if (outside) return `The Marked Word ${outside.location} lies outside the run ${run.surah}:${run.ayahFrom}–${run.ayahTo}.`;
  const both = onBothSides(words);
  return both ? `The Word ${both} can't be marked both "from" and "to" in one Iltifat.` : undefined;
}

/** Whether an Iltifat with `words` counts as marked: both its sides hold a Word. */
export const isMarked = (words: readonly MarkedWord[]): boolean => SIDES.every((side) => words.some((w) => w.side === side));
