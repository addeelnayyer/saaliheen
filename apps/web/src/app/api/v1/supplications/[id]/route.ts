// One Supplication corrected or deleted by an Admin in the Supplication editor
// (#201, #202, #196, ADR 0027, after ADR 0023), /api/v1/supplications/{id}.
// PUT's JSON body { base, surah, ayahFrom, ayahTo, speakerId, openings, kind,
// spans } is the Supplication's whole editable state and the version it was
// made against, "spans" a list of { from, to } Word locations (#270, ADR 0063);
// DELETE's is { base }. A save that passes writes the Supplication, its spans
// in place of those it had, and its Supplication revision in one transaction,
// refreshes the Supplications tag, so that the Supplications page and
// /api/v1/supplications show it at once (ADR 0043), and answers 200
// { supplication }; a delete that passes answers 204, its spans gone and its
// revision kept. A refusal answers { error } and changes nothing: 401 from no
// Account, 403 from an Account that isn't an Admin, 404 for an id no
// Supplication has, 400 for a body that isn't a save or a delete, 409 against
// an older version (with the latest as "supplication"), 422 for a run outside
// its Surah or ending before it starts, an Ayah already in another
// Supplication (naming it), no Opening, an unknown Opening, Speaker or kind,
// or, after those, a span with an end that is no Word or outside the run, a
// "to" before its "from", or one overlapping another (naming it).

import { accessOf } from "@/admin/access";
import { rowIdOf } from "@/admin/row-id";
import { baseOf, deleteSupplication, saveSupplication, supplicationSaveOf } from "@/supplications/save";
import { apiError, apiJson, withMinAppVersion } from "../../respond";
import { notAnAdmin, notSignedIn } from "../../signed-in";
import { answerOf, NOT_FOUND, quranShape } from "../answer";

const NOT_A_SAVE =
  "send a JSON object: base, surah, ayahFrom and ayahTo as whole numbers, speakerId and kind as text, openings as a list of text, and spans as a list of { from, to }, each a Word location as text";
const NOT_A_DELETE = "send a JSON object: base, the version the delete was made against, as a whole number";

/** The Admin asking, and the Supplication id the path names; or the answer refusing them. */
async function adminAndId(request: Request, { params }: RouteContext<"/api/v1/supplications/[id]">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const id = rowIdOf((await params).id);
  return id === undefined ? apiError(404, NOT_FOUND) : { admin: asking, id };
}

export async function PUT(request: Request, context: RouteContext<"/api/v1/supplications/[id]">) {
  const asked = await adminAndId(request, context);
  if (asked instanceof Response) return asked;
  const save = supplicationSaveOf(await request.json().catch(() => undefined));
  if (!save) return apiError(400, NOT_A_SAVE);
  const outcome = await saveSupplication(asked.id, save, asked.admin, await quranShape());
  return answerOf(outcome, ({ supplication }) => apiJson({ supplication }));
}

export async function DELETE(request: Request, context: RouteContext<"/api/v1/supplications/[id]">) {
  const asked = await adminAndId(request, context);
  if (asked instanceof Response) return asked;
  const base = baseOf(await request.json().catch(() => undefined));
  if (base === undefined) return apiError(400, NOT_A_DELETE);
  return answerOf(await deleteSupplication(asked.id, base, asked.admin), () => withMinAppVersion(new Response(null, { status: 204 })));
}
