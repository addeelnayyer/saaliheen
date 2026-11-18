// An Admin's one Publish of a Surah (#171, ADR 0047), POST /api/v1/passages/{surah}:
// the JSON body { base, edits, allahReferences? } is the Surah's Passage
// version the edits were made on, the Passage editor's Passage and Phrase
// edits in the order made, and, while Allah reference changes wait, those
// changes as ADR 0043 has them ({ base, changes }). A Publish that passes
// writes every changed row, one Passage revision naming the Admin (none for
// Allah reference changes alone), the Allah reference revision and the Surah's
// new content hash in one transaction (src/passages/publish.ts); then it
// refreshes the Surah's Passage tag, which its page, parts, Share pages,
// /data/v1 file, the manifest and the Theme pages holding its Ayahs carry,
// warms its page and parts again, refreshes its Allah references' tag, and
// answers 200 { surah, version, passages, phrases, allahReferences }. A
// refusal writes nothing and answers { error }: 401 from no Account, 403 from
// an Account that isn't an Admin, 404 for no Surah, 400 for a body that isn't
// a Publish or publishes nothing, 422 for an edit that breaks a Passage or
// Phrase rule (the rule's reason) or no longer applies to the Surah's rows, or
// an Allah reference change that is no Word of the Surah, 409 when
// either version is no longer the Surah's, with the latest as "latest", and
// 500 when the database refuses a write.

import { revalidateTag } from "next/cache";
import { accessOf } from "@/admin/access";
import { allahReferencesTag } from "@/allah-references/for-surah";
import { publishSurah, type SurahPublishOutcome } from "@/passages/publish";
import { surahPublishOf } from "@/passages/publish-rules";
import { refreshSurahPassages } from "@/passages/refresh";
import { apiError, apiJson } from "../../respond";
import { notAnAdmin, notSignedIn } from "../../signed-in";
import { NOT_A_SURAH, surahOf } from "../../surah-number";
import { STALE, surahAnswer } from "./surah-answer";

const NOT_A_PUBLISH =
  "send a JSON object: base, the Passage version the edits were made on, as a whole number; edits, a list of Passage and Phrase edits; and, with Allah reference changes, allahReferences as { base, changes }";
const UNWRITTEN = "the Publish could not be written, and nothing was: try again";

/** Refresh what readers see of what `outcome` wrote to Surah `surah`, warming its pages at `origin`. */
function refresh(surah: number, wrote: { passages: boolean; allahReferences: boolean }, origin: string) {
  if (wrote.passages) refreshSurahPassages(surah, origin);
  if (wrote.allahReferences) revalidateTag(allahReferencesTag(surah), { expire: 0 });
}

/** The answer to Surah `surah`'s Publish that ended as `outcome`. */
function answerOf(surah: number, outcome: SurahPublishOutcome, origin: string): Response {
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  if (outcome.kind === "stale") return apiJson({ error: STALE, latest: surahAnswer(surah, outcome.latest) }, 409);
  refresh(surah, outcome.wrote, origin);
  return apiJson(surahAnswer(surah, outcome.surah));
}

/** Publish `body` to Surah `surah` as `author`; 500 when the database refuses a write. */
async function published(surah: number, body: NonNullable<ReturnType<typeof surahPublishOf>>, author: string, origin: string) {
  try {
    return answerOf(surah, await publishSurah(surah, body, author), origin);
  } catch (error) {
    console.error(`Publish of Surah ${surah} not written: ${(error as Error).message}`);
    return apiError(500, UNWRITTEN);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/v1/passages/[surah]">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const surah = surahOf((await params).surah);
  if (surah === undefined) return apiError(404, NOT_A_SURAH);
  const body = surahPublishOf(await request.json().catch(() => undefined), surah);
  if (!body) return apiError(400, NOT_A_PUBLISH);
  return published(surah, body, asking.id, new URL(request.url).origin);
}
