// A Theme page opened from inside the app (#131): the same page as the Theme
// page, but only its first Theme part is in it, and the rest fill in part by
// part in the browser, so it opens at once. The rewrite in next.config.ts
// serves this for the app's own requests for /<lang>/themes/<slug>, as it does
// for a Surah (ADR 0005, 0014); a direct load, a reload or a search engine
// still gets the whole Theme page (../../themes/[slug]/page.tsx). Its Theme is
// read from Neon (#170, src/themes/); it is rendered on its first request, not
// at build, then served from the cache (ADR 0020), and is the error page when
// Neon cannot answer.

import type { Metadata } from "next";
import { themePartOf } from "@/themes/on-pages";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { SiteBar } from "../../../site-bar";
import { STRINGS } from "../../../strings";
import { UNAVAILABLE_METADATA, UnavailablePage } from "../../../unavailable-page";
import indexStyles from "../../../index.module.css";
import { themeAddress } from "../../../themes/theme-path";
import { loadThemePage } from "../../../themes/[slug]/load-theme-page";
import { ThemeHeader } from "../../../themes/[slug]/theme-header";
import { ThemeInParts } from "./theme-in-parts";

// Any params reach the page, and loadThemePage leaves any but a Language and a
// Theme's slug not found (ADR 0024); none is rendered at build (ADR 0020).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string; slug: string }[] => [];

export async function generateMetadata({ params }: PageProps<"/[lang]/opening/themes/[slug]">): Promise<Metadata> {
  const { lang, page } = await loadThemePage(params);
  if (page === UNAVAILABLE) return UNAVAILABLE_METADATA;
  const { theme } = page;
  // The whole Theme page is the one to index; this is only ever reached by its address through the rewrite.
  return { title: `${theme[lang]} · ${STRINGS.brand}`, robots: { index: false } };
}

export default async function OpeningThemePage({ params }: PageProps<"/[lang]/opening/themes/[slug]">) {
  const { lang, slug, page } = await loadThemePage(params);
  const first = page === UNAVAILABLE ? UNAVAILABLE : await orUnavailable(() => themePartOf(page, lang, 1));
  if (page === UNAVAILABLE || first === UNAVAILABLE) return <UnavailablePage lang={lang} path={themeAddress(slug)} />;
  const { theme, category } = page;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={themeAddress(theme.slug)} />
      <ThemeInParts
        // A new Language is a new load.
        key={lang}
        lang={lang}
        slug={theme.slug}
        first={first ?? []}
        partCount={page.parts.length}
        ayahCount={theme.ayahCount}
      >
        <ThemeHeader lang={lang} theme={theme} category={category} />
      </ThemeInParts>
    </div>
  );
}
