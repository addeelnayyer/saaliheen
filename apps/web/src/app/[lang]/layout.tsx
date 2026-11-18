// Root layout, one per Language. Language comes only from the URL (/ur, /en)
// and chooses only the language of the Word meanings, Ayah translations, Root
// dialog meanings and Speakers' names; the interface, and so <html lang dir>,
// is always English, left to right. The
// reader settings come from browser storage: an inline script in <head> puts
// them on <html> before <body> is parsed, so the first paint already has them.
// A signed-in browser then applies its Account's Script and Language (#70).

import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL } from "@saaliheen/share";
import { digitalKhattIndopak, plex, qpcHafs, urdu } from "@/typefaces";
import { SettingsSync } from "./settings-sync";
import { PRE_PAINT_SCRIPT } from "./settings";
import { STRINGS } from "./strings";
import "../globals.css";

// No params here: a layout's params bind every page below it, and the pages
// that read Neon (#170: the Themes list, Explore) have none of their own to
// leave out, so they would be prerendered, which the build cannot do without a
// database (ADR 0020). Each page prerendered in both Languages says so itself
// (./language-params.ts) with `dynamicParams = false`, so any other Language
// is a 404; any other page takes any params and leaves any other Language not
// found itself (ADR 0024).

// Addresses in metadata (such as a Link preview picture's, #57) are on the production site, wherever the page is served.
export const metadata: Metadata = { title: STRINGS.brand, metadataBase: new URL(SITE_URL) };

export default function LanguageLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${urdu.variable} ${plex.variable} ${qpcHafs.variable} ${digitalKhattIndopak.variable}`}
      // The pre-paint script adds the settings' data attributes before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <SettingsSync />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
