// What the Passage editor keeps in the Admin's browser storage, by storage
// name: the Unpublished changes to Passages and Phrases (#44, #100) and to
// Allah references (#152). What this tab last kept is read first, so editing
// still works where browser storage is missing or refuses (private mode), and
// every keep tells the editor to read again.

import { useSyncExternalStore } from "react";
import { readStored, store } from "../../[lang]/storage";

/** What this tab last kept, by storage name. */
const kept = new Map<string, string | null>();
const listeners = new Set<() => void>();

/** The text kept under `name`: this tab's last keep, else browser storage. */
export const keptText = (name: string) => (kept.has(name) ? kept.get(name)! : readStored(name));

/** Keep `text` under `name`, or clear it with null, and tell every reader. */
export function keep(name: string, text: string | null) {
  kept.set(name, text);
  store(name, text);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The text kept under `name`, read again on every keep; null while the page is prerendered or when there is no name. */
export function useKeptText(name: string | null): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (name === null ? null : keptText(name)),
    () => null,
  );
}
