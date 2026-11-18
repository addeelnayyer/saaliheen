// A Speaker added by an Admin in the Supplication editor (#202, #196, ADR
// 0027), POST /api/v1/supplications/speakers. Its JSON body
// { nameEn, nameUr, includesProphet } is the new Speaker's names in both
// Languages and its Prophet mark. An add that passes writes the Speaker, its id
// a slug of its English name, at version 1, and its Speaker revision in one
// transaction, refreshes the Supplications tag, and answers 201 { speaker }.
// A refusal answers { error } and adds nothing: 401 from no Account, 403 from
// an Account that isn't an Admin, 400 for a body that isn't an add, 422 for a
// blank name or one another Speaker has.

import { accessOf } from "@/admin/access";
import { addSpeaker, speakerFieldsOf } from "@/supplications/speaker-save";
import { apiError, apiJson } from "../../respond";
import { notAnAdmin, notSignedIn } from "../../signed-in";
import { speakerAnswerOf } from "../answer";

const NOT_A_SPEAKER = "send a JSON object: nameEn and nameUr as text, and includesProphet as true or false";

export async function POST(request: Request) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const add = speakerFieldsOf(await request.json().catch(() => undefined));
  if (!add) return apiError(400, NOT_A_SPEAKER);
  return speakerAnswerOf(await addSpeaker(add, asking), ({ speaker }) => apiJson({ speaker }, 201));
}
