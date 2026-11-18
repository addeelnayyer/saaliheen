// Where the reader left each visit to a page opened in parts, a Surah (#24) or
// a Theme page (#131), so that Back or Forward to it lands there again. A visit
// is one entry in the browser's history, named by the Navigation API's entry
// key: Back and Forward return to the same entry, so its key finds where it was
// left, while following a link makes a new entry with a new key, which finds
// nothing. Nothing depends on timing, however slowly the page comes back. A
// browser without the Navigation API has no keys, so there Back opens the page
// as any link to it does.

import { remember } from "../caches";

/** How many visits are remembered. */
const KEEP_VISITS = 50;

/** Each visit's page (`surah:2`, `theme:disbelief`) and the place it was left at on it (an Ayah). */
const left = new Map<string, { page: string; place: string }>();

/** The key of the history entry the page is on now, or null without the Navigation API. */
export function currentVisit(): string | null {
  const { navigation } = window as { navigation?: { currentEntry?: { key: string } | null } };
  return navigation?.currentEntry?.key ?? null;
}

/** Notes that visit `visit`, to page `page`, is at `place`, for Back and Forward to return to. */
export function noteVisit(visit: string, page: string, place: string) {
  remember(left, visit, { page, place }, KEEP_VISITS);
}

/** The place on page `page` that this history entry was left at, when the page is back on one it noted. */
export function returningTo(page: string): string | undefined {
  const visit = currentVisit();
  const noted = visit ? left.get(visit) : undefined;
  return noted?.page === page ? noted.place : undefined;
}
