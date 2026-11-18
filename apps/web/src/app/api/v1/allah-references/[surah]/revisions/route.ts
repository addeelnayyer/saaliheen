// A Surah's Allah reference revisions, listed to Admins (#154, ADR 0044),
// GET /api/v1/allah-references/{surah}/revisions: answers
// { surah, version, revisions }, newest first, each revision
// { version, base, createdAt, author, added, removed }: createdAt an ISO 8601
// time, author { kind: "seed" } or { kind: "admin", email, name }, and the
// Word locations it added and removed in Quran order. Read from Neon on each
// request. A refusal answers { error }: 401 from no Account, 403 from an
// Account that isn't an Admin, 404 for no Surah.

import { accessOf } from "@/admin/access";
import { listRevisions } from "@/allah-references/revisions";
import { apiJson } from "../../../respond";
import { notAnAdmin, notSignedIn } from "../../../signed-in";
import { notASurah, surahOf } from "../../surah-path";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/allah-references/[surah]/revisions">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const surah = surahOf((await params).surah);
  if (surah === undefined) return notASurah();
  return apiJson({ surah, ...(await listRevisions(surah)) });
}
