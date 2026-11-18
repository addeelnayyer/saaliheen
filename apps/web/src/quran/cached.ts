// The Quran as every page and file that shows it reads it (#172, #173,
// ADR 0020, ADR 0049, ADR 0050): ./quran.ts's, ./roots.ts's, ./particles.ts's and ./word-grammar.ts's reads, kept in
// Next's data cache, so that a page reads Neon once and then the cache. Only
// an import changes the Quran's rows, and an import runs only in a
// deployment's `db:migrate`, before the deployment serves: each deployment
// keeps its own entries (DEPLOYMENT), so none needs a tag to refresh. Each
// read is also React's cache(), so that a render reading a Surah more than
// once (Surah 1 for the Bismillah and the sample Ayah, a Surah several entries
// cite) parses its entry once.

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { AyahKey } from "@saaliheen/dataset/parts";
import { DEPLOYMENT } from "../themes/cached.ts";
import { readAyahWordCounts, readRecitation, readRecitationHashes, readSurah, readSurahSummaries } from "./quran.ts";
import { readParticle, readParticleHashes, readParticleList } from "./particles.ts";
import { readAyahsAt, readJuz, readRoot, readRootHashes, readRootId, readRootList, readRootRows } from "./roots.ts";
import { readAyahGrammar, readSurahGrammarLines } from "./word-grammar.ts";

/** All 114 Surahs without their Ayahs, as `readSurahSummaries` gives them. */
export const cachedSurahSummaries = cache(unstable_cache(() => readSurahSummaries(), ["surah-summaries", DEPLOYMENT]));

/** How many Words each Ayah of every Surah holds, as `readAyahWordCounts` gives it. */
export const cachedAyahWordCounts = cache(unstable_cache(() => readAyahWordCounts(), ["ayah-word-counts", DEPLOYMENT]));

/** Every Recitation file's stored hash, as `readRecitationHashes` gives them. */
export const cachedRecitationHashes = cache(unstable_cache(() => readRecitationHashes(), ["recitation-hashes", DEPLOYMENT]));

/** Surah `number` with its Ayahs and Words, as `readSurah` gives it. */
export const cachedSurah = cache((number: number) => unstable_cache(() => readSurah(number), ["surah", String(number), DEPLOYMENT])());

/** Surah `number`'s Grammar lines, as `readSurahGrammarLines` gives them: a line per Word, not its Segments, keeps the entry small. */
export const cachedSurahGrammarLines = cache((number: number) =>
  unstable_cache(() => readSurahGrammarLines(number), ["surah-grammar-lines", String(number), DEPLOYMENT])(),
);

/** Ayah `surah`:`ayah`'s Segments by Word location, as `readAyahGrammar` gives them (#277). */
export const cachedAyahGrammar = cache((surah: number, ayah: number) =>
  unstable_cache(() => readAyahGrammar(surah, ayah), ["ayah-grammar", String(surah), String(ayah), DEPLOYMENT])(),
);

/** Surah `number`'s Recitation, as `readRecitation` gives it. */
export const cachedRecitation = cache((number: number) => unstable_cache(() => readRecitation(number), ["recitation", String(number), DEPLOYMENT])());

/** The Root with QUL id `id`, its Lemmas and Spellings, as `readRoot` gives it. */
export const cachedRoot = cache((id: number) =>
  unstable_cache(() => readRoot(id), ["root", String(id), DEPLOYMENT])(),
);

/** The id of the Root whose letters, spaces taken out, are `letters` (ADR 0065), as `readRootId` gives it. */
export const cachedRootId = cache((letters: string) => unstable_cache(() => readRootId(letters), ["root-id", letters, DEPLOYMENT])());

/** Part `part` of the Ayahs of Spelling `spelling` of Lemma `lemma` of Root `root` (#288), the Ayahs at `keys`, as `readAyahsAt` gives them. */
export const cachedSpellingPart = (root: number, lemma: number, spelling: number, part: number, keys: AyahKey[]) =>
  // No React cache(): it compares `keys` by reference, so it would never hit; `keys` follows from the rest of the key.
  unstable_cache(() => readAyahsAt(keys), ["spelling-part", String(root), String(lemma), String(spelling), String(part), DEPLOYMENT])();

/** Every Root file's stored hash, as `readRootHashes` gives them. */
export const cachedRootHashes = cache(unstable_cache(() => readRootHashes(), ["root-hashes", DEPLOYMENT]));

/** Every Root with its Lemmas' meanings, as `readRootList` gives them. */
export const cachedRootList = cache(unstable_cache(() => readRootList(), ["root-list", DEPLOYMENT]));

/** Every Root with its transliteration and count of occurrences, as `readRootRows` gives them. */
export const cachedRootRows = cache(unstable_cache(() => readRootRows(), ["root-rows", DEPLOYMENT]));

/** The particle numbered `id` and its Spellings (#249), as `readParticle` gives it. */
export const cachedParticle = cache((id: number) =>
  unstable_cache(() => readParticle(id), ["particle", String(id), DEPLOYMENT])(),
);

/** Every particle with its Spellings' meanings, as `readParticleList` gives them. */
export const cachedParticleList = cache(unstable_cache(() => readParticleList(), ["particle-list", DEPLOYMENT]));

/** Every particle file's stored hash, as `readParticleHashes` gives them. */
export const cachedParticleHashes = cache(unstable_cache(() => readParticleHashes(), ["particle-hashes", DEPLOYMENT]));

/** Each Script's Juz list, as `readJuz` gives them. */
export const cachedJuz = cache(unstable_cache(() => readJuz(), ["juz", DEPLOYMENT]));
