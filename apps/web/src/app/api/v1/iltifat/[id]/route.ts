// One Iltifat saved by an Admin (#142, ADR 0023), PUT /api/v1/iltifat/{id}:
// the JSON body { base, reason, ayahFrom, ayahTo, disputed, markedWords } is
// the Iltifat's whole editable state, its Marked Words as a list of
// { location: "s:a:w", side: "from" | "to" } (#143, ADR 0026), and the version it was made against. A save that
// passes writes the Iltifat and its Iltifat revision in one transaction,
// refreshes the cached Iltifat pages, /api/v1/iltifat and the Iltifat chips
// (ADR 0016, ADR 0018), and answers 200 { iltifat }. A refusal answers
// { error } and changes nothing: 401 from no Account, 403 from an Account that
// isn't an Admin, 404 for an id no Iltifat has, 400 for a body that isn't a
// save, 409 against an older version (with the latest as "iltifat"), 422 for
// a blank reason, a run outside its Surah or without its cited Ayah, or a
// Marked Word that is no Word of the Quran text or lies outside the run.
// Iltifat are never added or deleted: no other method is answered (405).

import { revalidateTag } from "next/cache";
import { accessOf } from "@/admin/access";
import { rowIdOf } from "@/admin/row-id";
import { listAyahWordCountsNow, listSurahNamesNow } from "@/dataset/reader";
import { iltifatTags } from "@/iltifat/cached";
import type { Iltifat } from "@/iltifat/iltifat";
import type { QuranShape } from "@/iltifat/marked-words";
import { iltifatSaveOf, saveIltifat, STALE_ERROR, type SaveOutcome } from "@/iltifat/save";
import { apiError, apiJson } from "../../respond";
import { notAnAdmin, notSignedIn } from "../../signed-in";

const NOT_FOUND = "no Iltifat has this id";
const NOT_A_SAVE =
  'send a JSON object: base, ayahFrom and ayahTo as whole numbers, reason as text, disputed as true or false and markedWords as a list of { location: "s:a:w", side: "from" or "to" }';

/** The Quran text's Surah and Ayah lengths as Neon holds them (#172), as a save's checks read them. */
async function quranShape(): Promise<QuranShape> {
  const [surahs, wordCounts] = await Promise.all([listSurahNamesNow(), listAyahWordCountsNow()]);
  return {
    ayahCount: (surah) => surahs[surah - 1]?.ayahCount ?? 0,
    wordCount: (surah, ayah) => wordCounts[surah - 1]?.[ayah - 1] ?? 0,
  };
}

/** Refresh what shows the saved Iltifat: its direction page, the overview, /api/v1/iltifat and the chips. */
function refresh(iltifat: Iltifat) {
  for (const tag of iltifatTags(iltifat.direction)) revalidateTag(tag, { expire: 0 });
}

/** The answer to a save that ended as `outcome`. */
function answerOf(outcome: SaveOutcome): Response {
  if (outcome.kind === "not-found") return apiError(404, NOT_FOUND);
  if (outcome.kind === "stale") return apiJson({ error: STALE_ERROR, iltifat: outcome.iltifat }, 409);
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  refresh(outcome.iltifat);
  return apiJson({ iltifat: outcome.iltifat });
}

export async function PUT(request: Request, { params }: RouteContext<"/api/v1/iltifat/[id]">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const id = rowIdOf((await params).id);
  if (id === undefined) return apiError(404, NOT_FOUND);
  const save = iltifatSaveOf(await request.json().catch(() => undefined));
  if (!save) return apiError(400, NOT_A_SAVE);
  return answerOf(await saveIltifat(id, save, asking, await quranShape()));
}
