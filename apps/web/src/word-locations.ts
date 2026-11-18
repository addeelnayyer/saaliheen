// Word locations (s:a:w): reading them, their reading order, and whether one is
// a Word of the Quran text. What an Iltifat's Marked Words (src/iltifat/) and a
// Supplication's spans (src/supplications/) are saved and checked by.

/** A location's numbers, s:a:w, or undefined when it is not three whole numbers. */
export function partsOf(location: string): [number, number, number] | undefined {
  const match = /^(\d{1,3}):(\d{1,3}):(\d{1,3})$/.exec(location);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

/** Where `location` falls in reading order: by Surah, Ayah, then Word; a location that is no s:a:w last. */
const orderKey = (location: string) => partsOf(location) ?? [Infinity, Infinity, Infinity];

/** `a` before `b` in reading order (< 0), after (> 0), or at the same Word (0). */
export function compareLocations(a: string, b: string): number {
  const [ka, kb] = [orderKey(a), orderKey(b)];
  const at = ka.findIndex((n, i) => n !== kb[i]);
  return at < 0 ? 0 : ka[at] - kb[at];
}

/** `location` written s:a:w plainly (2:127:8 for 2:127:08), or as it is when it is no s:a:w. */
export const plainLocation = (location: string) => partsOf(location)?.join(":") ?? location;

/** The run a save keeps: its Surah and Ayahs. */
export interface Run {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
}

/** Whether `location` lies in an Ayah of `run`. */
export function isWithin(location: string, { surah, ayahFrom, ayahTo }: Run): boolean {
  const [s, a] = partsOf(location) ?? [];
  return s === surah && a !== undefined && a >= ayahFrom && a <= ayahTo;
}

/** Ayah `ayah` of Surah `surah`'s Word count, Ayah-end marker left out; 0 when there is no such Ayah. */
export type WordCount = (surah: number, ayah: number) => number;

/** Whether `location` is a Word of the Quran text: a Word location, not an Ayah-end marker, Word 0 or an Ayah. */
export function isWord(location: string, wordCount: WordCount): boolean {
  const parts = partsOf(location);
  if (!parts) return false;
  const [surah, ayah, word] = parts;
  return word >= 1 && word <= wordCount(surah, ayah);
}
