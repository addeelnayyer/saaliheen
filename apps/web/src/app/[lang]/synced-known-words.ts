// Known words following an Account (#252, ADR 0057): a signed-in browser
// brings its Known words to its Account through the versioned API's Known
// words resource (/api/v1/known-words) and keeps the Account's. Each page it
// opens (once synced-settings.ts has asked whether it is signed in) sends all
// of this browser's Known words, unmarks included, or asks for the Account's
// when it has none, and merges the Account's answer in; so a mark that never
// reached the Account goes with the next page opened online, and on first
// sign-in this browser's Known words merge with the Account's. Each mark is
// also sent as it is made. The Account and the browser merge by the same
// rule: for each Root or particle the newer mark or unmark wins, by when it
// was made, and a tie goes to the unmark. Signing out leaves the browser's.

import { isKnownWordEntry, type KnownWordEntry, type KnownWordKey } from "@saaliheen/known-words";
import { mergeIntoKnownWords, readKnownWords, storeKnownWordMark } from "./known-words";
import { signedInToAccount } from "./synced-settings";

const KNOWN_WORDS = "/api/v1/known-words";

/**
 * Send `entries` to the Account. A send that fails, offline or cut off by
 * leaving the page, is left for the next page's sync, which sends them all.
 */
const bring = (entries: KnownWordEntry[]) =>
  fetch(KNOWN_WORDS, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ knownWords: entries }),
  });

/** Marks (`known`) or unmarks `key` now in this browser and, when signed in, in its Account. */
export function markKnownWord(key: KnownWordKey, known: boolean) {
  const marked = storeKnownWordMark(key, known);
  if (signedInToAccount()) bring([marked]).catch(() => {});
}

/** The Known words in an answer of the API, or none. */
async function knownWordsIn(res: Response): Promise<KnownWordEntry[]> {
  if (!res.ok) return [];
  const { knownWords } = (await res.json()) as { knownWords?: unknown };
  return Array.isArray(knownWords) ? knownWords.filter(isKnownWordEntry) : [];
}

/** Bring this browser's Known words to its Account, when signed in, and merge the Account's answer into them. */
export async function syncKnownWords() {
  if (!signedInToAccount()) return;
  const entries = readKnownWords();
  const res = await (entries.length > 0 ? bring(entries) : fetch(KNOWN_WORDS, { cache: "no-store" }));
  const account = await knownWordsIn(res);
  if (account.length > 0) mergeIntoKnownWords(account);
}
