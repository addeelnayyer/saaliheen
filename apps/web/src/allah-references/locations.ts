// Word locations as a file of Allah references lists them (#147): which are
// Words of the Quran text, and which Surah each belongs to.

/** How many Words each Ayah of a Surah holds, Ayah 1 first; undefined when there is no such Surah. */
export type WordCounts = (surah: number) => number[] | undefined;

const LOCATION = /^([1-9]\d*):([1-9]\d*):([1-9]\d*)$/;

/** `location`'s Surah, Ayah and Word numbers as text, when it is text shaped `s:a:w`; null otherwise. */
const parse = (location: unknown) => (typeof location === "string" ? LOCATION.exec(location) : null);

/** How many Words each Ayah of Surah `surah` holds; none when there is no such Surah. */
const ayahsOf = (wordCounts: WordCounts, surah: number): number[] => wordCounts(surah) ?? [];

/** How many Words Ayah `ayah` of `counts` holds; 0 when there is no such Ayah. */
const wordsIn = (counts: number[], ayah: number): number => counts[ayah - 1] ?? 0;

/** Whether `location` (`s:a:w`) is a Word of the Quran text: an Ayah-end marker or Word 0 is not. */
export function isWordLocation(location: unknown, wordCounts: WordCounts): boolean {
  const match = parse(location);
  if (!match) return false;
  const [surah, ayah, word] = match.slice(1).map(Number);
  return word <= wordsIn(ayahsOf(wordCounts, surah), ayah);
}

/** The Surah of Word location `location`. */
const surahOf = (location: string): number => Number(location.split(":")[0]);

/** `locations` grouped by Surah, in ascending Surah order, each Surah's in the order given. */
export function bySurah(locations: string[]): Map<number, string[]> {
  return new Map([...Map.groupBy(locations, surahOf)].sort(([a], [b]) => a - b));
}
