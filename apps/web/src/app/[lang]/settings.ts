// Reader settings: Script, Ayah translation, theme, Arabic size, Meaning
// size, Phrase colours, Allah reference colour, Known words colour, Hide Word meanings, the Ayah layout and Section marks. Each is stored in the browser (never in the URL), shared across
// Languages, and shown as a data attribute on <html> that the CSS reads:
//   data-script        uthmani | indopak        (always set)
//   data-translation   on | off                 (always set; absent reads as off)
//   data-theme         light | dark             (absent: follow the system)
//   data-arabic-size   85 | 100 | 115 | 130 | 150   (always set)
//   data-meaning-size  85 | 100 | 115 | 130 | 150   (always set)
//   data-phrase-colours on | off               (always set; anything stored but "off" reads as on)
//   data-allah-reference-colour on | off       (always set; anything stored but "off" reads as on)
//   data-known-words-colour on | off           (always set; anything stored but "on" reads as off)
//   data-hide-word-meanings on | off           (always set; anything stored but "on" reads as off)
//   data-ayah-layout   study | flowing          (always set; anything stored but "flowing" reads as Study)
//   data-section-marks hizb | ruku              (always set; anything stored but "ruku" reads as Hizb quarters)
// PRE_PAINT_SCRIPT sets them from storage while <head> is parsed, before any
// of <body> exists, so nothing paints in the wrong state; it also writes the
// Known words' tint from the stored Known words (known-words-tint.ts). A
// choice is saved with storage.ts's store.

import { showSignedIn, SIGNED_IN_ATTRIBUTE, SIGNED_IN_COOKIE } from "@/account/signed-in-mark";
import type { Script } from "@/dataset/reader";
import { KNOWN_WORDS_STORED_AS, KNOWN_WORDS_STYLE, knownWordsStyle, paintKnownWords } from "./known-words-tint";
import { readStored } from "./storage";

export type Theme = "system" | "light" | "dark";

/** A data-script value as a Script: anything but "indopak" reads as Uthmani. */
export const parseScript = (value: string | null): Script => (value === "indopak" ? "indopak" : "uthmani");

/** The Script the page shows now, from <html>. */
export const currentScript = () => parseScript(document.documentElement.getAttribute("data-script"));

/** The steps of Arabic size and Meaning size, in percent. */
export const SIZES = [85, 100, 115, 130, 150] as const;
type Size = (typeof SIZES)[number];
/** The size a reader starts at, and what a missing or unknown stored size reads as. */
export const DEFAULT_SIZE: Size = 100;

/** The browser storage name of each setting. */
export const STORED_AS = {
  script: "qwt-script",
  translation: "qwt-translation",
  theme: "qwt-theme",
  arabicSize: "qwt-arabic-size",
  meaningSize: "qwt-meaning-size",
  phraseColours: "qwt-phrase-colours",
  allahReferenceColour: "qwt-allah-reference-colour",
  knownWordsColour: "qwt-known-words-colour",
  hideWordMeanings: "qwt-hide-word-meanings",
  ayahLayout: "qwt-ayah-layout",
  sectionMarks: "qwt-section-marks",
} as const;

/** Quran Analysis's two Ayah layouts (#125): Study, the Word cards, where every reader starts, and Flowing. */
export const AYAH_LAYOUTS = ["study", "flowing"] as const;
export type AyahLayout = (typeof AYAH_LAYOUTS)[number];

/** A data-ayah-layout value as an Ayah layout: anything but "flowing" reads as Study. */
export const parseAyahLayout = (value: string | null): AyahLayout => (value === "flowing" ? "flowing" : "study");

/** Section marks (#194, ADR 0020): Hizb quarters, where every reader starts, or Rukus. Kept per device, never on the Account. */
export const SECTION_MARKS = ["hizb", "ruku"] as const;
export type SectionMarksMode = (typeof SECTION_MARKS)[number];

/** A data-section-marks value as Section marks: anything but "ruku" reads as Hizb quarters. */
export const parseSectionMarks = (value: string | null): SectionMarksMode => (value === "ruku" ? "ruku" : "hizb");

/** The <html> attribute of each size setting. */
export const SIZE_ATTRIBUTE = { arabicSize: "data-arabic-size", meaningSize: "data-meaning-size" } as const;
export type SizeSetting = keyof typeof SIZE_ATTRIBUTE;

/** A size attribute's value as a step; anything else reads as the default. */
export const parseSize = (value: string | null): Size => SIZES.find((s) => String(s) === value) ?? DEFAULT_SIZE;

/**
 * Put the stored settings on <html>. Self-contained (it references nothing
 * outside itself) so it can also run as an inline script; storage can be
 * missing or throw (private mode, blocked site data).
 */
function apply(names: typeof STORED_AS, sizes: { steps: readonly number[]; fallback: number; attributes: typeof SIZE_ATTRIBUTE }) {
  const read = (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  };
  const html = document.documentElement;
  // A two-valued setting: `chosen` when stored as such, else `otherwise`.
  const pick = (name: string, chosen: string, otherwise: string) => (read(name) === chosen ? chosen : otherwise);
  // parseScript's rule, repeated here because this function must stay self-contained.
  html.setAttribute("data-script", pick(names.script, "indopak", "uthmani"));
  html.setAttribute("data-translation", pick(names.translation, "on", "off"));
  html.setAttribute("data-phrase-colours", pick(names.phraseColours, "off", "on"));
  html.setAttribute("data-allah-reference-colour", pick(names.allahReferenceColour, "off", "on"));
  html.setAttribute("data-known-words-colour", pick(names.knownWordsColour, "on", "off"));
  html.setAttribute("data-hide-word-meanings", pick(names.hideWordMeanings, "on", "off"));
  // parseAyahLayout's rule, repeated for the same reason.
  html.setAttribute("data-ayah-layout", pick(names.ayahLayout, "flowing", "study"));
  // parseSectionMarks's rule, likewise.
  html.setAttribute("data-section-marks", pick(names.sectionMarks, "ruku", "hizb"));
  const theme = read(names.theme);
  if (theme === "light" || theme === "dark") html.setAttribute("data-theme", theme);
  else html.removeAttribute("data-theme");
  const size = (name: string) => {
    const stored = read(name);
    return sizes.steps.some((s) => String(s) === stored) ? stored! : String(sizes.fallback);
  };
  for (const [setting, attribute] of Object.entries(sizes.attributes)) {
    html.setAttribute(attribute, size(names[setting as keyof typeof sizes.attributes]));
  }
}

/** apply()'s size steps, fallback and attributes, passed in so it stays self-contained. */
const SIZE_ARGUMENTS = { steps: SIZES, fallback: DEFAULT_SIZE, attributes: SIZE_ATTRIBUTE };

export const applyStored = () => {
  apply(STORED_AS, SIZE_ARGUMENTS);
  showSignedIn(SIGNED_IN_COOKIE, SIGNED_IN_ATTRIBUTE);
};

/**
 * applyStored as a small synchronous script for <head>; it also shows the
 * signed-in mark (#192) and, while Known words colour is on, writes the Known
 * words' tint (#250, #251). Off, the tint waits for KeepStoredSettings, before the
 * switch can be turned on.
 */
export const PRE_PAINT_SCRIPT =
  `(${apply.toString()})(${JSON.stringify(STORED_AS)},${JSON.stringify(SIZE_ARGUMENTS)});` +
  `(${showSignedIn.toString()})(${JSON.stringify(SIGNED_IN_COOKIE)},${JSON.stringify(SIGNED_IN_ATTRIBUTE)});` +
  `document.documentElement.getAttribute("data-known-words-colour")==="on"&&` +
  `(${paintKnownWords.toString()})(${JSON.stringify(KNOWN_WORDS_STYLE)},(${knownWordsStyle.toString()})((${readStored.toString()})(${JSON.stringify(KNOWN_WORDS_STORED_AS)})))`;
