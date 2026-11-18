"use client";

// Where a visit to a Theme page was left (#131), for Back and Forward to land
// there again (../../in-parts/visits.ts, the Surahs' mechanism, ADR 0005 and
// 0014). While the page is on its visit, the Ayah at the top of the screen is
// noted as the reader scrolls, at most once a frame. A Theme page opened in
// parts mounts this once the Ayah it lands on is on the page, and first lands
// there. It never moves a Reading place: a Theme page is no Surah's.

import { useEffect, useLayoutEffect } from "react";
import { firstAtTop, landOn } from "../../[surah]/ayah-at-top";
import { currentVisit, noteVisit } from "../../in-parts/visits";

/** The visits page of Theme `slug`. */
export const themeVisitPage = (slug: string) => `theme:${slug}`;

/** The page's Ayahs, in order: the only list items in its <main> (theme-groups.tsx). A live list, so it keeps up as parts arrive. */
const themeAyahs = () => document.querySelector("main")?.getElementsByTagName("li");

/** The `s:a` of the Theme page's Ayah at the top of the screen, or null when none is. */
function ayahAtTop(): string | null {
  const ayahs = themeAyahs();
  return (ayahs && firstAtTop(ayahs)?.getAttribute("data-ayah")) ?? null;
}

export function ThemeVisit({ slug, landOn: target }: { slug: string; landOn?: string }) {
  // Before paint, so the page never shows its top before moving to the Ayah it lands on.
  useLayoutEffect(() => {
    const element = target ? document.querySelector<HTMLElement>(`main [data-ayah="${target}"]`) : null;
    return element ? landOn(element) : undefined;
  }, [target]);

  useEffect(() => {
    const visit = currentVisit();
    if (!visit) return;
    let frame = 0;
    const note = () => {
      frame = 0;
      const ayah = ayahAtTop();
      if (ayah && currentVisit() === visit) noteVisit(visit, themeVisitPage(slug), ayah);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(note);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      // A client navigation (the Language switch, a link) fires no scroll: keep what the last scroll moved to.
      if (frame) note();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [slug]);

  return null;
}
