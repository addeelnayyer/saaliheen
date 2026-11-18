// Shared helpers for seam 2. Expected Arabic and Word meanings are read from
// the committed QUL sources here, never typed (CONTRACT § Scripture).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test";

/** The website's own folder, apps/web. */
const WEB = path.join(__dirname, "..", "..");
/** The committed sources, apps/web/data. */
export const DATA = path.join(WEB, "data");
const QUL = path.join(DATA, "qul");

type TextSource = Record<string, { location: string; text: string }>;
type MeaningSource = Record<string, string>;
type SurahMeta = Record<string, { verses_count: number; bismillah_pre: boolean }>;

const cache = new Map<string, unknown>();
function readSource<T>(name: string): T {
  if (!cache.has(name)) cache.set(name, JSON.parse(fs.readFileSync(path.join(QUL, name), "utf8")));
  return cache.get(name) as T;
}

/** One Ayah of the Recitation source (#115): its Word timings, `[word, start ms, end ms]`, and where it starts and ends in its Surah's audio. */
export interface SourceRecitedAyah {
  from: number;
  to: number;
  /** In the order the Reciter says them: by start. */
  timings: [number, number, number][];
}

type RecitationSource = Record<string, { segments: [number, number, number][]; timestamp_from: number; timestamp_to: number }>;

/** Ayah `s:a` as the committed Recitation source times it (#115). */
export function sourceRecitedAyah(ayah: string): SourceRecitedAyah {
  const entry = readSource<RecitationSource>("yasser-ad-dussary-surah-by-surah.json")[ayah];
  return { from: entry.timestamp_from, to: entry.timestamp_to, timings: entry.segments.toSorted((x, y) => x[1] - y[1]) };
}

export type Language = "ur" | "en";
export const LANGUAGES: Language[] = ["ur", "en"];

export interface SourceWord {
  location: string;
  uthmani: string;
  meaning: Record<Language, string>;
}

// In the QPC Hafs text an Ayah-end marker is the Ayah number in Arabic-Indic
// digits; it is not a Word (#1 § Data rules).
const isAyahEnd = (text: string) => /^[٠-٩]+$/.test(text);

/** A QPC Hafs Word's text as the reader shows it (ADR 0020): without the printed ۞ and the space after it. */
const withoutHizbSign = (text: string) => text.replace(/^۞ /, "");
/** A Digital Khatt Ayah-end text as the reader shows it (ADR 0020): without the Ruku sign U+08D6. */
const withoutRukuSign = (text: string) => text.replaceAll("\u08d6", "");

let bySurah: Map<number, SourceWord[]> | undefined;
/** The Words of one Surah in reading order, from the sources, less the printed ۞ (ADR 0020). */
export function sourceWords(surah: number): SourceWord[] {
  if (!bySurah) {
    bySurah = new Map();
    const uthmani = readSource<TextSource>("qpc-hafs-word-by-word.json");
    const ur = readSource<MeaningSource>("urud-wbw.json");
    const en = readSource<MeaningSource>("english-wbw-translation.json");
    for (const { location, text } of Object.values(uthmani)) {
      if (isAyahEnd(text)) continue;
      const s = Number(location.split(":")[0]);
      if (!bySurah.has(s)) bySurah.set(s, []);
      bySurah.get(s)!.push({ location, uthmani: withoutHizbSign(text), meaning: { ur: ur[location], en: en[location] } });
    }
    const parts = (location: string) => location.split(":").map(Number);
    for (const words of bySurah.values()) {
      words.sort((a, b) => {
        const [, a1, w1] = parts(a.location);
        const [, a2, w2] = parts(b.location);
        return a1 - a2 || w1 - w2;
      });
    }
  }
  return bySurah.get(surah) ?? [];
}

export function sourceWord(location: string): SourceWord {
  const word = sourceWords(Number(location.split(":")[0])).find((w) => w.location === location);
  if (!word) throw new Error(`no Word ${location} in the sources`);
  return word;
}

/**
 * Ayah `s:a`'s Ayah-end entry in a Script's source: QPC Hafs's Ayah number
 * (Arabic-Indic digits), or Digital Khatt's end-of-Ayah sign with its own
 * numbering and any marks on it, less the Ruku sign ADR 0020 removes.
 */
export function sourceAyahEnd(ayah: string, script: "uthmani" | "indopak"): string {
  const uthmani = readSource<TextSource>("qpc-hafs-word-by-word.json");
  const marker = ayahEndMarkers().get(ayah);
  if (!marker) throw new Error(`no Ayah-end marker for ${ayah} in the sources`);
  return script === "uthmani" ? uthmani[marker].text : withoutRukuSign(indopakText(marker));
}

let endMarkers: Map<string, string> | undefined;
/** Each Ayah's end marker's location in the QPC Hafs text, by `s:a`: the first such entry in the source's order. Indexed once, not searched per Ayah. */
function ayahEndMarkers(): Map<string, string> {
  if (!endMarkers) {
    endMarkers = new Map();
    const uthmani = readSource<TextSource>("qpc-hafs-word-by-word.json");
    for (const l of Object.keys(uthmani)) {
      const ayah = l.split(":").slice(0, 2).join(":");
      if (isAyahEnd(uthmani[l].text) && !endMarkers.has(ayah)) endMarkers.set(ayah, l);
    }
  }
  return endMarkers;
}

/** The Indo-Pak Script's text of one Word, from Digital Khatt Indopak (ADR 0002). */
export function indopakText(location: string): string {
  const entry = readSource<TextSource>("digital-khatt-indopak.json")[location];
  if (!entry) throw new Error(`no Indo-Pak text for ${location} in the sources`);
  return entry.text;
}

/**
 * An Ayah translation (`s:a`) as the reader should show it: Jalandhari in
 * Urdu, Saheeh International in English with its inline [[…]] footnotes
 * removed (#1 § Ayah translation). Read from the committed sources.
 */
export function ayahTranslation(ayah: string, lang: Language): string {
  type TranslationSource = Record<string, { t: string }>;
  const name = lang === "ur" ? "ur-fatah-muhammad-jalandhari-simple.json" : "en-sahih-international-inline-footnotes.json";
  const entry = readSource<TranslationSource>(name)[ayah];
  if (!entry) throw new Error(`no ${lang} Ayah translation for ${ayah} in the sources`);
  return lang === "ur" ? entry.t : entry.t.replace(/\[\[[\s\S]*?\]\]/g, "").replace(/\s+/g, " ").trim();
}

export function surahMeta(surah: number) {
  return readSource<SurahMeta>("quran-metadata-surah-name.json")[String(surah)];
}

export interface SourceSurah {
  number: number;
  nameArabic: string;
  nameLatin: string;
  revelationPlace: "makki" | "madani";
  ayahCount: number;
}

/**
 * All 114 Surahs in order: number, names and Makki/Madani from QUL's Surah
 * metadata; the Ayah count is the last Ayah number among the Surah's Word
 * locations in the QPC Hafs text, so it also cross-checks the metadata.
 */
let surahs: SourceSurah[] | undefined;
export function sourceSurahs(): SourceSurah[] {
  if (surahs) return surahs;
  type Entry = { id: number; name_arabic: string; name_simple: string; revelation_place: string };
  const lastAyah = (surah: number) => Math.max(...sourceWords(surah).map((w) => Number(w.location.split(":")[1])));
  surahs = Object.values(readSource<Record<string, Entry>>("quran-metadata-surah-name.json"))
    .map((e) => ({
      number: e.id,
      nameArabic: e.name_arabic,
      nameLatin: e.name_simple,
      revelationPlace: e.revelation_place === "madinah" ? ("madani" as const) : ("makki" as const),
      ayahCount: lastAyah(e.id),
    }))
    .sort((a, b) => a.number - b.number);
  return surahs;
}

// Interface strings (src/app/[lang]/strings.ts), English in every Language.
// Typed here, not imported, so the tests stay independent of the app; the
// Language switch's links keep each Language's own name (steps/reader.ts).
const bare = (s: string) => new RegExp(`^[^\\p{L}]*${s}[^\\p{L}]*$`, "u"); // allows the arrows
/** A link named by `s` and then, as the Surah's foot names its neighbours since #192, anything after ("Next → 3. Al-Imran"). */
const leading = (s: string) => new RegExp(`^[^\\p{L}]*${s}(?!\\p{L})`, "u");
export const STRINGS = {
  brand: "Saaliheen",
  prev: leading("Previous"),
  next: leading("Next"),
  index: bare("Index"),
  ayah: (n: number) => `Ayah ${n}`,
  ayahCount: (n: number) => `${n} ayahs`,
  makki: "Meccan",
  madani: "Medinan",
  script: "Arabic script",
  uthmani: "Uthmani",
  indopak: "Indo-Pak",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  translation: "Ayah translation",
  close: "Close",
  /** The Particle dialog's label (#249). */
  particleLabel: "Particle",
  /** The Surah bar's Reading settings button and the sheet it opens (#192). */
  settings: "Reading settings",
  arabicSize: "Arabic size",
  meaningSize: "Meaning size",
  smaller: "Smaller",
  larger: "Larger",
  resetSizes: "Reset sizes",
  phraseColours: "Phrase colours",
  /** The Settings drawer's switch for Allah reference colour (#148), in the issue's words. */
  allahReferenceColour: "Allah reference colour",
  /** The reader settings' switch for Hide Word meanings (#256), and its note in Flowing. */
  hideWordMeanings: "Hide Word meanings",
  hideWordMeaningsNote: "Applies to Study",
  /** The reader settings' switch for Known words colour (#250), and the Phrase colours switch's note while it is on. */
  knownWordsColour: "Known words colour",
  phraseColoursKnownNote: "Off while Known words colour is on",
  /** A Word card's meaning when the sources give it none. */
  noMeaning: "—",
  /** Memorized? (#248), and a Root page's section of the Words with no Lemma (#287). */
  memorized: "Memorized?",
  lemmasTitle: "Lemmas",
  /** The Root dialog's Lemma row of the Word whose Root tag opened it, to a screen reader (#322). */
  thisWordsLemma: "this Word's Lemma",
  rootPage: "Root page",
  withoutLemma: "Without a Lemma",
  /** A large Root page's Spelling that could not be loaded (#288), and its Retry. */
  spellingPartFailed: "could not be loaded",
  retry: "Retry",
  noWordGrammar: "No Word grammar",
  /** The Grammar guide (#280), as the Grammar pages and Explore's Quran Grammar entry link to it. */
  grammarGuide: "Grammar guide",
  /** A Grammar page's Surah picker (#279), and the navigation at a Surah's foot (#192). */
  grammarPicker: "Go to a Surah",
  surahFoot: "Surahs",
  preview: "Preview",
  credits: "Credits",
  shareAyah: (ayah: string) => `Share Ayah ${ayah}`,
  copied: "Copied",
  copyFailed: "Couldn't copy",
  /** The Surah bar's play button, from whichever Ayah is at the top. */
  listenFrom: /^Listen from Ayah \d+$/,
  recitationBar: "Recitation",
  play: "Play",
  pause: "Pause",
  /** The Recitation bar's controls (#110). */
  previousAyah: "Previous Ayah",
  nextAyah: "Next Ayah",
  stopRecitation: "Stop the Recitation",
  recitationSpeed: "Recitation speed",
  recitationLoading: "Loading…",
  /** The issue's own words: the Recitation bar says the Recitation is unavailable right now. */
  recitationUnavailable: /unavailable right now/i,
  tryAgain: "Try again",
  /** Beside each Ayah's number, in its heading (#109): listens from that Ayah. */
  listenFromAyah: (ayah: string) => `Listen from Ayah ${ayah}`,
  /** Shown while the page has stopped following the Recited Word (#109). */
  backToRecitedWord: "Back to the Recited Word",
};

export const sha256 = (buf: Buffer | Uint8Array) => crypto.createHash("sha256").update(buf).digest("hex");
/**
 * The family a page's CSS sets `typeface` in. next/font/local names a face for
 * the export declaring it (src/typefaces), so Dubai is "urdu"; a Google face
 * keeps its own name.
 */
export const cssFamily = (typeface: string) => (typeface === "Dubai" ? "urdu" : typeface);

/** The committed font files: the Scripts' under data/qul/fonts, the Urdu typeface beside the typefaces module. */
const FONT_DIRS = [path.join(QUL, "fonts"), path.join(WEB, "src", "typefaces")];
export const fontFileHash = (name: string) => {
  const dir = FONT_DIRS.find((d) => fs.existsSync(path.join(d, name)));
  if (!dir) throw new Error(`no committed font file ${name}`);
  return sha256(fs.readFileSync(path.join(dir, name)));
};

/** The steps of Arabic size and Meaning size, in percent (src/app/[lang]/settings.ts). */
export const SIZE_STEPS = [85, 100, 115, 130, 150];

/** Whether a dialog says it is modal, with aria-modal (the site has no native <dialog>, #307). */
export const isModal = (dialog: Locator) => dialog.evaluate((el) => el.getAttribute("aria-modal") === "true");

/** Whether focus is on something inside `dialog`. */
export const focusInside = (dialog: Locator) =>
  dialog.evaluate((el) => document.activeElement !== document.body && el.contains(document.activeElement));

/** Click a point near the screen's edge that `dialog` does not cover. */
export async function clickOutside(dialog: Locator) {
  const page = dialog.page();
  const box = (await dialog.boundingBox())!;
  const { width, height } = page.viewportSize()!;
  const points = [
    [4, 4],
    [4, height - 4],
    [width - 4, 4],
    [width - 4, height - 4],
    [4, height / 2],
    [width / 2, 4],
  ];
  const outside = points.find(([x, y]) => x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height);
  if (!outside) throw new Error("the dialog covers the whole screen");
  await page.mouse.click(outside[0], outside[1]);
}

/** Every press in a focus trail (true: focus was inside the dialog) kept focus inside. */
export function expectFocusStayedInside(trail: boolean[] | undefined) {
  expect(trail?.length ?? 0).toBeGreaterThan(0);
  expect(trail!.map((inside, i) => (inside ? null : `press ${i + 1}`)).filter(Boolean), "presses that left the dialog").toEqual([]);
}

/**
 * Where `control` comes to rest: its box once it is the same over several
 * animation frames in a row, as a reader waits for a sliding bar to settle
 * before tapping. Gives up waiting after a second and takes the box as it is.
 */
const settledBox = (control: Locator) =>
  control.evaluate(
    (el, { frames, limit }) =>
      new Promise<{ x: number; y: number; width: number; height: number }>((done) => {
        const started = performance.now();
        let last = el.getBoundingClientRect();
        let still = 0;
        const step = () => {
          const now = el.getBoundingClientRect();
          const same = now.x === last.x && now.y === last.y && now.width === last.width && now.height === last.height;
          still = same ? still + 1 : 0;
          last = now;
          if (still >= frames || performance.now() - started > limit) done({ x: now.x, y: now.y, width: now.width, height: now.height });
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    { frames: 3, limit: 1000 },
  );

/**
 * Click an on-screen control where it is, as a reader's pointer does. A plain
 * Locator.click() first scrolls the control "into view", which for one in the
 * sticky bar scrolls the page toward the bar's place in the flow.
 */
export async function clickInPlace(control: Locator) {
  // On a Surah page read down, the control may be in the slid-off part of the
  // mini Surah bar: tap the bar's Surah name first, as a reader would, to show it.
  // The full bar slides back in: wait until the control is wholly on screen and
  // has stopped moving, or the click lands where the control was mid-slide.
  // A control already on screen is tapped where it is now: during a Recitation the
  // page follows the Recited Word, so it may never hold still, and waiting would let the audio run on.
  const slid = await control.evaluate((el) => el.closest('[data-form="mini"]') !== null);
  if (slid) {
    const names = control.page().locator('[data-form="mini"] [lang="ar"]').first();
    const box = (await names.boundingBox())!;
    await control.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(control).toBeInViewport({ ratio: 1 });
  }
  await expect(control).toBeInViewport();
  const box = slid ? await settledBox(control) : (await control.boundingBox())!;
  await control.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * A Word card, found by its Word location. The deep link `#s:a:w` targets the
 * card by that id, so the id is user-facing (CONTRACT § Two seams).
 */
export const card = (page: Page, location: string): Locator => page.locator(`[id="${location}"]`);

/**
 * A Word card shows no Word location: not as text, visible or for screen
 * readers only, and not in any attribute a reader sees or hears. Only the
 * card's own id and data-* attributes, such as its Root tag's data-location
 * (#322), may hold it (#35).
 */
export async function expectNoWordLocation(c: Locator, location: string) {
  const found = await c.evaluate((el, loc) => {
    if (el.textContent?.includes(loc)) return "its text";
    for (const node of [el, ...Array.from(el.querySelectorAll("*"))]) {
      for (const attr of Array.from(node.attributes)) {
        const allowed = (node === el && attr.name === "id") || attr.name.startsWith("data-");
        if (!allowed && attr.value.includes(loc)) return `${node.tagName}'s ${attr.name}`;
      }
    }
    return null;
  }, location);
  expect(found, `the Word card for ${location} shows its Word location`).toBeNull();
}

/**
 * Every Ayah on a Surah page, in page order: the sections in its <main> whose
 * id is its `surah:ayah`. Each Passage's Ayahs are grouped on the page (#125),
 * so an Ayah's section need not be a child of <main>; an Ayah's section holds
 * no other section with an id, which tells it from a group around several.
 */
export const ayahSections = (page: Page): Locator => page.locator("main section[id]:not(:has(section[id]))");

/**
 * The Ayah at the top of the screen, as `surah:ayah`. The same rule as the
 * Reading place tracker's and the Ayah layout switch's (src/app/[lang]/[surah]/ayah-at-top.ts).
 *
 * In Study, the first Ayah whose bottom is more than 4 pixels below the top of
 * the reading area: below the Surah bar as it is drawn. The page's scroll
 * padding clears the bar's mini form; its full form reaches further down by as
 * far as its slim row, the bar's last row, sits below the top of the screen.
 * The Ayahs abut, and a landing seats its Ayah only to within a pixel or so of
 * that line, so the end of the Ayah above never counts.
 *
 * In Flowing (#125) an Ayah's last Word can share its line with the next
 * Ayah's first Word, so the first line on screen may hold the end of one Ayah
 * and the start of the next: the Ayah at the top is the first Ayah whose first
 * Word is on the first line on screen, else the Ayah running through that
 * line. The page is taken to be Flowing when any Ayah's last Word shares its
 * line with the next Ayah's first Word, which Study's rows never do.
 */
export const ayahAtTop = (page: Page) =>
  ayahSections(page).evaluateAll((ayahs) => {
    const readingTop = () => {
      const row = document.querySelector('nav[aria-label="Surah"]');
      return (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + Math.max(0, row?.getBoundingClientRect().top ?? 0);
    };
    const top = readingTop();
    const wordsOf = (ayah: Element) => {
      const words: HTMLElement[] = [];
      for (let w = 1; document.getElementById(`${ayah.id}:${w}`); w++) words.push(document.getElementById(`${ayah.id}:${w}`)!);
      return words;
    };
    const sameLine = (a: Element, b: Element) => {
      const r = a.getBoundingClientRect();
      const q = b.getBoundingClientRect();
      return Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > Math.min(r.height, q.height) / 2;
    };
    // An Ayah section with no box of its own is placed by its last Word.
    const bottomOf = (ayah: Element) =>
      ayah.getClientRects().length > 0 ? ayah.getBoundingClientRect().bottom : (wordsOf(ayah).at(-1)?.getBoundingClientRect().bottom ?? -Infinity);
    const byBox = ayahs.findIndex((ayah) => bottomOf(ayah) > top + 4);
    // Only the Ayahs around the top of the screen are looked at, so a long Surah stays quick.
    const near = ayahs.slice(Math.max(0, byBox - 2), Math.max(0, byBox - 2) + 16);
    const words = near.map(wordsOf);
    const runsOn = words.some((ws, i) => i > 0 && ws.length > 0 && words[i - 1].length > 0 && sameLine(words[i - 1].at(-1)!, ws[0]));
    if (!runsOn) return byBox < 0 ? null : ayahs[byBox].id;
    const first = words.flat().find((w) => w.getBoundingClientRect().bottom > top + 4);
    if (!first) return null;
    const starting = near.find((ayah, i) => words[i].length > 0 && words[i][0].getBoundingClientRect().bottom > top + 4 && sameLine(words[i][0], first));
    return starting?.id ?? first.id.split(":").slice(0, 2).join(":");
  });

/** An Ayah on a Surah page, found by its `surah:ayah`, which is also its id: `#s:a` links to it. */
export const ayahSection = (page: Page, ayah: string): Locator => page.locator(`main section[id="${ayah}"]`);

/** The Surah index's search box. */
export const searchBox = (page: Page): Locator => page.getByRole("searchbox");

/** Every Word location that has a card on the page, in document order. */
export const cardLocations = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("[id]"))
      .map((el) => el.id)
      .filter((id) => /^\d+:\d+:\d+$/.test(id)),
  );

/** Urdu interface digits, as the mockup writes Ayah numbers (۱۲۳). */
export const urduDigits = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * Save a screenshot as DELIVERY evidence when SCREENS_DIR is set
 * (`AC-<n>-<what>-<light|dark>-<desktop|phone>.png`); a no-op otherwise.
 * Pass a Locator to capture just that part of the page.
 */
export async function shot(page: Page | Locator, name: string) {
  const dir = process.env.SCREENS_DIR;
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  // Transitions are finished first, so a setting just changed (a theme's colours easing in) shows as it ends.
  await page.screenshot({ path: path.join(dir, `${name}.png`), animations: "disabled" });
}

export const PHONE = { width: 390, height: 844 };

/** Lets two frames pass, so the page has drawn and its scroll and frame callbacks have run. */
export const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

/** As a browser with blocked site data: every use of localStorage or sessionStorage in `context` throws. */
export const blockStorage = (context: BrowserContext) =>
  context.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, name, {
        configurable: true,
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
    }
  });

/** Waits until React has taken over `l`, so a tap on it, typing into it or Enter on it is heard. */
export const hydrated = (l: Locator, message = "hydrated") =>
  expect.poll(() => l.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))), message).toBe(true);
