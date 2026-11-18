// Asking Quran Chat (#78, ADR 0057), POST /api/v1/questions: a signed-in
// Account sends the JSON { question, language } and reads the answer as Claude
// writes it, newline-delimited JSON events (@saaliheen/quran-chat). Either
// the website's session cookie or the mobile app's bearer token signs it in; a
// request with neither is refused (401), and one that is not a question in a
// Language (400). Without the keys Quran Chat needs, it answers 503. Each
// question counts against the Account's Question limits (#80, ADR 0058); one
// past either is refused, 429, naming the limit and when it resets, before
// Claude is asked. A question is asked in a Conversation (#79): the one the
// body's `conversation` names, or a new one without it. A Conversation that is
// not the Account's is not found (404); the answer's first event names the
// Conversation it was asked in.

import { database } from "@/database";
import { answerStream, askedQuestion, quranChatAnswerer } from "@/quran-chat/answer";
import { askIn, NO_SUCH_CONVERSATION } from "@/quran-chat/conversations";
import { countQuestion } from "@/quran-chat/question-limits";
import { requestNow } from "@/test-clock";
import { apiError, apiJson, withMinAppVersion } from "../respond";
import { notSignedIn, signedInAccount } from "../signed-in";

/** An answer takes Claude some seconds to write. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const asked = askedQuestion(await request.json().catch(() => undefined));
  if (!asked) {
    return apiError(400, "send a JSON object with a question (1 to 2,000 characters), a language (ur or en) and, to continue a Conversation, its id as conversation");
  }
  const answerer = quranChatAnswerer();
  if (!answerer) return apiError(503, "Quran Chat is not set up: set ANTHROPIC_API_KEY and OPENAI_API_KEY");
  const pool = database();
  const now = requestNow(request);
  const refusal = await countQuestion(pool, account, now);
  if (refusal) {
    const refused = apiJson({ error: `the ${refusal.limit} Question limit is reached: it resets at ${refusal.resetsAt}`, ...refusal }, 429);
    refused.headers.set("Retry-After", String(Math.ceil((Date.parse(refusal.resetsAt) - now.getTime()) / 1000)));
    return refused;
  }
  const asking = await askIn(pool, account, asked);
  if (!asking) return apiError(404, NO_SUCH_CONVERSATION);
  const answer = answerStream(pool, answerer, asked, asking);
  return withMinAppVersion(
    new Response(answer, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } }),
  );
}
