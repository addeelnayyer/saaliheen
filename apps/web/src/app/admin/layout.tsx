// The admin area's own root layout (#42), outside the reading site's [lang]
// layouts: an English, left-to-right page in the site's interface typeface and
// tokens, never indexed by search engines (next.config.ts adds an X-Robots-Tag
// header too). Its pages read the session, so they render on demand. The
// Passage editor (#44) shows Ayahs in the Script this browser chose, so the
// reader settings' pre-paint script puts the stored settings on <html> here too.

import type { Metadata } from "next";
import { digitalKhattIndopak, plex, qpcHafs, urdu } from "@/typefaces";
import { PRE_PAINT_SCRIPT } from "../[lang]/settings";
import "../globals.css";

export const metadata: Metadata = {
  title: "Saaliheen admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
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
      <body>{children}</body>
    </html>
  );
}
