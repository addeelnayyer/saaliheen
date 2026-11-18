// Seam 2 step vocabulary: the parameter types every site step shares, one
// scenario's state (`reading`), and the learner's browser (`reader`): the page
// they are looking at (the test's own page until a step opens a fresh browser),
// their system colour scheme, and what an earlier visit saved.

import { createBdd, defineParameterType, test as base } from "playwright-bdd";
import { chromium, expect, type Browser, type BrowserContext, type BrowserContextOptions, type Locator, type Page } from "@playwright/test";
import type { Language } from "../support";
import type { FilePassage } from "./passages";
import { watchFirstPaint, type Script, type Theme } from "./reader";

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** What one scenario remembers between its steps. */
export interface Reading {
  /** The Language and Surah of the Surah page last opened. */
  lang?: Language;
  surah?: number;
  /** "desktop" (the project's 1280×720) or "phone" (390×844). */
  viewport: "desktop" | "phone";
  /** Bodies of every font the browser downloaded, once noted. */
  fonts: Buffer[];
  /** The mockup's colour tokens the scenario was given, by name. */
  tokens: Record<string, string>;
  /** Each index card's text, in Surah order, once noted. */
  cardTexts?: string[];
  /** What was last typed into the Surah index's search box. */
  query?: string;
  /** The HTTP status the last page opened answered with. */
  status?: number;
  /** The letters of the Root whose tag was last opened (#5). */
  root?: string;
  /** The Word location whose Particle tag was last opened (#249). */
  particle?: string;
  /** Every response the page received since a step started watching (#5). */
  responses?: SeenResponse[];
  /** After each key press of the last run of presses: whether focus was inside the Root dialog (#5). */
  focusTrail?: boolean[];
  /** Where the deep-linked Word card's top was on screen, before a step that must not move it. */
  targetTop?: number;
  /** Computed text sizes of named texts, noted before a size setting changed (#17). */
  sizes?: Record<string, number>;
  /** Where the page was, noted before a Root dialog opened over it (#20). */
  pageAt?: PageAt;
  /** How far the Root dialog was scrolled, once noted (#324). */
  dialogScrollTop?: number;
  /** Lets through the Root or Particle file a step is holding back (#324, #327). */
  letFileThrough?: () => void;
  /** The Word location of the Word last tapped on a Grammar page (#277). */
  grammarWord?: string;
  /** Where a Grammar page was, noted before a Word grammar dialog opened over it (#277). */
  grammarPageAt?: { y: number; width: number };
  /** Where the Sign-in page was, noted before the Delete Account confirmation opened over it (#301). */
  signInPageAt?: { y: number; width: number; titleX: number; buttonX: number };
  /** Every request the browser made to GitHub's or Google's sign-in, which a stub answered (#42). */
  providerRequests?: string[];
  /** The response a step fetched as this browser, after its redirects (#42). */
  fetched?: { url: string; status: number; headers: Record<string, string>; html: string };
  /** Each social sign-in the browser asked Better Auth to start, as the JSON it posted (#67). */
  socialSignIns?: string[];
  /** Someone new a step tried to sign in via GitHub, and when that was seen refused (#67). */
  newcomer?: { email: string; refusedAt?: number };
  /** The Account the site said this browser was signed in to, when a step noted it (#66). */
  account?: { id: string; email: string };
  /** This browser's cookies and storage, noted as if signed in on another device too (#68). */
  otherDevice?: StorageState;
  /** The address of a second server a step started (#42). */
  server?: string;
  /** Every Passage Neon holds, when a step changed them in the run's Postgres (#171); else as arranged (../passages-in-the-test-database.ts). */
  neon?: FilePassage[];
  /** A file of the published dataset a client fetched, with its bytes as text (#65). */
  file?: FetchedFile;
  /** Every Surah file the manifest in `file` lists, fetched in its order (#65). */
  surahFiles?: FetchedFile[];
  /** Two browsers signed in to the same Account, as a phone and a computer are (#70). */
  browsers?: { first: Page; second: Page };
}

/** A file a client fetched: its address, status, headers and bytes as text. */
export interface FetchedFile {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Where a Surah page is: its scroll position, its laid-out width, a Word card's place across it, the Surah bar's form and the stored Reading places. */
export interface PageAt {
  y: number;
  width: number;
  cardX: number;
  form: string | null;
  place: string | null;
}

/** A response the page received: its address, content type and body as text (empty for binary). */
export interface SeenResponse {
  url: string;
  contentType: string;
  text: string;
}

export class Reader {
  /** The page the learner is looking at. */
  page: Page;
  /** The system colour scheme the browser reports, when a step set one. */
  colorScheme: Theme | undefined;
  /** The browser storage an earlier visit left, for a fresh browser to start from. */
  saved: StorageState | undefined;
  /** The body of every font file the current page downloaded, when a fresh browser recorded them. */
  fonts: Buffer[] = [];
  /** Pages fetched from the server as a crawler would, path → their page text without scripts. */
  fetched = new Map<string, string>();
  /** Work to undo once the scenario ends, such as a server a step started. */
  cleanups: (() => Promise<void> | void)[] = [];
  private contexts: BrowserContext[] = [];
  private browsers: Browser[] = [];

  constructor(
    page: Page,
    private browser: Browser,
    readonly baseURL: string,
  ) {
    this.page = page;
  }

  /** The Language of the page on screen, from its URL (`/ur/1` → ur). */
  get language(): Language {
    const lang = new URL(this.page.url()).pathname.split("/")[1];
    if (lang !== "ur" && lang !== "en") throw new Error(`no Language in ${this.page.url()}`);
    return lang;
  }

  /** A throwaway browser context (empty storage, empty cache, made with `options`), closed after the scenario. */
  async newContext(storageState?: StorageState, options: BrowserContextOptions = {}) {
    const context = await this.browser.newContext({ baseURL: this.baseURL, storageState, colorScheme: this.colorScheme, ...options });
    this.contexts.push(context);
    return context;
  }

  /**
   * Open `path` in a fresh browser that starts from the saved storage and an
   * empty HTTP cache, recording every font file it downloads and <html>'s
   * settings at the moments that decide a flash.
   */
  async openFresh(path: string) {
    const context = await this.newContext(this.saved);
    const page = await context.newPage();
    this.fonts = [];
    page.on("response", async (res) => {
      if (res.request().resourceType() === "font") this.fonts.push(await res.body().catch(() => Buffer.alloc(0)));
    });
    await watchFirstPaint(page);
    this.page = page;
    await page.goto(path);
  }

  /**
   * Open `path` on a desktop whose scrollbars take up room beside the page, as
   * Windows' do (#20), starting from `storageState` (a sign-in, #301) when given. The test browser hides its scrollbars and a Mac
   * overlays them, so this is its own browser, showing them, with the page's
   * scrollbar styled to take up room.
   */
  async openWithScrollbars(path: string, storageState?: StorageState) {
    const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    this.browsers.push(browser);
    const page = await browser.newPage({ baseURL: this.baseURL, viewport: { width: 1280, height: 720 }, storageState });
    await page.addInitScript(() =>
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "::-webkit-scrollbar { width: 15px; } ::-webkit-scrollbar-thumb { background: #888; }";
        document.head.append(style);
      }),
    );
    this.page = page;
    await page.goto(path);
  }

  async close() {
    for (const cleanup of this.cleanups) await cleanup();
    for (const context of this.contexts) await context.close();
    for (const browser of this.browsers) await browser.close();
  }
}

export const test = base.extend<{ reading: Reading; reader: Reader }>({
  reading: async ({}, provide) => provide({ viewport: "desktop", fonts: [], tokens: {} }),
  reader: async ({ page, browser, baseURL }, provide) => {
    const reader = new Reader(page, browser, baseURL!);
    await provide(reader);
    await reader.close();
  },
});

defineParameterType({
  name: "language",
  regexp: /Urdu|English/,
  transformer: (name: string): Language => (name === "Urdu" ? "ur" : "en"),
});

// A Word location, `surah:ayah:word` (e.g. 2:255:3).
defineParameterType({
  name: "location",
  regexp: /\d+:\d+:\d+/,
  transformer: (location: string) => location,
});

defineParameterType({
  name: "script",
  regexp: /Uthmani|Indo-Pak/,
  transformer: (s: string): Script => (s === "Uthmani" ? "uthmani" : "indopak"),
});

defineParameterType({
  name: "theme",
  regexp: /light|dark|Light|Dark/,
  transformer: (s: string): Theme => s.toLowerCase() as Theme,
});

/** Shared Ayahs (#55): Ayahs `from` to `to` of one Surah; a single Ayah has `from` = `to`. */
export interface SharedAyahs {
  surah: number;
  from: number;
  to: number;
}

/** `2:255`, or `18:83–88` (an en dash, or a hyphen), as Shared Ayahs. */
export function parseSharedAyahs(text: string): SharedAyahs {
  const match = text.trim().match(/^(\d+):(\d+)(?:[–-](\d+))?$/);
  if (!match) throw new Error(`"${text}" names no Shared Ayahs`);
  const [, surah, from, to] = match;
  return { surah: Number(surah), from: Number(from), to: Number(to ?? from) };
}

defineParameterType({
  name: "ayahs",
  regexp: /\d+:\d+(?:[–-]\d+)?/,
  transformer: parseSharedAyahs,
});

/** A Share layout (#55), as the address names it. */
export type ShareLayout = "ayah-by-ayah" | "flowing";

defineParameterType({
  name: "layout",
  regexp: /Ayah by Ayah|Flowing/,
  transformer: (s: string): ShareLayout => (s === "Flowing" ? "flowing" : "ayah-by-ayah"),
});

export const { Given, When, Then } = createBdd(test);

export const OTHER: Record<Language, Language> = { ur: "en", en: "ur" };

/** Each Language's writing direction, as its content's `dir` reads. */
export const DIR: Record<Language, string> = { ur: "rtl", en: "ltr" };

/** The page's Language, which a step before must have opened. */
export function langOf(reading: Reading): Language {
  if (!reading.lang) throw new Error("no page opened yet in this scenario");
  return reading.lang;
}

/** The Surah of the page, which a step before must have opened. */
export function surahOf(reading: Reading): number {
  if (!reading.surah) throw new Error("no Surah page opened yet in this scenario");
  return reading.surah;
}

export { STRINGS } from "../support";

/**
 * Every element `l` matches (at least one) is marked with `lang` and its text
 * runs `dir`. One evaluateAll per try; the check itself runs here, naming each
 * element that is not.
 */
export const expectLangDir = (l: Locator, lang: string, dir: string, what = "the text") =>
  expect
    .poll(async () => {
      const seen = await l.evaluateAll((els) => els.map((e) => [e.getAttribute("lang"), getComputedStyle(e).direction, e.textContent]));
      if (seen.length === 0) return ["nothing shown"];
      return seen.filter(([l, d]) => l !== lang || d !== dir).map(([l, d, text]) => `"${text}" is lang ${l}, ${d}`);
    }, `${what} is marked lang ${lang} and runs ${dir}`)
    .toEqual([]);

/** True when `a` comes before `b` in document order. */
export const precedes = async (a: Locator, b: Locator) =>
  a.evaluate((x, y) => !!(x.compareDocumentPosition(y as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await b.elementHandle());

/** A CSS colour (hex, a token var, anything) resolved to the browser's rgb() form. */
export const resolveColor = (page: Page, value: string) =>
  page.evaluate((v) => {
    const probe = document.createElement("div");
    probe.style.color = v;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    return rgb;
  }, value);
