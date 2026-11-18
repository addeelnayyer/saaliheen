// Allah references on a Surah's Words (#147): the Surah page and the Surah
// parts mark each Word that is one, so its Word card draws its Arabic in Allah
// reference colour.

import type { PartAyah } from "@saaliheen/dataset/types";
import { forSurah } from "./for-surah.ts";

/** `ayahs` with every Word whose location is in `locations` marked as an Allah reference. */
function markAllahReferences(ayahs: PartAyah[], locations: string[]): PartAyah[] {
  if (locations.length === 0) return ayahs;
  const listed = new Set(locations);
  return ayahs.map((ayah) => ({
    ...ayah,
    words: ayah.words.map((word) => (listed.has(word.location) ? { ...word, allahReference: true } : word)),
  }));
}

/** Surah `surah`'s `ayahs` with its Allah references, as the data module gives them now, marked. */
export async function withAllahReferences(surah: number, ayahs: PartAyah[]): Promise<PartAyah[]> {
  return markAllahReferences(ayahs, (await forSurah(surah)).locations);
}
