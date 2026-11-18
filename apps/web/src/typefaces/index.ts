// Typefaces (#1 § Design, ADR 0002). Each exposes a CSS variable that the
// tokens in globals.css read. A face downloads only when text uses it, so
// neither the Urdu face nor either Script's face is preloaded: only what the
// page shows downloads.
// This is next/font's "font definitions file": the one place a typeface is
// declared. The Script fonts are typeface files committed under data/qul/fonts
// (#1 § Fonts), not Quran data; pages still get all Quran data from the reader.
// The Urdu face, Dubai Regular (#339, the Dubai Executive Council's), is served
// by the site itself as WOFF2 from beside this module.

import { IBM_Plex_Sans } from "next/font/google";
import localFont from "next/font/local";

/**
 * Every piece of Urdu, on reader and admin pages alike: Word meanings, Ayah
 * translations, Tafsir, Root dialog meanings, Passage titles, Themes and their
 * categories, Speakers, and the اردو switch. Dubai Regular, a Naskh face.
 */
export const urdu = localFont({
  src: "./Dubai-Regular.woff2",
  variable: "--font-urdu",
  preload: false,
});

/** The interface, and English Word meanings and translations. */
export const plex = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex",
});

/** The Uthmani Script's own typeface: QPC Hafs, from the committed QUL sources. */
export const qpcHafs = localFont({
  src: "../../data/qul/fonts/UthmanicHafs_V22.woff2",
  variable: "--font-qpc-hafs",
  display: "block",
  preload: false,
});

/** The Indo-Pak Script's own typeface: Digital Khatt Indopak, from the committed QUL sources. */
export const digitalKhattIndopak = localFont({
  src: "../../data/qul/fonts/DigitalKhattIndoPak.otf",
  variable: "--font-digital-khatt-indopak",
  display: "block",
  preload: false,
});
