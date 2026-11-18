// A Surah's Passage revisions, listed to Admins (#174, ADR 0049),
// GET /api/v1/passages/{surah}/revisions: answers { surah, version, revisions },
// newest first, each revision { version, base, createdAt, author, edits,
// undoes, changes }: createdAt an ISO 8601 time, author { kind: "seed" } or
// { kind: "admin", email, name }, edits the Passage and Phrase edits its
// Publish sent, undoes the version an undo turned back (else null), and
// changes the Passage and Phrase rows it changed, each { before, after }
// (null when not recorded, as for the seed). Read from Neon on each request.
// A refusal answers { error }: 401 from no Account, 403 from an Account that
// isn't an Admin, 404 for no Surah.

import { accessOf } from "@/admin/access";
import { listPassageRevisions } from "@/passages/revisions";
import { apiError, apiJson } from "../../../respond";
import { notAnAdmin, notSignedIn } from "../../../signed-in";
import { NOT_A_SURAH, surahOf } from "../../../surah-number";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/passages/[surah]/revisions">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const surah = surahOf((await params).surah);
  if (surah === undefined) return apiError(404, NOT_A_SURAH);
  return apiJson({ surah, ...(await listPassageRevisions(surah)) });
}
