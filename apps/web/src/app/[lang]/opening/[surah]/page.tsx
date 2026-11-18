// A Surah opened from inside the app (#24): the same screen as the Surah page,
// but its Ayahs fill in part by part in the browser, so the screen opens at
// once. The rewrite in next.config.ts serves this for the app's own requests
// for /<lang>/<Surah>; a direct load, a reload or a search engine still gets
// the whole Surah page (../../[surah]/page.tsx). Rendered on its first
// request, not at build, then served from the cache (#170, ADR 0020); the
// links inside the app prefetch it, so it is already in the browser when one
// is followed. Only the Surah list's facts, each Ayah's Word count, the
// Surah's Section marks (#194), read from Neon (#172, src/quran/), and the
// names of the Surah's Themes and its Passages, read from Neon (src/themes/,
// src/passages/), are here; the Words come from the Surah's part files
// (/parts/...). When Neon cannot answer it is
// the error page instead.

import type { Metadata } from "next";
import { getBismillah, getSurah, type Language } from "@/dataset/reader";
import { surahParts } from "@saaliheen/dataset/parts";
import { passagesInLanguage } from "@/passages/on-pages";
import { surahThemeNames } from "@/themes/on-pages";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { UnavailablePage } from "../../unavailable-page";
import { pageSurahAddress } from "../../[surah]/surah-address";
import { readSurahScreen, SurahScreen, surahMetadata } from "../../[surah]/surah-screen";
import { SurahInParts } from "./surah-in-parts";

// Any params reach the page, and pageSurahAddress() leaves any but a Language and a Surah
// not found, as the Surah page does (ADR 0024).
export const dynamicParams = true;

// None at build, which runs without Neon (ADR 0020); each is rendered on its first request.
export const generateStaticParams = (): { lang: string; surah: string }[] => [];

export async function generateMetadata({ params }: PageProps<"/[lang]/opening/[surah]">): Promise<Metadata> {
  const { surah: number } = await pageSurahAddress(params);
  // The whole Surah page is the one to index; this is only ever reached by its address through the rewrite.
  return surahMetadata(number, { robots: { index: false } });
}

/** What the opened Surah `number` in `lang` shows, from Neon: the Surah itself, the Bismillah, its screen, its Themes' names and its Passages. */
async function readOpening(number: number, lang: Language) {
  const [surah, bismillah, screen, themeNames, passages] = await Promise.all([
    getSurah(number),
    getBismillah(),
    readSurahScreen(number, lang),
    surahThemeNames(number, lang),
    passagesInLanguage(number, lang),
  ]);
  return { surah: surah!, bismillah, screen, themeNames, passages };
}

export default async function OpeningSurahPage({ params }: PageProps<"/[lang]/opening/[surah]">) {
  const { lang, surah: number } = await pageSurahAddress(params);
  const read = await orUnavailable(() => readOpening(number, lang));
  if (read === UNAVAILABLE) return <UnavailablePage lang={lang} path={`/${number}`} />;
  const { surah, bismillah, screen, themeNames, passages } = read;
  const wordCounts = surah.ayahs.map((a) => a.words.length);
  const parts = surahParts(wordCounts);
  return (
    <SurahScreen lang={lang} surah={surah} quran={screen} passages={passages}>
      <SurahInParts
        // A new Language is a new load.
        key={lang}
        lang={lang}
        surah={surah.number}
        wordCounts={wordCounts}
        partEnds={parts.map((p) => p.last)}
        bismillah={surah.bismillah ? bismillah : null}
        themeNames={themeNames}
        sectionMarks={surah.sectionMarks}
      />
    </SurahScreen>
  );
}
