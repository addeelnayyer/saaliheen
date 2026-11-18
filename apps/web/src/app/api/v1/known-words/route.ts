// An Account's Known words (#252, ADR 0057), /api/v1/known-words: GET answers
// { knownWords: [{ kind, text, known, markedAt }] }, unmarks included, oldest
// marked first, markedAt in milliseconds since the epoch; PATCH with
// { knownWords: [...] } merges a device's Known words into the Account's (the
// newer per Root or particle, a tie going to the unmark) and answers the
// result the same way. Either answers to the website's session cookie or the
// mobile app's bearer token, and refuses a request with neither (401). A body
// that is not a JSON object with a list of Known words, or holds one that is
// not a Known words entry, is refused (400) and changes nothing.

import { LONGEST_TEXT } from "@saaliheen/known-words";
import { bringKnownWords, knownWordsBrought, readKnownWords } from "@/account/synced-known-words";
import { apiError, apiJson } from "../respond";
import { notSignedIn, signedInAccount } from "../signed-in";

export async function GET(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  return apiJson({ knownWords: await readKnownWords(account) });
}

export async function PATCH(request: Request) {
  const account = await signedInAccount(request);
  if (!account) return notSignedIn();
  const brought = knownWordsBrought(await request.json().catch(() => undefined));
  if (!brought) {
    return apiError(
      400,
      `send a JSON object whose knownWords is a list of { kind, text, known, markedAt }: a kind of "root", "lemma" or "spelling", its text of 1 to ${LONGEST_TEXT} characters, whether it is known, and when it was marked, in whole milliseconds since the epoch`,
    );
  }
  return apiJson({ knownWords: await bringKnownWords(account, brought) });
}
