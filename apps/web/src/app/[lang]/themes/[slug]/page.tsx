// A Theme page (#129): one Theme's Ayahs in Quran order, under their Passage
// groups, each Ayah's Arabic in the reader's Script and its Ayah translation
// when it is on, and a link to the Ayah in its Surah. Its Theme is read from
// Neon (#170, src/themes/), its Ayahs grouped by Neon's Passages (#171); it is
// rendered on its first request, not at build, then served from the cache
// (ADR 0020); when Neon cannot answer it is the error page instead. Its
// interface is English, its names in the Language.
// This is the whole page, every Ayah in its HTML, for a direct load, a reload
// or a search engine; the app's own requests for it get the Theme page opened
// in parts instead (#131, ../../opening/themes/[slug]/page.tsx, by the rewrite
// in next.config.ts).

import type { Metadata } from "next";
import { themeGroupsOf } from "@/themes/on-pages";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { SiteBar } from "../../site-bar";
import { STRINGS } from "../../strings";
import { UNAVAILABLE_METADATA, UnavailablePage } from "../../unavailable-page";
import indexStyles from "../../index.module.css";
import { themeAddress, themePath } from "../theme-path";
import { previewDescription } from "./link-preview";
import { loadThemePage } from "./load-theme-page";
import { ThemeGroups } from "./theme-groups";
import { ThemeHeader } from "./theme-header";
import { ThemeVisit } from "./theme-visit";
import styles from "./theme-page.module.css";

// Any params reach the page, and loadThemePage leaves any but a Language and a
// Theme's slug not found (ADR 0024); none is rendered at build, which runs
// without Neon (ADR 0020).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string; slug: string }[] => [];

export async function generateMetadata({ params }: PageProps<"/[lang]/themes/[slug]">): Promise<Metadata> {
  const { lang, page } = await loadThemePage(params);
  if (page === UNAVAILABLE) return UNAVAILABLE_METADATA;
  const { theme } = page;
  const title = theme[lang];
  const description = previewDescription(theme);
  return {
    title: `${title} · ${STRINGS.brand}`,
    description,
    openGraph: { type: "article", siteName: STRINGS.brand, title, description, url: themePath(lang, theme.slug) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ThemePage({ params }: PageProps<"/[lang]/themes/[slug]">) {
  const { lang, slug, page } = await loadThemePage(params);
  const shown = page === UNAVAILABLE ? UNAVAILABLE : await orUnavailable(() => themeGroupsOf(page, page.groups, lang));
  if (page === UNAVAILABLE || shown === UNAVAILABLE) return <UnavailablePage lang={lang} path={themeAddress(slug)} />;
  const { theme, category } = page;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={themeAddress(theme.slug)} />
      <main className={styles.page}>
        <ThemeHeader lang={lang} theme={theme} category={category} />
        <ThemeGroups lang={lang} groups={shown} />
      </main>
      <ThemeVisit slug={theme.slug} />
    </div>
  );
}
