// The page-hold contract (ADR 0067): while a dialog or the Settings drawer is
// open, the page beneath holds still. The shadcn/ui dialogs' backdrop holds the
// page in place of Radix's own scroll lock (src/components/ui/held-backdrop.tsx).

import { useLayoutEffect } from "react";

/** How many open dialogs hold the page: one may open over another (the Root dialog over the Word grammar dialog, #277). */
let holds = 0;

/**
 * Holds the page still until the returned function lets it go: no wheel,
 * trackpad, touch (even one that starts on the backdrop) or key scrolls it.
 * The page keeps its scroll position throughout and fires no scroll event, so
 * the Surah bar keeps its form and the Reading place stays where it was.
 * Where the page's scrollbar takes up room (a desktop that does not overlay
 * its scrollbars), padding takes the room over, so nothing shifts sideways;
 * `scrollbar-gutter: stable` would too, but not for a scrollbar a page or
 * extension styles. `overflow: hidden` on <html> is enough on iOS Safari too
 * (since iOS 16): it no longer scrolls such a page by touch, so the page
 * needs no script lock (fixing <body> and restoring scrollY), which would
 * move the page and fire scroll events of its own. A dialog opened over
 * another adds a hold, and the page is let go only when the last is.
 */
function holdPage() {
  const root = document.documentElement;
  if (holds++ === 0) {
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
  }
  return () => {
    if (--holds > 0) return;
    root.style.removeProperty("overflow");
    root.style.removeProperty("padding-right");
  };
}

/** Whether a dialog, any of the site's, native or shadcn/ui, holds the page beneath it. */
export const pageHeld = () => holds > 0;

/** Holds the page still from before the first paint of the component that calls it until it unmounts. */
export function useHoldPage() {
  useLayoutEffect(holdPage, []);
}
