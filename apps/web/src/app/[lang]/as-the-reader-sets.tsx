"use client";

// Listed Ayahs as the reader's settings show them (#129, #138): the Arabic
// in the reader's Script only, and the Ayah translation only while it is on.
// Prerendered, before the settings on <html> are known, both Scripts and the
// translation are there for CSS to show or hide; once hydrated only what the
// settings show is in the page.

import { useSyncExternalStore, type ReactNode } from "react";
import { useHtmlAttribute } from "./reader-settings";
import { parseScript } from "./settings";

const never = () => () => {};

/** False while prerendering and hydrating, true after. */
const useHydrated = () =>
  useSyncExternalStore(
    never,
    () => true,
    () => false,
  );

/** `uthmani` or `indopak`, whichever is the reader's Script; both until hydrated. */
export function InReadersScript({ uthmani, indopak }: { uthmani: ReactNode; indopak: ReactNode }) {
  const script = parseScript(useHtmlAttribute("data-script"));
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <>
        {uthmani}
        {indopak}
      </>
    );
  }
  return script === "indopak" ? indopak : uthmani;
}

/** `children` while the Ayah translation is on; until hydrated, always (CSS hides it while off). */
export function WhileTranslationOn({ children }: { children: ReactNode }) {
  const on = useHtmlAttribute("data-translation") === "on";
  const hydrated = useHydrated();
  return !hydrated || on ? children : null;
}
