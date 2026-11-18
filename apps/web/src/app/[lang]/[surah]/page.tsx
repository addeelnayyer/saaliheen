// A Surah page: the Surah read word by word, one row of Words per Ayah, each
// Ayah closed by its number in a star, each Passage's Ayahs grouped (#125).
// Rendered on its first request in each Language, not at build, and then
// served from the cache (#170, ADR 0020); any other Surah number is a 404. The
// page is English; only the Word meanings and Ayah translations are in the
// Language.
//
// This is what a direct load, a reload or a search engine gets: every Word in
// the HTML. A link inside the app opens the Surah in parts instead
// (../opening/[surah], via the rewrite in next.config.ts), so the screen never
// waits for this whole page (#24).
//
// Its Allah references (#147) are read through the data module under the
// Surah's cache tag, so a publish refreshes the page with no deploy; when Neon
// cannot be reached the page is built without them. So are its Iltifat chips
// (#140), read under the Iltifat overview's tag (ADR 0018). Its Theme chips
// are read from Neon under the Themes' tag (#170, src/themes/): when Neon
// cannot be reached and the page is not in the cache, it is the error page. So
// are its Passages and Phrase colours, read from Neon under the Surah's
// Passage tag (#171, src/passages/), which a Publish in the Surah refreshes.
// And so is the Quran itself, its Words, Word meanings, Ayah translations and
// Recitation, read from Neon (#172, src/quran/). With the Tafsir switch on, each
// Passage's Tafsir in the Language follows its last Ayah (#234), read from Neon
// under the Surah's Tafsir tag; when Neon cannot give it the page is built
// without it.

import type { Metadata } from "next";
import { withAllahReferences } from "@/allah-references/mark";
import { withIltifatChips } from "@/iltifat/mark";
import { getBismillah, surahAyahs, type Language } from "@/dataset/reader";
import { surahWithPassages } from "@/passages/on-pages";
import { withTafsir } from "@/tafsir/mark";
import { passageInLanguage } from "@saaliheen/passages";
import { themeNames, withThemes } from "@/themes/on-pages";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { TAFSIR } from "../release";
import { UnavailablePage } from "../unavailable-page";
import { Bismillah, PassageAyahs } from "./ayah";
import { SurahPageTracker } from "./reading-place-tracker";
import { pageSurahAddress } from "./surah-address";
import { readSurahScreen, SurahScreen, surahMetadata } from "./surah-screen";
import styles from "./surah.module.css";

// Any params reach the page, and pageSurahAddress() leaves any but a Language and a Surah
// not found: with dynamicParams false, a page whose cache tag a save refreshed
// would be not found until the next deploy (ADR 0024).
export const dynamicParams = true;

// None at build, which runs without Neon (ADR 0020); each is rendered on its first request.
export const generateStaticParams = (): { lang: string; surah: string }[] => [];

export async function generateMetadata({ params }: PageProps<"/[lang]/[surah]">): Promise<Metadata> {
  const { surah: number } = await pageSurahAddress(params);
  return surahMetadata(number);
}

/** Surah `number` as Neon holds it with its Passages and Phrases, its Ayahs in `lang` with their Themes, the names of its Themes, the Bismillah and its screen. */
async function readSurah(number: number, lang: Language) {
  const [surah, bismillah, screen] = await Promise.all([surahWithPassages(number), getBismillah(), readSurahScreen(number, lang)]);
  const [names, themed] = await Promise.all([themeNames(lang), withThemes(number, surahAyahs(surah!, lang))]);
  return { surah: surah!, names, themed, bismillah, screen };
}

export default async function SurahPage({ params }: PageProps<"/[lang]/[surah]">) {
  const { lang, surah: number } = await pageSurahAddress(params);
  const read = await orUnavailable(() => readSurah(number, lang));
  if (read === UNAVAILABLE) return <UnavailablePage lang={lang} path={`/${number}`} />;
  const { surah, names, themed, bismillah, screen } = read;
  const marked = await withIltifatChips(surah.number, await withAllahReferences(surah.number, themed));
  const ayahs = TAFSIR ? await withTafsir(surah.number, lang, marked, surah.passages) : marked;
  return (
    <SurahScreen lang={lang} surah={surah} quran={screen} passages={surah.passages.map((p) => passageInLanguage(p, lang))}>
      {/* Never busy: every Ayah is in the HTML, unlike a Surah opened in parts. */}
      <main className={styles.reader} lang="ar" aria-busy={false}>
        {surah.bismillah && <Bismillah uthmani={bismillah.uthmani} indopak={bismillah.indopak} />}
        {/* In the Language only, as a Surah part carries them, so both draw the same Ayahs. */}
        <PassageAyahs surah={surah.number} ayahs={ayahs} lang={lang} themeNames={names} sectionMarks={surah.sectionMarks} />
      </main>
      {/* Keyed on the Language: switching it keeps this page's elements and only
          swaps their text, so the tracker must start over and scroll to the Reading place again. */}
      <SurahPageTracker key={lang} surah={surah.number} ayahCount={surah.ayahCount} />
    </SurahScreen>
  );
}
