"use client";

// The reading area of a Theme page opened from inside the app (#131). It opens
// with its header and its first Theme part's Passage groups, which arrive with
// the page, and a shimmering skeleton below them; then it fetches the other
// Theme parts in order, by the mechanism every page opened in parts shares
// (../../../in-parts/use-parts.ts, ADR 0005 and 0014), and shows each part's
// groups as soon as every part before it has arrived. On Back and Forward it
// keeps the skeleton until the part holding the Ayah that visit was left at has
// arrived, then shows everything and lands there. Whenever the next part takes
// too long, or a part fails, the skeleton gives way to a message and Retry;
// groups already shown stay.

import { useMemo, type ReactNode } from "react";
import { themePartsAddress } from "@saaliheen/dataset/parts";
import type { Language, PartThemeGroup } from "@/dataset/reader";
import shared from "../../../in-parts/in-parts.module.css";
import { StillToCome } from "../../../in-parts/still-to-come";
import { useParts } from "../../../in-parts/use-parts";
import { returningTo } from "../../../in-parts/visits";
import { ayahId } from "../../../reading-place";
import { ThemeGroups } from "../../../themes/[slug]/theme-groups";
import { ThemeVisit, themeVisitPage } from "../../../themes/[slug]/theme-visit";
import listStyles from "../../../ayah-list.module.css";
import pageStyles from "../../../themes/[slug]/theme-page.module.css";
import styles from "./theme-in-parts.module.css";

/** How many Ayah rows of skeleton are drawn below the groups shown: a screenful and more. */
const SKELETON_ROWS = 8;

/** Where this opening lands: on Back and Forward, the `s:a` of the Ayah the visit was left at; else nowhere. */
interface Opening {
  ayah?: string;
}

/** Whether `groups` hold the Ayah `ayah` (`s:a`). */
const holds = (groups: PartThemeGroup[], ayah: string) =>
  groups.some((g) => g.ayahs.some((a) => ayahId({ surah: g.surah, ayah: a.number }) === ayah));

/** Whether `groups` hold the Ayah the opening lands on, or it lands nowhere; false while undecided. */
const landingArrived = (opening: Opening | null, groups: PartThemeGroup[]) =>
  opening !== null && (!opening.ayah || holds(groups, opening.ayah));

/**
 * The groups on screen: the first part's, and every part arrived once the part
 * holding the Ayah it lands on has (or all have, as a Theme of one part has at
 * once); and whether that has happened.
 */
function onScreen(first: PartThemeGroup[], arrived: PartThemeGroup[], complete: boolean, opening: Opening | null) {
  const all = [...first, ...arrived];
  const reached = complete || landingArrived(opening, all);
  return { shown: reached ? all : first, reached };
}

export function ThemeInParts({
  lang,
  slug,
  first,
  partCount,
  ayahCount,
  children,
}: {
  lang: Language;
  slug: string;
  /** The first Theme part's Passage groups, which arrive with the page. */
  first: PartThemeGroup[];
  partCount: number;
  /** How many Ayahs the Theme has, for the skeleton's rows. */
  ayahCount: number;
  /** The page's header, above the groups. */
  children: ReactNode;
}) {
  const parts = useParts<PartThemeGroup[], Opening>(
    { address: themePartsAddress(lang, slug), count: partCount, from: 2, kept: false },
    () => ({ ayah: returningTo(themeVisitPage(slug)) }),
  );
  const arrived = useMemo(() => parts.arrived.flat(), [parts.arrived]);
  const { shown, reached } = onScreen(first, arrived, parts.complete, parts.decided);
  const still = ayahCount - shown.reduce((n, g) => n + g.ayahs.length, 0);

  return (
    <>
      <main className={pageStyles.page} aria-busy={!parts.complete && !parts.failed}>
        {children}
        <ThemeGroups lang={lang} groups={shown} />
        <StillToCome done={parts.complete} failed={parts.failed} onRetry={parts.retry}>
          <SkeletonRows rows={Math.min(SKELETON_ROWS, still)} />
        </StillToCome>
      </main>
      {reached && <ThemeVisit slug={slug} landOn={parts.decided?.ayah} />}
    </>
  );
}

/** The skeleton's next `rows` Ayah rows, below the groups shown. */
function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className={`${listStyles.ayahs} ${styles.rows}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${listStyles.ayah} ${styles.row}`} data-skeleton="">
          <div className={`${shared.ghost} ${styles.arabic}`} />
          <div className={`${shared.ghost} ${styles.translation}`} />
        </div>
      ))}
    </div>
  );
}
