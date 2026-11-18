"use client";

// A Grammar page's reading area (#278): it arrives with its first Grammar
// part's Ayahs, rendered by the server, and a shimmering skeleton below them,
// then fetches the other parts in order, by the mechanism every page opened in
// parts shares (../../in-parts/use-parts.ts, ADR 0005, 0014 and 0066), and
// shows each part's Ayahs as soon as every part before it has arrived.
// Whenever the next part takes too long, or a part fails, the skeleton gives
// way to a message and Retry; Ayahs already shown stay. A Word location's
// Word is landed on once its part is here (./word-target.tsx, #279).

import type { ReactNode } from "react";
import { grammarPartsAddress } from "@saaliheen/dataset/parts";
import type { Language } from "@/dataset/reader";
import type { GrammarAyah } from "@/grammar/parts";
import shared from "../../in-parts/in-parts.module.css";
import { StillToCome } from "../../in-parts/still-to-come";
import { useParts } from "../../in-parts/use-parts";
import { GrammarAyahs } from "./grammar-ayahs";
import styles from "./grammar.module.css";
import { WordTarget } from "./word-target";

/** How many Ayah rows of skeleton are drawn below the Ayahs shown: a screenful and more. */
const SKELETON_ROWS = 6;

export function GrammarInParts({
  lang,
  surah,
  partCount,
  laterWordCounts,
  children,
}: {
  lang: Language;
  surah: number;
  partCount: number;
  /** The Word count of each Ayah after the first part, in order, for the skeleton's rows. */
  laterWordCounts: number[];
  /** The first Grammar part's Ayahs, which arrive with the page. */
  children: ReactNode;
}) {
  const parts = useParts<GrammarAyah[]>({ address: grammarPartsAddress(lang, surah), count: partCount, from: 2, kept: false });
  const arrived = parts.arrived.flat();
  return (
    <main className={styles.page} aria-busy={!parts.complete && !parts.failed}>
      {children}
      <GrammarAyahs surah={surah} ayahs={arrived} lang={lang} />
      <StillToCome done={parts.complete} failed={parts.failed} onRetry={parts.retry}>
        {laterWordCounts.slice(arrived.length, arrived.length + SKELETON_ROWS).map((words, i) => (
          <GhostAyah key={arrived.length + i} words={words} />
        ))}
      </StillToCome>
      <WordTarget shown={arrived.length} />
    </main>
  );
}

/** An Ayah's place while it loads: its heading's, and its `words` Words'. */
function GhostAyah({ words }: { words: number }) {
  return (
    <div className={`${styles.ayah} ${styles.ghostAyah}`} aria-hidden="true" data-skeleton="">
      <div className={`${shared.ghost} ${styles.ghostHead}`} />
      <div className={styles.words} dir="rtl">
        {Array.from({ length: words }, (_, i) => (
          // Varied widths, as real Words are; the same on every render.
          <div key={i} className={`${shared.ghost} ${styles.ghostWord}`} style={{ width: 72 + ((i * 37) % 5) * 14 }} />
        ))}
      </div>
    </div>
  );
}
