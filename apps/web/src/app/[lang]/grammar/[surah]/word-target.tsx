"use client";

// Lands on a Grammar page's Word location and marks it (#279). The Word may be
// in a Grammar part still to come (#278), so each time Ayahs arrive (`shown`)
// it looks for the fragment's Word, and the first time it is there it is
// adopted as the page's `:target`, which grammar.module.css marks (a link
// inside the app, such as the Language switch carrying the fragment across,
// only scrolls to it; ../../reading-place.ts), and brought to the top of the
// screen as a Surah page's landing is (../../[surah]/ayah-at-top.ts). Nothing
// is read or stored.

import { useEffect, useRef } from "react";
import { adoptFragmentAsTarget, currentFragment } from "../../reading-place";
import { landOn } from "../../[surah]/ayah-at-top";

export function WordTarget({ shown }: { shown: number }) {
  /** What stops the landing once it has begun; null before. Ayahs arriving later leave it seating. */
  const landing = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (landing.current) return;
    const id = currentFragment();
    const word = id ? document.getElementById(id) : null;
    if (!word) return;
    adoptFragmentAsTarget();
    landing.current = landOn(word);
  }, [shown]);
  useEffect(() => () => landing.current?.(), []);
  return null;
}
