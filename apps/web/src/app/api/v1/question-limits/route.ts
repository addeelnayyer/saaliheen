// An Account's Question limits (#80, ADR 0058), GET /api/v1/question-limits:
// its Plan, and for the daily and the monthly limit what it allows, how many
// questions have been asked against it, how many are left and when it resets,
// by calendar day and month in UTC. Signed in by the session cookie or the
// bearer token; with neither, 401.

import { database } from "@/database";
import { questionLimits } from "@/quran-chat/question-limits";
import { requestNow } from "@/test-clock";
import { apiJson } from "../respond";
import { notSignedIn, signedInAccount } from "../signed-in";

export async function GET(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const limits = await questionLimits(database(), account, requestNow(request));
  const answer = apiJson(limits);
  answer.headers.set("Cache-Control", "no-store");
  return answer;
}
