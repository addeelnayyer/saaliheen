// Reading places following an Account (#71): a signed-in browser brings its
// Reading places to its Account through the versioned API's Reading places
// resource (/api/v1/reading-places) and keeps the Account's. Each page it opens
// (once synced-settings.ts has asked whether it is signed in) sends all of this
// browser's Reading places, or asks for the Account's when it has none, and
// merges the Account's answer in; so a read that never reached the Account,
// made offline, goes with the next page opened online, and on first sign-in
// this browser's Reading places merge with the Account's. Each read on a Surah
// page is also sent as it is stored (recordReading), but for one stored as the
// page goes, which a send could not outlive. The Account and the browser merge by the
// same rule: for each Surah the one read most recently wins, by when it was
// read, then the ten newest stay.

import { isTimedReadingPlace, type ReadingPlace, type TimedReadingPlace } from "@saaliheen/reading-places";
import { mergeIntoReadingPlaces, readReadingPlaces, storeReadingPlace } from "./reading-place";
import { signedInToAccount } from "./synced-settings";

const READING_PLACES = "/api/v1/reading-places";

/**
 * Send `places` to the Account. A send that fails, offline or cut off by
 * leaving the page, is left for the next page's sync, which sends them all.
 */
const bring = (places: TimedReadingPlace[]) =>
  fetch(READING_PLACES, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ readingPlaces: places }),
  });

/** Records reading at `place` in this browser and, when signed in, in its Account. */
export function recordReading(place: ReadingPlace) {
  const read = storeReadingPlace(place);
  if (signedInToAccount()) bring([read]).catch(() => {});
}

/** The Reading places in an answer of the API, or none. */
async function readingPlacesIn(res: Response): Promise<TimedReadingPlace[]> {
  if (!res.ok) return [];
  const { readingPlaces } = (await res.json()) as { readingPlaces?: unknown };
  return Array.isArray(readingPlaces) ? readingPlaces.filter(isTimedReadingPlace) : [];
}

/**
 * Bring this browser's Reading places to its Account, when signed in, and
 * merge the Account's answer into them.
 */
export async function syncReadingPlaces() {
  if (!signedInToAccount()) return;
  const places = readReadingPlaces();
  const res = await (places.length > 0 ? bring(places) : fetch(READING_PLACES, { cache: "no-store" }));
  const account = await readingPlacesIn(res);
  if (account.length > 0) mergeIntoReadingPlaces(account);
}
