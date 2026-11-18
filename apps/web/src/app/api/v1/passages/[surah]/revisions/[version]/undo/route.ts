// An Admin's undo of a Passage revision (#174, ADR 0049),
// POST /api/v1/passages/{surah}/revisions/{version}/undo with the JSON body
// { base }, the Surah's Passage version the Admin saw. An undo that passes
// puts back the Passage and Phrase rows the revision at {version} changed and
// writes one new revision recording it, in one transaction; then, as a
// Publish does, it refreshes the Surah's Passage tag and warms its page and
// parts, and answers 200 { surah, version, passages, phrases, allahReferences }.
// A refusal writes nothing and answers { error }: 401 from no Account, 403
// from an Account that isn't an Admin, 404 for no Surah or no such revision,
// 400 for a body that isn't { base }, 422 for the seed's revision or one whose
// rows were not recorded, 409 when {base} is no longer the Surah's Passage
// version or a later revision changed a row the undo would put back (or its
// result would break a Passage or Phrase rule), with the latest as "latest",
// and 500 when the database refuses a write.

import { accessOf } from "@/admin/access";
import { isVersion } from "@/allah-references/publish";
import type { PublishedSurah } from "@/passages/publish";
import { refreshSurahPassages } from "@/passages/refresh";
import { undoPassageRevision, type PassageUndoOutcome } from "@/passages/revisions";
import { apiError, apiJson } from "../../../../../respond";
import { notAnAdmin, notSignedIn } from "../../../../../signed-in";
import { NOT_A_SURAH, surahOf } from "../../../../../surah-number";
import { STALE, surahAnswer } from "../../../surah-answer";

const NO_REVISION = "the Surah has no Passage revision with this version";
const NOT_AN_UNDO = "send a JSON object: base, the Surah's Passage version the undo was made on, as a whole number";
const UNWRITTEN = "the undo could not be written, and nothing was: try again";

/** The revision version path segment `segment` names; undefined when it is no whole number from 1. */
const versionOf = (segment: string) => (/^[1-9]\d{0,8}$/.test(segment) ? Number(segment) : undefined);

/** The base `body` names; undefined when it is no JSON object holding a whole-number base. */
const baseOf = (body: unknown) => {
  const base = (body as { base?: unknown } | null)?.base;
  return isVersion(base) ? base : undefined;
};

/** A 409 refusing an undo of Surah `surah` with `error`, carrying the `latest`. */
const clashAnswer = (surah: number, error: string, latest: PublishedSurah) => apiJson({ error, latest: surahAnswer(surah, latest) }, 409);

/** The answer to Surah `surah`'s undo that ended as `outcome`, refreshing and warming its pages at `origin` once written. */
function answerOf(surah: number, outcome: PassageUndoOutcome, origin: string): Response {
  if (outcome.kind === "missing") return apiError(404, NO_REVISION);
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  if (outcome.kind === "stale") return clashAnswer(surah, STALE, outcome.latest);
  if (outcome.kind === "clash") return clashAnswer(surah, outcome.error, outcome.latest);
  refreshSurahPassages(surah, origin);
  return apiJson(surahAnswer(surah, outcome.surah));
}

/** Undo Surah `surah`'s revision at `version` against `base` as `author`; 500 when the database refuses a write. */
async function undoneAnswer(surah: number, version: number, base: number, author: string, origin: string) {
  try {
    return answerOf(surah, await undoPassageRevision(surah, version, base, author), origin);
  } catch (error) {
    console.error(`Undo of Surah ${surah}'s Passage revision ${version} not written: ${(error as Error).message}`);
    return apiError(500, UNWRITTEN);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/v1/passages/[surah]/revisions/[version]/undo">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const path = await params;
  const surah = surahOf(path.surah);
  if (surah === undefined) return apiError(404, NOT_A_SURAH);
  const version = versionOf(path.version);
  if (version === undefined) return apiError(404, NO_REVISION);
  const base = baseOf(await request.json().catch(() => undefined));
  if (base === undefined) return apiError(400, NOT_AN_UNDO);
  return undoneAnswer(surah, version, base, asking.id, new URL(request.url).origin);
}
