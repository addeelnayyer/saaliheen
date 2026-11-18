// The Reading places (#69): this browser's ten most recent Reading places, one
// per Surah, newest first, shared across Languages. Their rules are the
// @saaliheen/reading-places package's; this file is their storage, as one JSON
// list under `qwt-reading-places`, into which the single Reading place stored
// before #69 (`qwt-reading-place`, `surah:ayah`) is carried over: every read
// includes it, and the first recorded read writes it into the list and removes
// it. The Surah page moves its Surah's Reading place (reading-place-tracker.tsx);
// the Surah index offers to continue from each. A signed-in browser also
// merges in its Account's (synced-reading-places.ts, #71), and whatever shows
// them hears of it (subscribeReadingPlaces). Also where a Surah page lands
// when it opens (landing), which its Surah's Reading place decides only when
// nothing in the URL or the history entry does.

import {
  mergeReadingPlaces,
  parseReadingPlace,
  parseReadingPlaces,
  readingPlaceIn,
  recordRead,
  withSingleReadingPlace,
  writeReadingPlace,
  writeReadingPlaces,
  type ReadingPlace,
  type TimedReadingPlace,
} from "@saaliheen/reading-places";
import { readStored, store } from "./storage";

export {
  parseReadingPlace,
  parseReadingPlaces,
  readingPlaceIn,
  /** An Ayah's id on the Surah page, which is also its `surah:ayah`. */
  writeReadingPlace as ayahId,
  type ReadingPlace,
} from "@saaliheen/reading-places";

/** The browser storage name of the Reading places. */
const READING_PLACES = "qwt-reading-places";

/** The browser storage name of the single Reading place kept before #69. */
const SINGLE_READING_PLACE = "qwt-reading-place";

/**
 * This browser's Reading places, newest first, with a single Reading place
 * stored before #69 carried over into them. Only reads: the carried-over list
 * is first written, and the old entry removed, when a read is recorded
 * (storeReadingPlace), so this is safe as a render snapshot.
 */
export const readReadingPlaces = (): TimedReadingPlace[] =>
  withSingleReadingPlace(parseReadingPlaces(readStored(READING_PLACES)), readStored(SINGLE_READING_PLACE));

/** This browser's Reading places as one string, the same while they are: a snapshot for useSyncExternalStore. */
export const readingPlacesSnapshot = () => writeReadingPlaces(readReadingPlaces());

/** Whatever shows the Reading places, to hear when they change other than by reading here. */
const listeners = new Set<() => void>();

/** Hear of the Reading places changing; answers how to stop. */
export function subscribeReadingPlaces(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * Records reading at `place` now: its Surah's Reading place moves there and to
 * the top, and the single Reading place stored before #69, now in the list, is
 * removed. Answers the Reading place as read, with its read time.
 */
export function storeReadingPlace(place: ReadingPlace): TimedReadingPlace {
  const read = { surah: place.surah, ayah: place.ayah, readAt: Date.now() };
  store(READING_PLACES, writeReadingPlaces(recordRead(readReadingPlaces(), place, read.readAt)));
  store(SINGLE_READING_PLACE, null);
  return read;
}

/** Merges `places` (an Account's) into this browser's Reading places: newer per Surah, then the ten newest. */
export function mergeIntoReadingPlaces(places: TimedReadingPlace[]) {
  store(READING_PLACES, writeReadingPlaces(mergeReadingPlaces(readReadingPlaces(), places)));
  store(SINGLE_READING_PLACE, null);
  for (const listener of listeners) listener();
}

/** The Ayah of a `surah:ayah`, or of a `surah:ayah:word` Word location; anything else is none. */
export const ayahOf = (location: string) => parseReadingPlace(location.split(":").slice(0, 2).join(":"));

/**
 * Every Ayah's section on the Surah page, in page order: the only <section>s
 * in its <main>, each one's id its `surah:ayah` (ayahId). A live list, so it
 * keeps up as a Surah opened in parts adds Ayahs, at no cost per look.
 */
export const ayahSections = (): HTMLCollectionOf<HTMLElement> | undefined =>
  document.querySelector("main")?.getElementsByTagName("section");

/** The site path of a Word or Ayah location (`s:a:w` or `s:a`): its Surah page, scrolled to it. */
export const locationPath = (lang: string, location: string) => `/${lang}/${location.split(":")[0]}#${location}`;

/**
 * The URL's fragment without its `#`, decoded: on a Surah page, the `s:a:w`
 * Word location or shared Ayah's `s:a` a look-up opened it at, or "" when there
 * is none. Any fragment makes the page a look-up: the site's links only ever
 * add a Word location or an Ayah.
 */
export function currentFragment(): string {
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Whether the element `id` is the page's `:target`. */
const isTarget = (id: string) => document.querySelector(":target")?.id === id;

/** Whether `id` names an element on the page that is not yet its `:target`; never for "", which names no element. */
const awaitsTarget = (id: string) => document.getElementById(id) !== null && !isTarget(id);

/**
 * Makes the fragment's element the page's `:target`, as loading the page would
 * (#192): a link inside the app (next/link) arrives with the fragment in the
 * address and scrolls to it, but the browser's `:target`, which highlights a
 * Word card, is only set by a navigation to the fragment. So, once, the address
 * drops the fragment and goes back to it in place, with the same history entry
 * and its state (the app's Back and Forward read that state).
 */
export function adoptFragmentAsTarget(): void {
  const id = currentFragment();
  if (!awaitsTarget(id)) return;
  const { state } = window.history;
  const url = window.location.href;
  window.history.replaceState(state, "", url.split("#")[0]);
  window.location.replace(url);
  window.history.replaceState(state, "", url);
}

/** Where a Surah page lands as it opens: the Ayah (0 for none) and the element to bring to the top (null for none). */
export interface Landing {
  ayah: number;
  id: string | null;
}

/**
 * Where Surah `surah` (of `ayahCount` Ayahs) lands as it opens, the first that
 * applies: a fragment's Word or Ayah (a look-up); on Back or Forward,
 * `returning`, the Ayah that visit was left at; this Surah's Reading place.
 * Read once the page is the current one: while a link's new page
 * renders, the URL is still the page being left.
 */
export function landing(surah: number, ayahCount: number, returning?: number): Landing {
  const inSurah = (place: ReadingPlace | null) => (place?.surah === surah && place.ayah <= ayahCount ? place.ayah : 0);
  const fragment = currentFragment();
  if (fragment) return { ayah: inSurah(ayahOf(fragment)), id: fragment };
  const ayah = inSurah(returning ? { surah, ayah: returning } : readingPlaceIn(readReadingPlaces(), surah));
  return { ayah, id: ayah ? writeReadingPlace({ surah, ayah }) : null };
}
