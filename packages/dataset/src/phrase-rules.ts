// The Phrase rules (#99, #100, ADR 0009), with no file access: where each
// Phrase's Words sit, the checks every Phrase passes (known Words, in order,
// inside one Passage, overlapping no other), and the Phrase colours,
// alternating Phrase by Phrase from "a" at each Passage's first Phrase. A
// served Surah file (#171) colours only covered Passages; the Passage editor
// colours every Passage, so the Admin sees what is marked.

import type { Phrase, PhraseColour } from "./types.ts";

const COLOURS: readonly PhraseColour[] = ["a", "b"];

/** As much of a Surah as the rules read: its Passages' Ayahs and its Words' locations. */
export interface PhrasedSurah {
  number: number;
  passages: { from: number; till: number }[];
  ayahs: { number: number; words: { location: string }[] }[];
}

/** Where a Word sits: its Surah, its place in the Quran's reading order, and its Passage. */
interface Place {
  surah: number;
  order: number;
  /** `<Surah>:<the Passage's place among the Surah's, from 0>`. */
  passage: string;
}

/** Every Word location of some Surahs in reading order, each one's Place, and each Passage's Word count. */
export interface WordIndex {
  locations: string[];
  places: Map<string, Place>;
  passageSizes: Map<string, number>;
}

/** A Phrase with its two ends' Places, checked to lie in order within one Passage. */
interface PlacedPhrase {
  phrase: Phrase;
  first: Place;
  last: Place;
}

export const phraseName = ({ first, last }: Phrase) => `${first}–${last}`;
const fail = (phrase: Phrase, problem: string): never => {
  throw new Error(`Phrase ${phraseName(phrase)}: ${problem}`);
};

/** The Passage key, `<Surah>:<place>`, of the Passage holding Ayah `ayah` among `passages`. */
const passageKey = (surah: number, passages: PhrasedSurah["passages"], ayah: number) =>
  `${surah}:${passages.findIndex((p) => p.from <= ayah && ayah <= p.till)}`;

/** Every Word of `surahs` indexed in reading order. */
export function indexWords(surahs: PhrasedSurah[]): WordIndex {
  const index: WordIndex = { locations: [], places: new Map(), passageSizes: new Map() };
  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      const passage = passageKey(surah.number, surah.passages, ayah.number);
      index.passageSizes.set(passage, (index.passageSizes.get(passage) ?? 0) + ayah.words.length);
      for (const { location } of ayah.words) {
        index.places.set(location, { surah: surah.number, order: index.locations.length, passage });
        index.locations.push(location);
      }
    }
  }
  return index;
}

/** `phrase` placed by `places`; throws, naming the Phrase, when it names an unknown Word, ends before it starts or crosses a Passage's edge. */
function placePhrase(places: Map<string, Place>, phrase: Phrase): PlacedPhrase {
  const [first, last] = [phrase.first, phrase.last].map((l) => places.get(l) ?? fail(phrase, `unknown Word location ${l}`));
  if (last.order < first.order) fail(phrase, "its last Word comes before its first");
  if (last.passage !== first.passage) fail(phrase, "crosses a Passage's edge");
  return { phrase, first, last };
}

/** `placed` in Quran order; throws, naming the later Phrase, when two overlap. */
function inQuranOrder(placed: PlacedPhrase[]): PlacedPhrase[] {
  const sorted = [...placed].sort((x, y) => x.first.order - y.first.order);
  // Sorted and checked so far, the Phrase before `p` is the one reaching furthest.
  sorted.forEach((p, i) => {
    const before = sorted[i - 1];
    if (before && before.last.order >= p.first.order) fail(p.phrase, `overlaps the Phrase ${phraseName(before.phrase)}`);
  });
  return sorted;
}

/** `phrases` placed by `index` and checked, in Quran order. Throws, naming the Phrase, at the first that breaks a rule. */
export const checkedPhrases = (index: WordIndex, phrases: Phrase[]) => inQuranOrder(phrases.map((phrase) => placePhrase(index.places, phrase)));

/** How many Words `p` holds. */
const wordCount = (p: PlacedPhrase) => p.last.order - p.first.order + 1;

/** `sorted`, Phrases in Quran order, grouped by Passage key, each Passage's in order. */
export function byPassage(sorted: PlacedPhrase[]): Map<string, PlacedPhrase[]> {
  const grouped = new Map<string, PlacedPhrase[]>();
  for (const p of sorted) {
    const inPassage = grouped.get(p.first.passage);
    if (inPassage) inPassage.push(p);
    else grouped.set(p.first.passage, [p]);
  }
  return grouped;
}

/** How many Words the Phrases `inPassage` hold. */
export const markedWords = (inPassage: PlacedPhrase[]) => inPassage.reduce((n, p) => n + wordCount(p), 0);

/** Whether the Phrases `inPassage` cover every Word of their Passage, `size` Words long. */
const covers = (inPassage: PlacedPhrase[], size: number | undefined) => markedWords(inPassage) === size;

/**
 * Each Word's Phrase colour, by Word location, from `sorted` (in Quran order):
 * in each Passage the first Phrase takes "a", the next "b", and so on. Only
 * Words of covered Passages unless `everyPassage`.
 */
export function phraseColours(sorted: PlacedPhrase[], index: WordIndex, everyPassage = false): Map<string, PhraseColour> {
  const colours = new Map<string, PhraseColour>();
  for (const [passage, inPassage] of byPassage(sorted)) {
    if (!everyPassage && !covers(inPassage, index.passageSizes.get(passage))) continue;
    inPassage.forEach((p, i) => {
      for (const location of index.locations.slice(p.first.order, p.last.order + 1)) colours.set(location, COLOURS[i % 2]);
    });
  }
  return colours;
}
