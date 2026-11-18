// The website's design tokens (apps/web/src/app/globals.css, from the Option B
// mockup) as the app's colours (./colours.ts, picked by the system's
// appearance), typefaces and interface strings. The interface
// is English; Word meanings, Ayah translations and Root dialog meanings follow
// the Language, Urdu right to left in Dubai.

import { useColorScheme, type TextStyle } from "react-native";
import { DARK, LIGHT, type Colors } from "./colours";
import type { Language, Script } from "./quran-analysis";

export type { Colors };

/** The colours for the system's light or dark appearance. */
export const useColors = (): Colors => (useColorScheme() === "dark" ? DARK : LIGHT);

/** The typefaces expo-font loads (app/_layout.tsx), by the family name the styles use. */
export const TYPEFACE = { uthmani: "UthmanicHafs", indopak: "DigitalKhattIndoPak", urdu: "Dubai" } as const;

/** Each Script's typeface and how much larger and more widely spaced its text is set (globals.css's --q-size, --q-lh). */
const SCRIPT_TYPE: Record<Script, { fontFamily: string; size: number; lineHeight: number }> = {
  uthmani: { fontFamily: TYPEFACE.uthmani, size: 1, lineHeight: 1.75 },
  indopak: { fontFamily: TYPEFACE.indopak, size: 1.06, lineHeight: 2.05 },
};

/** Quranic text of `px` points in `script`, scaled by `scale` (Arabic size, or 1). */
export function quranText(script: Script, px: number, scale = 1): TextStyle {
  const { fontFamily, size, lineHeight } = SCRIPT_TYPE[script];
  const fontSize = px * size * scale;
  return { fontFamily, fontSize, lineHeight: fontSize * lineHeight, writingDirection: "rtl" };
}

/** How text in `language` is aligned: Urdu to the right. */
export const alignFor = (language: Language): TextStyle["textAlign"] => (language === "ur" ? "right" : "left");

/** Text in the Language: `px` points (Urdu one point larger), scaled by Meaning size, in its direction. */
export function inLanguage(language: Language, px: number, scale: number, urduExtra = 0): TextStyle {
  if (language === "en") return { fontSize: px * scale, lineHeight: px * scale * 1.55, writingDirection: "ltr" };
  const fontSize = (px + urduExtra) * scale;
  // Dubai's own line box (hhea ascent + descent) is 1.69 em; 1.75 gives it a little room.
  return { fontFamily: TYPEFACE.urdu, fontSize, lineHeight: fontSize * 1.75, writingDirection: "rtl" };
}

export const STRINGS = {
  brand: "Saaliheen",
  makki: "Meccan",
  madani: "Medinan",
  ayahCount: (n: number) => `${n.toLocaleString("en-US")} ayahs`,
  ayah: (n: number) => `Ayah ${n}`,
  /** A Tafsir entry's Ayahs (#236): "Ayah 5", or "Ayahs 3–4". */
  continueReading: "Continue reading",
  /** Under a Reading place's Surah on the Surah index (#193): "Continue at 36:25". */
  continueAt: (surah: number, ayah: number) => `Continue at ${surah}:${ayah}`,
  /** The Surah index's tabs and its one search box (#193). */
  indexTabs: "Find by",
  surahsTab: "Surahs",
  juzTab: "Juz",
  juz: (n: number) => `Juz ${n}`,
  searchIndex: "Search Surahs and Juz",
  searchPlaceholder: "Search by name or number",
  /** Read out on the Juz row holding the latest Reading place (#193). */
  latestReadingPlace: "latest Reading place",
  /** An Ayah by its Surah's name, as a Continue reading row shows it: "Al-Kahf · Ayah 45". */
  ayahOf: (surahName: string, n: number) => `${surahName} · ${STRINGS.ayah(n)}`,
  noMeaning: "—",
  noLemma: "—",
  settings: "Settings",
  scriptLabel: "Arabic script",
  uthmani: "Uthmani",
  indopak: "Indo-Pak",
  translation: "Ayah translation",
  /** The switch that shows Allah references in gold, or not (#151). */
  allahReferenceColour: "Allah reference colour",
  /** The switch that leaves Word meanings off the Word cards until tapped (#247). */
  hideWordMeanings: "Hide Word meanings",
  /** The switch that tints Known Roots' Word cards green, or not (#253). */
  knownWordsColour: "Known words colour",
  arabicSize: "Arabic size",
  meaningSize: "Meaning size",
  smaller: "Smaller",
  larger: "Larger",
  percent: (n: number) => `${n}%`,
  resetSizes: "Reset sizes",
  /** The Section marks setting (#194), in the website's words. */
  sectionMarks: "Section marks",
  hizbQuarters: "Hizb quarters",
  rukus: "Rukus",
  close: "Close",
  rootLabel: "Root",
  rootCounts: (o: number, u: number) => `${o} occurrences · ${u} unique words`,
  lemmasTitle: "Lemmas",
  /** Read out on the Root dialog's marked Lemma row (#323), which the reader sees by its tint. */
  thisWordsLemma: "This Word's Lemma",
  /** The Particle dialog's words (#255), as on the website. */
  particleLabel: "Particle",
  particleCount: (o: number) => `${o} occurrences`,
  spellingsTitle: "Spellings",
  times: (n: number) => `${n}×`,
  loadFailed: "This could not be loaded. Check your connection and try again.",
  retry: "Retry",
  listen: "Listen",
  recitation: "Recitation",
  recitationBar: "Recitation bar",
  play: "Play",
  pause: "Pause",
  /** Sharing Ayahs (#76), in the website's words: an Ayah's and a Passage heading's share buttons, the Surah bar's "Share Ayahs", the edit strip and Share. */
  shareAyah: (ayah: string) => `Share Ayah ${ayah}`,
  sharePassage: (passage: string) => `Share Passage ${passage}`,
  shareAyahs: "Share Ayahs",
  chooseAyahsToShare: "Choose Ayahs to share",
  surah: "Surah",
  fromAyah: "From Ayah",
  toAyah: "To Ayah",
  shareLayout: "Share layout",
  ayahByAyah: "Ayah by Ayah",
  flowing: "Flowing",
  share: "Share",
  /** A Share page link naming Ayahs that may not be shared, or none. */
  shareNotFound: "This Share page could not be found.",
  /** Beside an Ayah's number (#114). */
  listenFrom: (ayah: number) => `Listen from Ayah ${ayah}`,
  /** Shown while the screen has stopped following the Recited Word (#114). */
  backToRecitedWord: "Back to the Recited Word",
  /** The Recitation bar's buttons and what it says (#114). */
  previousAyah: "Previous Ayah",
  nextAyah: "Next Ayah",
  stop: "Stop",
  tryAgain: "Try again",
  recitationSpeed: (speed: number) => `Recitation speed ${STRINGS.times(speed)}`,
  recitationLoading: "Loading…",
  recitationUnavailable: "Recitation unavailable right now",
  /** The update prompt (#73), shown when this app's version is below the manifest's minAppVersion. */
  updateTitle: "Update Saaliheen",
  updateBody: "This version of the app is no longer supported. Update Saaliheen from your app store to keep reading the latest Surahs.",
  notNow: "Not now",
  /** A placeholder Ayah in a Surah's skeleton while the Surah downloads (#73). */
  ayahDownloading: (n: number) => `${STRINGS.ayah(n)}, downloading`,
};
