// The Reading places module (#69), a shared package: the pure rules for a
// reader's Reading places (CONTEXT.md), with no storage, file or network
// access, so the website and the coming mobile app use one copy of them and
// each supplies its own storage.
//
// A reader keeps at most ten Reading places, one per Surah, newest first.
// Reading in a Surah moves that Surah's Reading place and brings it to the top
// (`recordRead`); reading in an eleventh Surah drops the one read longest ago.
// The Reading places are written as one JSON array of `{ surah, ayah, readAt }`
// (`readAt` in milliseconds since the epoch). A Reading place saved before
// there were Reading places, a single `surah:ayah`, carries over into the list
// (`withSingleReadingPlace`). Reading places from two devices, or from a device
// and an Account (#71), merge by when each was read (`mergeReadingPlaces`). No
// rule changes the list it is given; each returns a new one.

/** One Ayah of one Surah: where a reader stopped reading in that Surah. */
export interface ReadingPlace {
  surah: number;
  ayah: number;
}

/** A Reading place and when it was last read, in milliseconds since the epoch. */
export interface TimedReadingPlace extends ReadingPlace {
  readAt: number;
}

/** How many Reading places a reader keeps. */
export const MOST_READING_PLACES = 10;

/** `18:45` as a Reading place; anything else is none. */
export function parseReadingPlace(written: string | null | undefined): ReadingPlace | null {
  const match = written?.match(/^(\d{1,3}):(\d{1,3})$/);
  return match ? { surah: Number(match[1]), ayah: Number(match[2]) } : null;
}

/** A Reading place written as `18:45`. */
export const writeReadingPlace = ({ surah, ayah }: ReadingPlace) => `${surah}:${ayah}`;

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1;

/** Whether an entry is a Reading place with its read time: whole Surah and Ayah numbers from 1, a finite readAt. */
export function isTimedReadingPlace(entry: unknown): entry is TimedReadingPlace {
  const { surah, ayah, readAt } = (entry ?? {}) as Partial<TimedReadingPlace>;
  return isCount(surah) && isCount(ayah) && Number.isFinite(readAt);
}

/** Keeps the first Reading place of each Surah, and only the first ten. */
const oncePerSurah = (places: TimedReadingPlace[]) =>
  places.filter((p, i) => places.findIndex((q) => q.surah === p.surah) === i).slice(0, MOST_READING_PLACES);

/**
 * The Reading places a stored JSON array holds, newest first as stored;
 * entries that are not Reading places, and any Surah's after its first, are
 * dropped. Anything that is not such an array is no Reading places.
 */
export function parseReadingPlaces(stored: string | null | undefined): TimedReadingPlace[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return oncePerSurah(
    parsed.filter(isTimedReadingPlace).map(({ surah, ayah, readAt }) => ({ surah, ayah, readAt })),
  );
}

/** The Reading places as the JSON array they are stored as. */
export const writeReadingPlaces = (places: TimedReadingPlace[]) => JSON.stringify(places);

/**
 * The Reading places after reading `place` at `readAt`: that Surah's Reading
 * place moves to `place` and to the top, and only the ten newest stay.
 */
export function recordRead(places: TimedReadingPlace[], place: ReadingPlace, readAt: number): TimedReadingPlace[] {
  return oncePerSurah([{ surah: place.surah, ayah: place.ayah, readAt }, ...places]);
}

/**
 * The Reading places with a single Reading place saved before there were
 * Reading places (`surah:ayah`) carried over: below the others, as read before
 * all of them, unless its Surah already has a Reading place, which wins.
 */
export function withSingleReadingPlace(places: TimedReadingPlace[], single: string | null | undefined): TimedReadingPlace[] {
  const place = parseReadingPlace(single);
  if (!place || places.some((p) => p.surah === place.surah)) return places;
  return [...places, { ...place, readAt: 0 }].slice(0, MOST_READING_PLACES);
}

/** Surah `surah`'s Reading place, or none. */
export const readingPlaceIn = (places: ReadingPlace[], surah: number): ReadingPlace | null =>
  places.find((p) => p.surah === surah) ?? null;

/**
 * Several lists of Reading places merged into one (#71): for each Surah the
 * Reading place read most recently wins, whichever list holds it and in
 * whatever order; then only the ten newest stay, newest first. A tie in readAt
 * keeps the one in the earlier list, so merging the same Reading places again
 * changes nothing.
 */
export function mergeReadingPlaces(...lists: TimedReadingPlace[][]): TimedReadingPlace[] {
  const all = lists.flat().map(({ surah, ayah, readAt }) => ({ surah, ayah, readAt }));
  return oncePerSurah(all.sort((a, b) => b.readAt - a.readAt));
}
