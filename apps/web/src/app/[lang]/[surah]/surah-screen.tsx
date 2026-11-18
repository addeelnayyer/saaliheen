// The Surah screen around a Surah's Ayahs: the Surah bar holding the top bar,
// the Surah's heading, the previous and next Surahs at the foot, named (#192),
// the tab bar, the Root dialog and the share
// buttons (#19, #56). Shared by the Surah page and the Surah opened in parts (#24), so
// both draw the same screen from the Surah list alone and the opened Surah's
// frame is there at once. Everything on it shares the Ayah being read
// (ayah-in-view.tsx): the tracker in the reading area notes it, the Surah bar shows its Passage
// and plays the Recitation from it (#115). What it reads of the Quran, from
// Neon (#172), its page reads first (readSurahScreen), with the rest of what
// the page reads, so that a page Neon cannot answer is the error page.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { publishedRecitationUrl } from "@saaliheen/dataset/published";
import { getRecitation, getSurah, listSurahs, type Language, type PartPassage, type Recitation, type SurahSummary } from "@/dataset/reader";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { PASSAGE_HEADINGS } from "../release";
import type { SampleAyah } from "../settings-drawer";
import { TabBar, TopBar } from "../site-bar";
import { STRINGS } from "../strings";
import { UNAVAILABLE_METADATA } from "../unavailable-page";
import { AyahInViewProvider } from "./ayah-in-view";
import { ShareButtons } from "./ayah-share";
import { RecitationProvider } from "./recitation";
import { ParticleDialog } from "./particle-dialog";
import { RootDialog } from "./root-dialog";
import { SurahBar } from "./surah-bar";
import styles from "./surah.module.css";

/** The metadata of Surah `number`'s screen, its title naming it (and the `view` of it, as a Grammar page's does), with `extra`; the error page's when Neon cannot answer. */
export async function surahMetadata(number: number, extra: Metadata = {}, view?: string): Promise<Metadata> {
  const surahs = await orUnavailable(listSurahs);
  if (surahs === UNAVAILABLE) return UNAVAILABLE_METADATA;
  const name = `${number}. ${surahs[number - 1].nameLatin}`;
  return { title: `${view ? `${name} · ${view}` : name} · ${STRINGS.brand}`, ...extra };
}

/** What the Surah screen of one Surah in one Language shows of the Quran beyond the Surah itself. */
export interface SurahScreenQuran {
  /** The Surahs before and after it, where there are. */
  previous?: SurahSummary;
  next?: SurahSummary;
  recitation: Recitation;
  /** Ayah 1:2 in the Language, for the Reading settings sheet's preview. */
  sample: SampleAyah;
}

/** What Surah `number`'s screen in `lang` shows of the Quran, from Neon (#172). */
export async function readSurahScreen(number: number, lang: Language): Promise<SurahScreenQuran> {
  const [surahs, recitation, first] = await Promise.all([listSurahs(), getRecitation(number), getSurah(1)]);
  const ayah = first!.ayahs[1];
  return {
    previous: surahs[number - 2],
    next: surahs[number],
    recitation: recitation!,
    sample: {
      words: ayah.words.map((w) => ({ location: w.location, uthmani: w.uthmani, indopak: w.indopak, meaning: w.meaning[lang] })),
      translation: ayah.translation[lang],
    },
  };
}

interface SurahScreenProps {
  lang: Language;
  surah: SurahSummary;
  /** What the screen shows of the Quran beyond the Surah, as readSurahScreen gives it. */
  quran: SurahScreenQuran;
  /** The Surah's Passages in `lang`, read from Neon (#171), which the Surah bar shows once Passage headings are released. */
  passages: PartPassage[];
  children: ReactNode;
}

/** `children` is the reading area: the Surah's <main>, whole or filling in part by part. */
export function SurahScreen({ lang, surah, quran, passages, children }: SurahScreenProps) {
  const path = `/${surah.number}`;
  const { recitation } = quran;
  return (
    <AyahInViewProvider>
      {/* Only what starts the Recitation goes to the client; its Word timings are fetched when it first plays. */}
      <RecitationProvider
        audio={recitation.audio}
        reciter={recitation.reciter}
        ayahStarts={recitation.ayahs.map((a) => a.from)}
        timings={publishedRecitationUrl(surah.number)}
      >
        <div className={styles.app}>
          {/* Only what the Surah bar shows goes to the client, never the Surah's Words. */}
          <SurahBar
            lang={lang}
            surah={{ number: surah.number, nameArabic: surah.nameArabic, nameLatin: surah.nameLatin }}
            sample={quran.sample}
            passages={PASSAGE_HEADINGS ? passages : undefined}
          >
            <TopBar lang={lang} path={path} />
          </SurahBar>

          <SurahHeader surah={surah} />

          {children}

          <SurahFoot lang={lang} previous={quran.previous} next={quran.next} />
          <TabBar lang={lang} path={path} />
          <RootDialog lang={lang} />
          <ParticleDialog lang={lang} />
          <ShareButtons lang={lang} />
        </div>
      </RecitationProvider>
    </AyahInViewProvider>
  );
}

interface SurahFootProps {
  lang: Language;
  previous?: SurahSummary;
  next?: SurahSummary;
  /** Where a neighbouring Surah opens: its Surah page, or (on a Grammar page, #279) its Grammar page, which is not prefetched. */
  pathOf?: (lang: Language, surah: number) => string;
}

/** The Surah's one Prev/Next, after its last Ayah: each neighbouring Surah by its number and Latin name. */
export function SurahFoot({ lang, previous, next, pathOf }: SurahFootProps) {
  const neighbour = (s: SurahSummary | undefined, word: string, isNext: boolean) =>
    s && (
      // Prefetched: a link inside the app opens the small Surah in parts, never the whole page (#24).
      <Link
        className={isNext ? `${styles.neighbour} ${styles.next}` : styles.neighbour}
        href={pathOf ? pathOf(lang, s.number) : `/${lang}/${s.number}`}
        prefetch={pathOf ? false : undefined}
      >
        <span className={styles.neighbourWord}>{word}</span>
        <span className={styles.neighbourName}>
          {s.number}. {s.nameLatin}
        </span>
      </Link>
    );
  return (
    <nav className={styles.foot} aria-label={STRINGS.surahFoot}>
      <div className={styles.pager}>
        {neighbour(previous, STRINGS.prev, false)}
        {neighbour(next, STRINGS.next, true)}
      </div>
    </nav>
  );
}

/** The Surah's large heading: it scrolls away with the text, while the Surah bar keeps its number and names on screen. */
function SurahHeader({ surah }: { surah: SurahSummary }) {
  return (
    <header className={styles.surah}>
      <div>
        <span className={styles.sNo}>{surah.number}</span>
        <h1 className={styles.name} lang="ar" dir="rtl">
          {surah.nameArabic}
        </h1>
      </div>
      <div className={styles.meta}>
        {surah.nameLatin} ·{" "}
        <span className={surah.revelationPlace === "madani" ? `${styles.tag} ${styles.madani}` : styles.tag}>
          {STRINGS[surah.revelationPlace]}
        </span>{" "}
        · {STRINGS.ayahCount(surah.ayahCount)}
      </div>
    </header>
  );
}
