"use client";

// The Surah index's Continue reading cards (#69): one per Reading place of
// this browser, newest first, each a link to its Surah in the index's
// Language, where the Surah page scrolls to the Ayah. Not in the prerendered
// HTML: only the browser knows its Reading places, so the cards appear once the
// page is running, and never for a browser that has none (nor for a stored
// place that no longer names an Ayah). A signed-in browser's cards follow its
// Account's Reading places as they arrive (#71). The cards are not a list, so the Surah
// cards stay the index's only list.

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Language, SurahSummary } from "@/dataset/reader";
import { parseReadingPlaces, readingPlacesSnapshot, subscribeReadingPlaces, type ReadingPlace } from "./reading-place";
import { STRINGS } from "./strings";
import styles from "./index.module.css";

interface Continuable<S = SurahSummary> {
  surah: S;
  ayah: number;
}

/** The Reading places that name an Ayah of a Surah, with their Surahs. */
function continuable<S extends Pick<SurahSummary, "number" | "ayahCount">>(places: ReadingPlace[], surahs: S[]): Continuable<S>[] {
  return places.flatMap(({ surah: number, ayah }) => {
    const surah = surahs.find((s) => s.number === number);
    return surah && ayah <= surah.ayahCount ? [{ surah, ayah }] : [];
  });
}

/** This browser's Reading places that name an Ayah of one of `surahs`, newest first: none before the page runs. */
export function useContinuable<S extends Pick<SurahSummary, "number" | "ayahCount">>(surahs: S[]): Continuable<S>[] {
  const stored = useSyncExternalStore(subscribeReadingPlaces, readingPlacesSnapshot, () => "[]");
  return continuable(parseReadingPlaces(stored), surahs);
}

export function ContinueReading({ lang, surahs }: { lang: Language; surahs: SurahSummary[] }) {
  const places = useContinuable(surahs);
  if (places.length === 0) return null;

  return (
    <div className={styles.places}>
      {places.map(({ surah, ayah }) => (
        <ContinueCard key={surah.number} lang={lang} surah={surah} ayah={ayah} />
      ))}
    </div>
  );
}

function ContinueCard({ lang, surah, ayah }: Continuable & { lang: Language }) {
  const inSurah = STRINGS.ayahOf(surah.nameLatin, ayah);
  return (
    <Link
      className={`${styles.card} ${styles.continue}`}
      href={`/${lang}/${surah.number}`}
      aria-label={`${STRINGS.continueReading} ${surah.number}. ${inSurah}`}
    >
      <span className={styles.no}>{surah.number}</span>
      <span className={styles.info}>
        <span className={styles.ayat}>{STRINGS.continueReading}</span>
        <span className={styles.latin}>{inSurah}</span>
      </span>
      <span className={styles.ar} lang="ar" dir="rtl">
        {surah.nameArabic}
      </span>
    </Link>
  );
}
