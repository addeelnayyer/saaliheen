// The Surah index's one search over both its tabs (#193), and what a Juz row
// says of where it runs. The rules are @saaliheen/dataset/index-search's,
// shared with the mobile app; this module fits them to the website's rows.

import { juzRuns as juzRunsBy } from "@saaliheen/dataset/index-search";
import type { Juz, SurahSummary } from "@/dataset/reader";

export { findJuz, findSurahs, foldNames, juzHolds } from "@saaliheen/dataset/index-search";

/** What the index shows of a Surah. */
export type IndexSurah = Pick<SurahSummary, "number" | "nameArabic" | "nameLatin" | "revelationPlace" | "ayahCount">;

/** Where a Juz runs, as its row says it: "Al-Baqarah 142 → 252", or "Ya-Sin 28 → Az-Zumar 31" across Surahs. */
export const juzRuns = (juz: Juz, surahs: IndexSurah[]) => juzRunsBy(juz, (n) => surahs[n - 1]?.nameLatin ?? String(n));
