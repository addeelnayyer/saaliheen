// Root layout of the site's documents, the privacy policy and the terms (#50),
// at the addresses without a Language that sign-in setups name: outside /ur and
// /en, in English, under the brand alone. A reader reaches them in their
// Language instead ([lang]/privacy, [lang]/terms, #192). The reader's saved
// theme still applies, through the same pre-paint script.

import type { Metadata } from "next";
import { digitalKhattIndopak, plex, qpcHafs } from "@/typefaces";
import { PRE_PAINT_SCRIPT } from "../[lang]/settings";
import { STRINGS } from "../[lang]/strings";
import "../globals.css";

export const metadata: Metadata = { title: STRINGS.brand };

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${plex.variable} ${qpcHafs.variable} ${digitalKhattIndopak.variable}`}
      // The pre-paint script adds the settings' data attributes before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
