// One Speaker saved or deleted by an Admin in the Supplication editor (#202,
// #196, ADR 0027), /api/v1/supplications/speakers/{id}. PUT's JSON body
// { base, nameEn, nameUr, includesProphet } is the Speaker's names, Prophet
// mark and the version it was made against; DELETE's is { base }. A save that
// passes writes the Speaker and its Speaker revision in one transaction,
// refreshes the Supplications tag, so that every Supplication of the Speaker
// shows it at once (ADR 0043), and answers 200 { speaker }; a delete that
// passes answers 204, its revision kept. A refusal answers { error } and
// changes nothing: 401 from no Account, 403 from an Account that isn't an
// Admin, 404 for an id no Speaker has, 400 for a body that isn't a save or a
// delete, 409 against an older version (with the latest as "speaker"), 422
// for a blank name, one another Speaker has, or deleting a Speaker who still
// says a Supplication.

import { accessOf } from "@/admin/access";
import { baseOf } from "@/supplications/save";
import { deleteSpeaker, saveSpeaker, speakerSaveOf } from "@/supplications/speaker-save";
import { apiError, apiJson, withMinAppVersion } from "../../../respond";
import { notAnAdmin, notSignedIn } from "../../../signed-in";
import { speakerAnswerOf } from "../../answer";

const NOT_A_SAVE = "send a JSON object: base as a whole number, nameEn and nameUr as text, and includesProphet as true or false";
const NOT_A_DELETE = "send a JSON object: base, the version the delete was made against, as a whole number";

/** The Admin asking, and the Speaker id the path names; or the answer refusing them. */
async function adminAndId(request: Request, { params }: RouteContext<"/api/v1/supplications/speakers/[id]">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  return { admin: asking, id: (await params).id };
}

export async function PUT(request: Request, context: RouteContext<"/api/v1/supplications/speakers/[id]">) {
  const asked = await adminAndId(request, context);
  if (asked instanceof Response) return asked;
  const save = speakerSaveOf(await request.json().catch(() => undefined));
  if (!save) return apiError(400, NOT_A_SAVE);
  return speakerAnswerOf(await saveSpeaker(asked.id, save, asked.admin), ({ speaker }) => apiJson({ speaker }));
}

export async function DELETE(request: Request, context: RouteContext<"/api/v1/supplications/speakers/[id]">) {
  const asked = await adminAndId(request, context);
  if (asked instanceof Response) return asked;
  const base = baseOf(await request.json().catch(() => undefined));
  if (base === undefined) return apiError(400, NOT_A_DELETE);
  return speakerAnswerOf(await deleteSpeaker(asked.id, base, asked.admin), () => withMinAppVersion(new Response(null, { status: 204 })));
}
