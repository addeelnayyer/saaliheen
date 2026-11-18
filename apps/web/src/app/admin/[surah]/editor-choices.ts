// What the Admin picks to review Passages by in the Passage editor (#86): which
// Ayah translation is shown, or none, and the Ayah layout. Each is kept in the
// Admin's browser, per device, for all Surahs; a first visit starts on English
// and Ayah by Ayah. Where browser storage is missing or refuses, a choice is
// kept in this tab until a reload. Neither is ever an Unpublished change.

import { useSyncExternalStore } from "react";
import type { Language } from "@/dataset/reader";
import { SHARE_LAYOUTS } from "@saaliheen/share";
import { readStored, store } from "../../[lang]/storage";

/** The Ayah translation the editor shows: a Language, or "off" for only the Arabic. */
export type ShownTranslation = Language | "off";

export const TRANSLATIONS: readonly ShownTranslation[] = ["off", "ur", "en"];

const STORED_AS = { translation: "saaliheen-editor-translation", layout: "saaliheen-editor-ayah-layout" } as const;

/** What this tab last chose, by storage name: read before storage, so a choice holds where storage refuses. */
const kept = new Map<string, string>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

const keptText = (name: string) => kept.get(name) ?? readStored(name);

function keep(name: string, value: string) {
  kept.set(name, value);
  store(name, value);
  for (const listener of listeners) listener();
}

/** One remembered choice among `options`, starting on `first`; `first` while prerendered. */
function useChoice<T extends string>(name: string, options: readonly T[], first: T): [T, (value: T) => void] {
  const text = useSyncExternalStore(subscribe, () => keptText(name), () => null);
  const value = options.find((o) => o === text) ?? first;
  return [value, (next: T) => keep(name, next)];
}

export const useShownTranslation = () => useChoice(STORED_AS.translation, TRANSLATIONS, "en");
export const useAyahLayout = () => useChoice(STORED_AS.layout, SHARE_LAYOUTS, "ayah-by-ayah");
