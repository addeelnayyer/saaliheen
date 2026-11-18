"use client";

// Read, the Surah index (#193): from the top, the Reading places, then the
// Surahs and Juz tabs with one search box and a single-column list in each
// (index-lists.tsx), the Surahs tab with its Makki/Madani filter. Every row is
// in the prerendered HTML; searching and filtering only narrow it in the
// browser. The address follows the tab, /{lang} ⇄ /{lang}/juz, replacing the
// history entry; the tab chosen is remembered and applied on arrivals from
// inside the app (index-tab.ts).

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { JuzLists, Language, SurahSummary } from "@/dataset/reader";
import { ContinueReading } from "./continue-reading";
import { IndexLists } from "./index-lists";
import { openingTab, rememberTab, tabAt, tabPath, type IndexTab } from "./index-tab";

/** Puts the address of tab `tab` in place of the page's own, in the same history entry. */
function showAddress(lang: Language, tab: IndexTab) {
  if (tabAt(window.location.pathname) !== tab) window.history.replaceState(null, "", tabPath(lang, tab));
}

const never = () => () => {};

export function SurahIndex({ lang, surahs, juz, tab: addressed }: { lang: Language; surahs: SurahSummary[]; juz: JuzLists; tab: IndexTab }) {
  // The tab the page opens on: the address's while prerendered and hydrated,
  // then the one an in-app arrival remembers (Back may also bring this page
  // back at either address); a tab the reader chooses replaces it.
  const opening = useSyncExternalStore(never, () => openingTab(window.location.pathname), () => addressed);
  const [chosen, setChosen] = useState<IndexTab | null>(null);
  const tab = chosen ?? opening;
  useLayoutEffect(() => showAddress(lang, tab), [lang, tab]);

  const choose = (chosen: IndexTab) => {
    setChosen(chosen);
    rememberTab(chosen);
  };

  return (
    <>
      <ContinueReading lang={lang} surahs={surahs} />
      <IndexLists lang={lang} surahs={surahs} juz={juz} tab={tab} onTab={choose} filter />
    </>
  );
}
