// An Admin's undo of an Allah reference revision (#154, ADR 0044),
// POST /api/v1/allah-references/{surah}/revisions/{version}/undo with the JSON
// body { base }, the Surah's version the Admin saw. An undo that passes writes
// one new revision reversing the one at {version}, refreshes the Surah's cache
// tag as a publish does, so its Surah page, parts and Share pages are rendered
// again on their next request, and answers 200 { surah, version, locations }.
// A refusal writes nothing and answers { error }: 401 from no Account, 403
// from an Account that isn't an Admin, 404 for no Surah or no such revision,
// 400 for a body that isn't { base }, 422 for the seed's revision or an undo
// that would change nothing, and 409 against a version that is no longer the
// Surah's, with the latest as "latest".

import { accessOf } from "@/admin/access";
import { isVersion } from "@/allah-references/publish";
import { undoRevision, type UndoOutcome } from "@/allah-references/revisions";
import { apiError } from "../../../../../respond";
import { notAnAdmin, notSignedIn } from "../../../../../signed-in";
import { notASurah, surahOf } from "../../../../surah-path";
import { staleAnswer, writtenAnswer } from "../../../../written";

const NO_REVISION = "the Surah has no revision with this version";
const NOT_AN_UNDO = "send a JSON object: base, the Surah's version the undo was made on, as a whole number";

/** The revision version path segment `segment` names; undefined when it is no whole number from 1. */
const versionOf = (segment: string) => (/^[1-9]\d{0,8}$/.test(segment) ? Number(segment) : undefined);

/** The base `body` names; undefined when it is no JSON object holding a whole-number base. */
const baseOf = (body: unknown) => {
  const base = (body as { base?: unknown } | null)?.base;
  return isVersion(base) ? base : undefined;
};

/** The answer to Surah `surah`'s undo that ended as `outcome`. */
function answerOf(surah: number, outcome: UndoOutcome): Response {
  if (outcome.kind === "missing") return apiError(404, NO_REVISION);
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  if (outcome.kind === "stale") return staleAnswer(surah, outcome.latest);
  return writtenAnswer(surah, outcome.references);
}

export async function POST(request: Request, { params }: RouteContext<"/api/v1/allah-references/[surah]/revisions/[version]/undo">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const path = await params;
  const surah = surahOf(path.surah);
  if (surah === undefined) return notASurah();
  const version = versionOf(path.version);
  if (version === undefined) return apiError(404, NO_REVISION);
  const base = baseOf(await request.json().catch(() => undefined));
  if (base === undefined) return apiError(400, NOT_AN_UNDO);
  return answerOf(surah, await undoRevision(surah, version, base, asking.id));
}
