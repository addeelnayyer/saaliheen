// A Theme page's header (#129): its name, its Theme category and its count of
// Ayahs. The same for a Theme page loaded whole and one opened in parts (#131).

import type { Language, ThemeCategory } from "@/dataset/reader";
import type { ThemeSummary } from "@/themes/themes";
import { BackToExplore } from "../../explore/back-to-explore";
import { inLanguage, STRINGS } from "../../strings";
import indexStyles from "../../index.module.css";
import styles from "./theme-page.module.css";

export function ThemeHeader({ lang, theme, category }: { lang: Language; theme: ThemeSummary; category: ThemeCategory }) {
  return (
    <header className={styles.header}>
      <BackToExplore lang={lang} />
      <h1 className={indexStyles.title} {...inLanguage(lang)}>
        {theme[lang]}
      </h1>
      <p className={styles.facts}>
        <span {...inLanguage(lang)}>{category[lang]}</span>
        <span aria-hidden="true">·</span>
        <span>{STRINGS.ayahCount(theme.ayahCount)}</span>
      </p>
    </header>
  );
}
