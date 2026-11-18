// What the Supplication editor's saves of Supplications and Speakers (#201,
// #202) share: the Quran text's shape their checks read, and the answer to
// how a save ended, which refreshes the Supplications tag when it passed, so
// that the Supplications page and /api/v1/supplications show it at once (ADR
// 0043).

import { revalidateTag } from "next/cache";
import { listAyahWordCountsNow, listSurahNamesNow } from "@/dataset/reader";
import { SUPPLICATIONS_TAG } from "@/supplications/cached";
import { STALE_ERROR, type QuranShape, type SaveOutcome } from "@/supplications/save";
import { SPEAKER_STALE_ERROR, type SpeakerOutcome } from "@/supplications/speaker-save";
import { apiError, apiJson } from "../respond";

export const NOT_FOUND = "no Supplication has this id";
export const NO_SPEAKER = "no Speaker has this id";

/** The Quran text's Surah lengths and names and its Ayahs' Word counts as Neon holds them (#172), as a save's checks read them. */
export async function quranShape(): Promise<QuranShape> {
  const [surahs, wordCounts] = await Promise.all([listSurahNamesNow(), listAyahWordCountsNow()]);
  return {
    ayahCount: (surah) => surahs[surah - 1]?.ayahCount ?? 0,
    surahName: (surah) => surahs[surah - 1]?.nameLatin ?? `Surah ${surah}`,
    wordCount: (surah, ayah) => wordCounts[surah - 1]?.[ayah - 1] ?? 0,
  };
}

/** The answer to a save that ended as `outcome`; one that passed answers `passed`. */
export function answerOf(outcome: SaveOutcome, passed: (saved: Extract<SaveOutcome, { kind: "saved" }>) => Response): Response {
  if (outcome.kind === "not-found") return apiError(404, NOT_FOUND);
  if (outcome.kind === "stale") return apiJson({ error: STALE_ERROR, supplication: outcome.supplication }, 409);
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  revalidateTag(SUPPLICATIONS_TAG, { expire: 0 });
  return passed(outcome);
}

/** The answer to a Speaker's save that ended as `outcome`, as `answerOf` answers a Supplication's. */
export function speakerAnswerOf(outcome: SpeakerOutcome, passed: (saved: Extract<SpeakerOutcome, { kind: "saved" }>) => Response): Response {
  if (outcome.kind === "not-found") return apiError(404, NO_SPEAKER);
  if (outcome.kind === "stale") return apiJson({ error: SPEAKER_STALE_ERROR, speaker: outcome.speaker }, 409);
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  revalidateTag(SUPPLICATIONS_TAG, { expire: 0 });
  return passed(outcome);
}
