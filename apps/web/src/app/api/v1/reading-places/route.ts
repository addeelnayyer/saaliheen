// An Account's Reading places (#71, ADR 0008), /api/v1/reading-places: GET
// answers { readingPlaces: [{ surah, ayah, readAt }] }, newest first, readAt in
// milliseconds since the epoch; PATCH with { readingPlaces: [...] } merges a
// device's Reading places into the Account's (newer per Surah, then the ten
// newest) and answers the result the same way. Either answers to the website's
// session cookie or the mobile app's bearer token, and refuses a request with
// neither (401). A body that is not a JSON object with a list of Reading places,
// or holds one that is not a Reading place, is refused (400) and changes nothing.

import { bringReadingPlaces, readingPlacesBrought, readReadingPlaces } from "@/account/synced-reading-places";
import { listSurahNames } from "@/dataset/reader";
import { apiError, apiJson } from "../respond";
import { notSignedIn, signedInAccount } from "../signed-in";

/** How many Ayahs each Surah has, by number, as Neon holds them (#172). */
const ayahCounts = async () => new Map((await listSurahNames()).map(({ number, ayahCount }) => [number, ayahCount]));

export async function GET(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  return apiJson({ readingPlaces: await readReadingPlaces(account) });
}

export async function PATCH(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const counts = await ayahCounts();
  const brought = readingPlacesBrought(await request.json().catch(() => undefined), (surah) => counts.get(surah));
  if (!brought) {
    return apiError(400, "send a JSON object whose readingPlaces is a list of { surah, ayah, readAt }, each an Ayah of a Surah read at a time in milliseconds");
  }
  return apiJson({ readingPlaces: await bringReadingPlaces(account, brought) });
}
