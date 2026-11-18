// The way back to Explore (#192), in the content of every page under it: the
// Themes list, Theme pages, the Iltifat pages and the Supplications page.

import Link from "next/link";
import type { Language } from "@/dataset/reader";
import { STRINGS } from "../strings";
import styles from "./explore.module.css";

/** Where Explore is in `lang`. */
export const explorePath = (lang: Language) => `/${lang}/explore`;

export function BackToExplore({ lang }: { lang: Language }) {
  return (
    <Link className={styles.back} href={explorePath(lang)}>
      {STRINGS.backToExplore}
    </Link>
  );
}
