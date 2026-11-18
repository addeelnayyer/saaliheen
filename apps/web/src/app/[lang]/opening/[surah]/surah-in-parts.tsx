"use client";

// The reading area of a Surah opened from inside the app (#24). It opens as a
// shimmering skeleton laid out as the Surah's Ayah rows, then fetches the
// Surah's part files in order (a few ahead, by the mechanism every page opened
// in parts shares, ../../in-parts/use-parts.ts) and shows each part's Ayahs as soon
// as every part before it has arrived. A Surah opened to a particular Ayah (the
// Reading place, a `#s:a[:w]` fragment, or on Back and Forward the Ayah that
// visit was left at) keeps its skeleton until the part holding that Ayah has
// arrived, then shows everything and lands there. The Reading place is tracked
// only from then on, so a half-loaded Surah never moves it. Whenever the next
// part to show takes longer than PART_MS, or a part fails, the skeleton gives
// way to a message and a Retry button; Ayahs already shown stay. That holds
// before the first Ayahs are shown too, so an opening waiting for a far Ayah's
// part never shimmers for ever. Script, Ayah translation and the text sizes are
// on <html>, and the Root dialog listens on the whole page, so Ayahs that
// arrive later follow them too.

import { useMemo } from "react";
import type { Language, PartAyah, SectionMarks } from "@/dataset/reader";
import { surahPartsAddress } from "@saaliheen/dataset/parts";
import { landing, type Landing } from "../../reading-place";
import { Bismillah, PassageAyahs } from "../../[surah]/ayah";
import { ReadingPlaceTracker } from "../../[surah]/reading-place-tracker";
import surahStyles from "../../[surah]/surah.module.css";
import shared from "../../in-parts/in-parts.module.css";
import { StillToCome } from "../../in-parts/still-to-come";
import { useParts } from "../../in-parts/use-parts";
import { currentVisit, noteVisit, returningTo } from "../../in-parts/visits";
import styles from "./surah-in-parts.module.css";

/** How many Ayah rows of skeleton are drawn below the Ayahs shown: a screenful and more. */
const SKELETON_ROWS = 12;

/** Where this opening lands (landing), and the visit it is: its history entry's key, null without the Navigation API. */
interface Opening extends Landing {
  visit: string | null;
}

/** The visits page of Surah `surah` (../../in-parts/visits.ts). */
const visitPage = (surah: number) => `surah:${surah}`;

/** Where Surah `surah` of `ayahCount` Ayahs opens: landing, with the Ayah this visit was left at on Back and Forward. */
function openingOf(surah: number, ayahCount: number): Opening {
  const returning = Number(returningTo(visitPage(surah))) || undefined;
  return { ...landing(surah, ayahCount, returning), visit: currentVisit() };
}

export function SurahInParts({
  lang,
  surah,
  wordCounts,
  partEnds,
  bismillah,
  themeNames,
  sectionMarks,
}: {
  lang: Language;
  surah: number;
  /** How many Words each Ayah holds, Ayah 1 first: the skeleton's rows. */
  wordCounts: number[];
  /** Each part's last Ayah, in order. */
  partEnds: number[];
  bismillah: { uthmani: string; indopak: string } | null;
  /** Every Theme's name in the Language, by slug, for the Ayahs' Theme chips (#129). */
  themeNames: Record<string, string>;
  /** The Surah's Hizb quarters and Rukus (#194), drawn above their Ayahs as those arrive. */
  sectionMarks: SectionMarks;
}) {
  const parts = useParts<PartAyah[], Opening>(
    { address: surahPartsAddress(lang, surah), count: partEnds.length, from: 1, kept: true },
    () => openingOf(surah, wordCounts.length),
  );
  const opening = parts.decided;
  const ayahs = useMemo(() => parts.arrived.flat(), [parts.arrived]);
  const shown = onScreen(ayahs, opening);
  // Note where the reader is on this visit, for Back and Forward to return to, while the page is still on it.
  const noteThisVisit = (ayah: number) => {
    const visit = opening?.visit;
    if (visit && currentVisit() === visit) noteVisit(visit, visitPage(surah), String(ayah));
  };

  return (
    <>
      <main className={surahStyles.reader} lang="ar" aria-busy={!parts.complete && !parts.failed}>
        <BismillahOrGhost bismillah={bismillah} shown={shown.length > 0} />
        <PassageAyahs surah={surah} ayahs={shown} lang={lang} themeNames={themeNames} sectionMarks={sectionMarks} />
        <StillToCome done={parts.complete} failed={parts.failed} onRetry={parts.retry}>
          <GhostAyahs wordCounts={wordCounts} from={shown.length} />
        </StillToCome>
      </main>
      <TrackerOnceShown surah={surah} opening={opening} shown={shown.length > 0} onAyahAtTop={noteThisVisit} />
    </>
  );
}

/** The Ayahs on screen: those arrived, once the part holding the Ayah the opening lands on has arrived, and from then on. */
const onScreen = (ayahs: PartAyah[], opening: Opening | null) => (opening && ayahs.length >= opening.ayah ? ayahs : []);

/** The Bismillah, once Ayahs are shown, or its place while they load; nothing for a Surah without one. */
function BismillahOrGhost({ bismillah, shown }: { bismillah: { uthmani: string; indopak: string } | null; shown: boolean }) {
  if (!bismillah) return null;
  return shown ? <Bismillah {...bismillah} /> : <GhostLine />;
}

/** The skeleton's next rows below the Ayahs shown: the Ayahs from `from` (0-based) on. */
function GhostAyahs({ wordCounts, from }: { wordCounts: number[]; from: number }) {
  return wordCounts.slice(from, from + SKELETON_ROWS).map((words, i) => <GhostAyah key={from + i + 1} words={words} />);
}

/** Tracks the Reading place only once real Ayahs are on screen, first landing where the opening lands. */
function TrackerOnceShown({
  surah,
  opening,
  shown,
  onAyahAtTop,
}: {
  surah: number;
  opening: Opening | null;
  shown: boolean;
  onAyahAtTop: (ayah: number) => void;
}) {
  if (!opening || !shown) return null;
  return <ReadingPlaceTracker surah={surah} landOn={opening.id} onAyahAtTop={onAyahAtTop} />;
}

/** The Bismillah's place while it loads. */
function GhostLine() {
  return <div className={`${shared.ghost} ${styles.line}`} aria-hidden="true" />;
}

/** About how many Words a line of Flowing's running text holds, for the skeleton's lines. */
const WORDS_PER_LINE = 10;

/** The skeleton's running-text lines for an Ayah of `words` Words: full lines, the last as long as its share of Words (at least half). */
const ghostLineWidths = (words: number) => {
  const lines = Math.max(1, Math.ceil(words / WORDS_PER_LINE));
  const last = words - (lines - 1) * WORDS_PER_LINE;
  return Array.from({ length: lines }, (_, i) => (i < lines - 1 ? 100 : Math.max(50, Math.round((last / WORDS_PER_LINE) * 100))));
};

/**
 * An Ayah's place while it loads. In Study: its number's pill and one Word card's
 * place per Word, as the Ayah will lay them out. In Flowing (#125): lines of running
 * text instead; CSS shows the one the page's Ayah layout draws.
 */
function GhostAyah({ words }: { words: number }) {
  return (
    <div className={`${surahStyles.ayah} ${styles.row}`} aria-hidden="true" data-skeleton="">
      <div className={`${shared.ghost} ${styles.head}`} />
      <div className={`${surahStyles.tiles} ${styles.cards}`}>
        {Array.from({ length: words }, (_, i) => (
          // Varied widths, as real Words are; the same on every render.
          <div key={i} className={`${shared.ghost} ${styles.tile}`} style={{ width: 72 + ((i * 37) % 5) * 14 }} />
        ))}
      </div>
      <div className={styles.lines}>
        {ghostLineWidths(words).map((width, i) => (
          <div key={i} className={`${shared.ghost} ${styles.text}`} style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}
