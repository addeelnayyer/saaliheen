// Every Supplication and Speaker, as the Supplications page and the mobile app
// read them (#199, #195, ADR 0027), /api/v1/supplications: GET answers
// { supplications, speakers }, needing no Account. "supplications" lists every
// Supplication and every one of the Other words to Allah in Quran order, each
// with its run, Speaker id, Openings, kind, version and spans, in reading
// order by "from" ([] for none, #270); "speakers" every
// Speaker with both names, the Prophet mark and its version. It carries no
// Ayah text: clients join it from the dataset. Both come from Neon through the
// Supplications module, cached under the Supplications tag (ADR 0016),
// and by the CDN for a minute, so an edit reaches clients within one.
//
// POST adds a Supplication (#202, #196): Admin-only, its JSON body
// { surah, ayahFrom, ayahTo, speakerId, openings, kind, spans } the new
// Supplication's whole editable state. An add that passes writes it at version 1 and its
// Supplication revision in one transaction, refreshes the Supplications tag
// and answers 201 { supplication }. A refusal answers { error } and adds
// nothing: 401, 403, 400 for a body that isn't an add, and 422 as a save's
// (./[id]/route.ts).

import { accessOf } from "@/admin/access";
import { cachedEverySupplication } from "@/supplications/cached";
import { addSupplication, supplicationFieldsOf } from "@/supplications/save";
import { apiError, apiJson, cachedAtEdge } from "../respond";
import { notAnAdmin, notSignedIn } from "../signed-in";
import { answerOf, quranShape } from "./answer";

const NOT_AN_ADD = "send a JSON object: surah, ayahFrom and ayahTo as whole numbers, speakerId and kind as text, openings as a list of text, and spans as a list of { from, to }, each a Word location as text";

export async function GET() {
  return cachedAtEdge(apiJson(await cachedEverySupplication()), 60);
}

export async function POST(request: Request) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const add = supplicationFieldsOf(await request.json().catch(() => undefined));
  if (!add) return apiError(400, NOT_AN_ADD);
  return answerOf(await addSupplication(add, asking, await quranShape()), ({ supplication }) => apiJson({ supplication }, 201));
}
