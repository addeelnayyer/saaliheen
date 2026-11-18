// How a write to a Surah's Passages answers it (#171, #174): a Publish and an
// undo both answer the Surah as written, or its latest when their base is stale.

import type { PublishedSurah } from "@/passages/publish";

export const STALE = "Someone published first: these are the latest Passages, Phrases and Allah references, and your changes were not written.";

/** Surah `number` as an answer carries it: { surah, version, passages, phrases, allahReferences }. */
export const surahAnswer = (number: number, { version, passages, phrases, allahReferences }: PublishedSurah) => ({
  surah: number,
  version,
  passages,
  phrases,
  allahReferences: { surah: number, ...allahReferences },
});
