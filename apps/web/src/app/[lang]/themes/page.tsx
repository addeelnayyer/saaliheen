// The Themes list (#130): every Theme under its Theme category, in the Themes
// list's order, each with its count of Ayahs and linking to its Theme page.
// The Themes are read from Neon (#170, src/themes/), so the page is rendered on
// its first request in each Language, not at build, then served from the cache
// (ADR 0020), or is the error page when Neon cannot answer. Its interface is English, like the Theme page's, its names in
// the Language.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage, type Language, type ThemeCategory } from "@/dataset/reader";
import { cachedThemeIndex } from "@/themes/cached";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import type { ThemeSummary as Theme } from "@/themes/themes";
import { BackToExplore } from "../explore/back-to-explore";
import { SiteBar } from "../site-bar";
import { DIRECTION, inLanguage, STRINGS } from "../strings";
import { UnavailablePage } from "../unavailable-page";
import indexStyles from "../index.module.css";
import { THEMES_ADDRESS, themePath } from "./theme-path";
import styles from "./themes-list.module.css";

// None at build, which runs without Neon (ADR 0020); any Language reaches the
// page, which leaves all but the site's not found (ADR 0024).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string }[] => [];

export const metadata: Metadata = { title: `${STRINGS.themes} · ${STRINGS.brand}` };

function ThemeLink({ lang, theme }: { lang: Language; theme: Theme }) {
  return (
    <li>
      {/* Opens the Theme page inside the app, in parts (#131); 258 links, so not prefetched. */}
      <Link className={styles.theme} href={themePath(lang, theme.slug)} prefetch={false}>
        <span className={styles.name} {...inLanguage(lang)}>
          {theme[lang]}
        </span>{" "}
        <span className={styles.count} dir="ltr">{STRINGS.ayahCount(theme.ayahCount)}</span>
      </Link>
    </li>
  );
}

/** A Theme category: its name as a heading, then its Themes. */
function Category({ lang, category, themes }: { lang: Language; category: ThemeCategory; themes: Theme[] }) {
  return (
    <section className={styles.category} aria-labelledby={`category-${category.slug}`}>
      <h2 id={`category-${category.slug}`} className={styles.heading} {...inLanguage(lang)}>
        {category[lang]}
      </h2>
      {/* Laid out in the Language's direction; the counts stay English. */}
      <ul className={styles.themes} dir={DIRECTION[lang]}>
        {themes.map((theme) => (
          <ThemeLink key={theme.slug} lang={lang} theme={theme} />
        ))}
      </ul>
    </section>
  );
}

export default async function ThemesListPage({ params }: PageProps<"/[lang]/themes">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const index = await orUnavailable(cachedThemeIndex);
  if (index === UNAVAILABLE) return <UnavailablePage lang={lang} path={THEMES_ADDRESS} />;
  const { categories, themes } = index;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={THEMES_ADDRESS} />
      <main className={styles.page}>
        <BackToExplore lang={lang} />
        <div className={indexStyles.hero}>
          <h1 className={indexStyles.title}>{STRINGS.themes}</h1>
          <p className={indexStyles.sub}>{STRINGS.themesStats(themes.length, categories.length)}</p>
        </div>
        {categories.map((category) => (
          <Category key={category.slug} lang={lang} category={category} themes={themes.filter((t) => t.category === category.slug)} />
        ))}
      </main>
    </div>
  );
}
