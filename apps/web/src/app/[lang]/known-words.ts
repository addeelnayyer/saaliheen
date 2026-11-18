// The Known words (#248, #251): the Roots and particles this browser's reader
// has marked as memorised, and the ones they unmarked, shared across Languages.
// Their rules are the @saaliheen/known-words package's (ADR 0057); this file is
// their storage, as one JSON list under `qwt-known-words`. Browser storage is
// read first, so a mark made in another tab is never written over; what this
// tab last stored stands in where storage is missing or refuses, so marking
// still holds while the reader stays on the site. The Root dialog, the Particle
// dialog and the Known words page all read them here, and hear of every mark
// and every merge of the Account's (./synced-known-words.ts, #252), in any tab,
// and so does the Known words' tint (known-words-tint.ts, #250).

import { useMemo, useSyncExternalStore } from "react";
import { markKnown, mergeKnownWords, parseKnownWords, writeKnownWords, type KnownWordEntry, type KnownWordKey } from "@saaliheen/known-words";
import { KNOWN_WORDS_STORED_AS, KNOWN_WORDS_STYLE, knownWordsStyle, paintKnownWords } from "./known-words-tint";
import { readStored, store } from "./storage";

/** What this tab last stored, once it has: read when browser storage can't be. */
let kept: string | undefined;

/** This browser's Known words as their stored text, the same while they are: a snapshot for useSyncExternalStore. */
const snapshot = () => readStored(KNOWN_WORDS_STORED_AS) ?? kept ?? "[]";

const listeners = new Set<() => void>();

/** Hears of marks made here, and of the Known words another tab stores. */
const subscribe = (listener: () => void) => {
  const fromAnotherTab = (event: StorageEvent) => {
    if (event.key === KNOWN_WORDS_STORED_AS || event.key === null) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", fromAnotherTab);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", fromAnotherTab);
  };
};

/** Stores `entries` as this browser's Known words, and tells whatever shows them. */
function keep(entries: KnownWordEntry[]) {
  kept = writeKnownWords(entries);
  store(KNOWN_WORDS_STORED_AS, kept);
  for (const listener of listeners) listener();
}

/** This browser's Known words entries, unmarks included. */
export const readKnownWords = () => parseKnownWords(snapshot());

/** Marks (`known`) or unmarks `key` now in this browser, and answers the entry it made. */
export function storeKnownWordMark(key: KnownWordKey, known: boolean): KnownWordEntry {
  const marked = markKnown(readKnownWords(), key, known, Date.now());
  keep(marked);
  return marked[marked.length - 1];
}

/** Merges `entries`, the Account's, into this browser's Known words, keeping the newer for each Root or particle. */
export function mergeIntoKnownWords(entries: KnownWordEntry[]) {
  keep(mergeKnownWords(readKnownWords(), entries));
}

/** Tints the Words of the Known Roots and Known particles (#250, #251) as the Known words are now, and again on every mark and merge, in any tab, until the returned stop. */
export function tintKnownWords() {
  const paint = () => paintKnownWords(KNOWN_WORDS_STYLE, knownWordsStyle(snapshot()));
  paint();
  return subscribe(paint);
}

/** This browser's Known words entries, read again on every mark; none while the page is prerendered. */
export function useKnownWords(): KnownWordEntry[] {
  const stored = useSyncExternalStore(subscribe, snapshot, () => "[]");
  return useMemo(() => parseKnownWords(stored), [stored]);
}
