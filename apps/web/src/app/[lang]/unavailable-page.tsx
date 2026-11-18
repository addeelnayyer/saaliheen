// The error page in place of a whole page that reads Neon (#170) when Neon
// cannot answer and the page is not in the cache (ADR 0020,
// src/themes/unavailable.ts): the page's bars, so the reader can go elsewhere,
// and the message with Retry. Never indexed: its own robots meta tag, which
// React puts in the head, keeps every page that draws it out of search
// engines, whatever that page's metadata says (ADR 0040).

import type { Metadata } from "next";
import type { Language } from "@/dataset/reader";
import { PageUnavailable } from "./page-unavailable";
import { SiteBar } from "./site-bar";
import { STRINGS } from "./strings";
import indexStyles from "./index.module.css";

/** The error page's metadata: the site's name, never indexed. */
export const UNAVAILABLE_METADATA: Metadata = { title: STRINGS.brand, robots: { index: false } };

/** The error page for the page at `path` (after the Language) in `lang`. */
export function UnavailablePage({ lang, path }: { lang: Language; path: string }) {
  return (
    <div className={indexStyles.app}>
      <meta name="robots" content="noindex" />
      <SiteBar lang={lang} path={path} />
      <main>
        <PageUnavailable />
      </main>
    </div>
  );
}
