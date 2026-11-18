// The published dataset's Surah files and manifest (#65, ADR 0008, ADR 0025)
// with each Ayah's Themes from Neon (#170), each Surah's Passages and Phrases
// from Neon (#171) and the Quran from Neon (#172): /data/v1/surahs/<n>.json
// keeps its shape and bytes, all merged from Neon (../passages/served-surah.ts),
// and the manifest is made of hashes, not of the files: each Surah file's is
// the content hash Neon stores for it (ADR 0020), which the Passage load, each
// Publish and each Quran import write, and each Recitation file's and each
// Root file's (#173) and each particle file's (#249) the hash the import stores. Only the Surah index and the
// Juz file, both small, are hashed here. The manifest is kept in Next's data
// cache under the Themes' tag and every Surah's Passage tag, which a Publish
// in that Surah refreshes.

import { unstable_cache } from "next/cache";
import { manifestOfHashes, publishedHash, type Manifest } from "@saaliheen/dataset/published";
import type { Surah } from "@saaliheen/dataset/types";
import { listJuz, listSurahs } from "../dataset/reader.ts";
import { cachedStoredHashes, EVERY_SURAH_TAG } from "../passages/cached.ts";
import { surahWithPassages } from "../passages/on-pages.ts";
import { cachedParticleHashes, cachedRecitationHashes, cachedRootHashes } from "../quran/cached.ts";
import { DEPLOYMENT, THEMES_TAG } from "./cached.ts";
import { surahsWithThemes } from "./on-pages.ts";

/** Surah `number`'s published file, its Passages, Phrases and Ayahs' Themes from Neon; undefined when `number` is not 1..114. */
export async function publishedSurah(number: number): Promise<Surah | undefined> {
  const surah = await surahWithPassages(number);
  return surah && (await surahsWithThemes([surah]))[0];
}

/**
 * The manifest of the published dataset, each Surah file named by its stored
 * content hash; a Surah with none stored (never so once the Passage load has
 * run) by the hash of its file as served.
 */
async function manifest(): Promise<Manifest> {
  const [index, stored, recitations, roots, juz, particles] = await Promise.all([
    listSurahs(),
    cachedStoredHashes(),
    cachedRecitationHashes(),
    cachedRootHashes(),
    listJuz(),
    cachedParticleHashes(),
  ]);
  const storedHash = new Map(stored.map(({ surah, hash }) => [surah, hash]));
  const surahs = await Promise.all(
    index.map(async ({ number }) => ({ number, hash: storedHash.get(number) ?? publishedHash(await publishedSurah(number)) })),
  );
  return manifestOfHashes({
    index: publishedHash(index),
    surahs,
    roots: roots.map(({ hash }) => hash),
    recitations: recitations.map(({ surah, hash }) => ({ number: surah, hash })),
    juz: publishedHash(juz),
    particles,
  });
}

/** The manifest, cached under `THEMES_TAG` and every Surah's Passage tag. */
export const publishedManifest = unstable_cache(manifest, ["published-manifest", DEPLOYMENT], { tags: [THEMES_TAG, ...EVERY_SURAH_TAG] });
