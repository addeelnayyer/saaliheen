// A Surah's Allah references, as the mobile app reads them (#150, ADR 0014,
// ADR 0028), GET /api/v1/allah-references/{surah}: answers
// { surah, version, locations }, needing no Account. "locations" are the
// Surah's Allah reference Word locations in Quran order, [] when it has none;
// "version" is its latest Allah reference revision's, 0 before any. Read from
// Neon, cached by the CDN for only 15 seconds, so a correction reaches the app
// within them while repeated reads don't each run the function. A
// path that is no Surah number from 1 to 114 answers 404, and a database that
// cannot be reached 503, both with { error }: never an empty list it did not read.
//
// POST, an Admin's publish (#153, ADR 0043): the JSON body { base, changes }
// is the version the changes were made on and the Word locations tapped, in
// order (ADR 0035). A publish that passes writes every changed Word location
// and one Allah reference revision in one transaction, refreshes the Surah's
// cache tag, so its Surah page, Surah parts and Share pages are rendered again
// on their next request, and answers 200 { surah, version, locations } as GET
// does, at the new version. A refusal writes nothing and answers { error }:
// 401 from no Account, 403 from an Account that isn't an Admin, 404 for no
// Surah, 400 for a body that isn't a publish, 422 for a change that is no Word
// of the Surah, and 409 against a version that is no longer the Surah's, with
// the latest as "latest". Since #171 it is one more caller of the Passage
// editor's one Publish transaction (src/passages/publish.ts), carrying Allah
// reference changes alone, kept so #153's clients and features still work.

import { accessOf } from "@/admin/access";
import { AllahReferencesUnread, readFresh } from "@/allah-references/fresh";
import { allahReferencePublishOf } from "@/allah-references/publish";
import { publishSurah, type SurahPublishOutcome } from "@/passages/publish";
import { apiError, apiJson, cachedAtEdge } from "../../respond";
import { notAnAdmin, notSignedIn } from "../../signed-in";
import { notASurah, surahOf } from "../surah-path";
import { staleAnswer, writtenAnswer } from "../written";

const UNREAD = "the Allah references cannot be read just now: try again later";
const NOT_A_PUBLISH = 'send a JSON object: base, the version the changes were made on, as a whole number, and changes as a list of Word locations "s:a:w"';

/** Surah `surah`'s answer; 503 when its Allah references cannot be read. */
async function answerFor(surah: number): Promise<Response> {
  try {
    const { version, locations } = await readFresh(surah);
    return apiJson({ surah, version, locations });
  } catch (error) {
    if (!(error instanceof AllahReferencesUnread)) throw error;
    console.error(`Allah references of Surah ${surah} unread: ${error.message}`);
    return apiError(503, UNREAD);
  }
}

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/allah-references/[surah]">) {
  const surah = surahOf((await params).surah);
  if (surah === undefined) return notASurah();
  return cachedAtEdge(await answerFor(surah), 15);
}

/** The answer to Surah `surah`'s publish that ended as `outcome`. */
function answerOf(surah: number, outcome: SurahPublishOutcome): Response {
  if (outcome.kind === "refused") return apiError(422, outcome.error);
  if (outcome.kind === "stale") return staleAnswer(surah, outcome.latest.allahReferences);
  return writtenAnswer(surah, outcome.surah.allahReferences);
}

export async function POST(request: Request, { params }: RouteContext<"/api/v1/allah-references/[surah]">) {
  const asking = await accessOf(request.headers);
  if (asking.kind === "visitor") return notSignedIn();
  if (asking.kind === "not-an-admin") return notAnAdmin();
  const surah = surahOf((await params).surah);
  if (surah === undefined) return notASurah();
  const publish = allahReferencePublishOf(await request.json().catch(() => undefined));
  if (!publish) return apiError(400, NOT_A_PUBLISH);
  return answerOf(surah, await publishSurah(surah, { allahReferences: publish }, asking.id));
}
