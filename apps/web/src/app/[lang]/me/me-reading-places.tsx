"use client";

// Me's Reading places (#192): this browser's, newest first, each a link to its
// Surah in Me's Language, where the Surah page scrolls to the Ayah, as the
// Surah index's Continue reading cards do. Only the browser knows them, so they
// appear once the page runs.

import Link from "next/link";
import type { Language, SurahSummary } from "@/dataset/reader";
import { useContinuable } from "../continue-reading";
import { STRINGS } from "../strings";
import styles from "./me.module.css";

export function MeReadingPlaces({ lang, surahs }: { lang: Language; surahs: Pick<SurahSummary, "number" | "nameLatin" | "ayahCount">[] }) {
  const places = useContinuable(surahs);
  if (places.length === 0) return <p className={styles.note}>{STRINGS.noReadingPlaces}</p>;
  return (
    <ul className={styles.list}>
      {places.map(({ surah, ayah }) => (
        <li key={surah.number}>
          <Link className={styles.entry} href={`/${lang}/${surah.number}`}>
            {surah.number}. {STRINGS.ayahOf(surah.nameLatin, ayah)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
