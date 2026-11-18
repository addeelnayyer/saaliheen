// The Passages and Phrases as every page and file that shows them reads them
// (#171, ADR 0020, ADR 0040): ./passages.ts's reads, kept in Next's data cache
// under each Surah's tag, `passagesTag(surah)`, so that a page reads Neon once
// and then the cache until a Publish in that Surah refreshes the tag
// (./refresh.ts). There is no refresh on a timer. A page that reads a Surah's
// Passages carries its tag: the Surah page, its opening and parts, its Share
// pages, its /data/v1 file, the manifest (every Surah's tag) and each Theme
// page whose Ayahs it holds.

import { unstable_cache } from "next/cache";
import { DEPLOYMENT } from "../themes/cached.ts";
import { storedHashes, surahPassages } from "./passages.ts";

/** The tag of Surah `surah`'s Passages and Phrases and its stored content hash, which its Publish refreshes. */
export const passagesTag = (surah: number) => `passages:${surah}`;

/** Every Surah's tag, Surah 1 first. */
export const EVERY_SURAH_TAG = Array.from({ length: 114 }, (_, i) => passagesTag(i + 1));

/** Surah `surah`'s Passages, Phrases and version, as `surahPassages` gives them, cached under its tag. */
export const cachedSurahPassages = (surah: number) =>
  unstable_cache(() => surahPassages(surah), ["surah-passages", String(surah), DEPLOYMENT], { tags: [passagesTag(surah)] })();

/** Every Surah's stored content hash, cached under every Surah's tag. */
export const cachedStoredHashes = unstable_cache(() => storedHashes(), ["stored-hashes", DEPLOYMENT], { tags: EVERY_SURAH_TAG });
