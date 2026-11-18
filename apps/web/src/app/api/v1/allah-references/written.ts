// The answers an Admin's write to a Surah's Allah references gives (#153,
// #154): a publish and an undo both refresh the Surah's cache tag when they
// pass, and both answer 409 with the latest when their base is stale.

import { revalidateTag } from "next/cache";
import { allahReferencesTag } from "@/allah-references/for-surah";
import { STALE_ERROR } from "@/allah-references/publish";
import type { SurahAllahReferences } from "@/allah-references/stored";
import { apiJson } from "../respond";

/** The answer to a write on Surah `surah` made against a version no longer its own: 409 with the `latest`. */
export const staleAnswer = (surah: number, latest: SurahAllahReferences) => apiJson({ error: STALE_ERROR, latest: { surah, ...latest } }, 409);

/** The answer to a write that brought Surah `surah` to `references`, once its cache tag is refreshed. */
export function writtenAnswer(surah: number, { version, locations }: SurahAllahReferences): Response {
  revalidateTag(allahReferencesTag(surah), { expire: 0 });
  return apiJson({ surah, version, locations });
}
