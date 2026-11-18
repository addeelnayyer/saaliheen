// The Share page as a visitor sees it (#55): Shared Ayahs in frame B, in the
// Language and Script its address names. Expected Arabic, Ayah translations,
// Surah names and Passage titles are read from the committed sources
// (../support, and the Passages file as last committed, ./passages), never typed. Things are found by role,
// accessible name and visible text; frame B's look is left to the screenshots,
// except what a user can tell by measuring: what is above or below what, what
// is cut off, and whether the paper is light or dark.

import fs from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { filePassages, type FilePassage } from "./passages";
import { ayahTranslation, sourceAyahEnd, sourceSurahs, urduDigits, type Language, LANGUAGES } from "../support";
import { Given, Then, When, parseSharedAyahs, precedes, type Reading, type SharedAyahs, type ShareLayout } from "./fixtures";
import { ayahText, type Script, type Theme } from "./reader";

// ---------------------------------------------------------------- the address

/** What a Share page's address carries: nothing per-viewer. */
export interface Address extends SharedAyahs {
  lang: Language;
  script: Script;
  /** The Share layout the address names; none means Ayah by Ayah for a run. */
  layout?: ShareLayout;
}

/**
 * A Share page's address (PROPOSED in the #55 stage 1 report):
 * /<lang>/share/<surah>/<from>[-<to>]/<script>[/<layout>], e.g.
 * /en/share/18/83-88/uthmani/flowing. A single Ayah is /en/share/2/255/uthmani.
 */
export function shareAddress({ lang, surah, from, to, script, layout }: Address): string {
  const range = from === to ? `${from}` : `${from}-${to}`;
  return `/${lang}/share/${surah}/${range}/${script}${layout ? `/${layout}` : ""}`;
}

/** The Share page each scenario opened last. */
const opened = new WeakMap<Reading, Address & { path: string; status?: number }>();
export const openedIn = (reading: Reading) => {
  const o = opened.get(reading);
  if (!o) throw new Error("no Share page opened yet in this scenario");
  return o;
};

/**
 * Note that the page on screen is now the Share page of `address`, reached
 * some other way than by opening its address: a share button, a link or the
 * edit strip (#56). The steps that read the Share page then read this one.
 */
export function noteSharePage(reading: Reading, address: Address) {
  reading.status = undefined;
  reading.lang = address.lang;
  reading.surah = undefined;
  opened.set(reading, { ...address, path: shareAddress(address) });
  shownLayout.delete(reading);
}

/** The Ayahs of `shared`, each as `s:a`. */
const ayahsOf = ({ surah, from, to }: SharedAyahs) => Array.from({ length: to - from + 1 }, (_, k) => `${surah}:${from + k}`);

async function open(reader: { page: Page; openFresh(path: string): Promise<void> }, reading: Reading, address: Address, fresh = false) {
  const p = shareAddress(address);
  let status: number | undefined;
  if (fresh) await reader.openFresh(p);
  else status = (await reader.page.goto(p))?.status();
  reading.status = status;
  reading.lang = address.lang;
  reading.surah = undefined;
  opened.set(reading, { ...address, path: p, status });
}

Given(
  "I open the Share page of {ayahs} in {language} and {script}",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language, script: Script) => open(reader, reading, { ...shared, lang, script }),
);

Given(
  "I open the Share page of {ayahs} in {language} and {script}, {layout}",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language, script: Script, layout: ShareLayout) =>
    open(reader, reading, { ...shared, lang, script, layout }),
);

When(
  "I open the Share page of {ayahs} in {language} and {script} in a fresh browser that keeps those choices",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language, script: Script) => open(reader, reading, { ...shared, lang, script }, true),
);

When("I view the page on a 375px-wide phone", async ({ reader }) => {
  await reader.page.setViewportSize({ width: 375, height: 812 });
});

// ---------------------------------------------------------------- the Passages file

const passageOf = ({ surah, from, to }: SharedAyahs) =>
  filePassages().find((p) => p.surah_no === surah && p.ayah_from === from && p.ayah_till === to);

Given("{ayahs} is not a Passage in the Passages file", async ({}, shared: SharedAyahs) => {
  expect(passageOf(shared), `a Passage ${shared.surah}:${shared.from}–${shared.to}`).toBeUndefined();
});

Given("{ayahs} is a Passage of {int} Ayahs in the Passages file", async ({}, shared: SharedAyahs, count: number) => {
  expect(passageOf(shared), `a Passage ${shared.surah}:${shared.from}–${shared.to}`).toBeDefined();
  expect(shared.to - shared.from + 1).toBe(count);
});

// ---------------------------------------------------------------- the expected text, from the sources

// A double quote is written \x22: in a pattern handed to a locator, a bare one
// ends the selector's text early (`.last()` on 112:4's translation, which ends in one).
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"/g, "\\x22").replace(/'/g, "\\x27");
/** Text pieces joined by any run of whitespace. */
const spaced = (pieces: string[]) => pieces.map(escape).join("\\s+");
/** A text as a pattern, its whitespace any run of whitespace (as Playwright normalizes a page's text). */
export const loose = (text: string) => spaced(text.trim().split(/\s+/));

/** The other Script. */
const OTHER_SCRIPT: Record<Script, Script> = { uthmani: "indopak", indopak: "uthmani" };

/**
 * Ayah `s:a`'s Arabic as the Share page writes it, as a pattern: its Words in
 * `script`, then its end as Sharing an Ayah writes it (#19): the end-of-Ayah
 * sign U+06DD, its number and any marks. For Uthmani the sign may be left to
 * QPC Hafs's font, which draws the Ayah number alone as the sign.
 */
export function arabicPattern(ayah: string, script: Script): string {
  const words = spaced(ayahText(ayah, script).split(" "));
  const end = script === "uthmani" ? `(?:۝\\s*)?${escape(sourceAyahEnd(ayah, "uthmani"))}` : escape(sourceAyahEnd(ayah, "indopak"));
  return `${words}\\s+${end}`;
}

/** An Ayah's number as a superscript may write it: Western, Urdu or Arabic-Indic digits. */
export const numberPattern = (n: number) => `(?:${n}|${urduDigits(n)}|${n.toLocaleString("ar-EG", { useGrouping: false })})`;

export const whole = (pattern: string) => new RegExp(`^\\s*${pattern}\\s*$`, "u");

/** One Ayah's Arabic on its own (Ayah by Ayah). */
const ayahArabic = (page: Page, ayah: string, script: Script) => page.getByText(whole(arabicPattern(ayah, script))).first();

/** One Ayah translation on its own (Ayah by Ayah). */
const ayahTranslationText = (page: Page, ayah: string, lang: Language) => page.getByText(ayahTranslation(ayah, lang), { exact: true }).first();

/** All the Shared Ayahs' Arabic running on (Flowing). */
const flowingArabic = (page: Page, shared: SharedAyahs, script: Script) =>
  page.getByText(whole(ayahsOf(shared).map((a) => arabicPattern(a, script)).join("\\s+"))).first();

/** The one translation paragraph, each Ayah translation after its number (Flowing). */
const flowingTranslation = (page: Page, shared: SharedAyahs, lang: Language) =>
  page
    .getByText(whole(ayahsOf(shared).map((a) => `${numberPattern(Number(a.split(":")[1]))}\\s*${loose(ayahTranslation(a, lang))}`).join("\\s+")))
    .first();

/** The first Shared Ayah's Arabic, in either layout. */
const firstArabic = (page: Page, o: Address) => page.getByText(new RegExp(`^\\s*${arabicPattern(ayahsOf(o)[0], o.script)}`, "u")).first();

/** Whatever ends with the last Shared Ayah's translation, in either layout. */
const lastTranslation = (page: Page, o: Address) =>
  page.getByText(new RegExp(`${loose(ayahTranslation(ayahsOf(o).at(-1)!, o.lang))}\\s*$`, "u")).last();

/** Each Shared Ayah's Arabic and translation as shown in `layout`: per Ayah, or the two Flowing blocks. */
function shownTexts(page: Page, o: Address, layout: ShareLayout): { arabic: Locator[]; translations: Locator[] } {
  if (layout === "flowing") return { arabic: [flowingArabic(page, o, o.script)], translations: [flowingTranslation(page, o, o.lang)] };
  const ayahs = ayahsOf(o);
  return { arabic: ayahs.map((a) => ayahArabic(page, a, o.script)), translations: ayahs.map((a) => ayahTranslationText(page, a, o.lang)) };
}

/** The layout the page shows now: what the visitor chose, else what the address names. */
const shownLayout = new WeakMap<Reading, ShareLayout>();
const layoutOf = (reading: Reading) => shownLayout.get(reading) ?? openedIn(reading).layout ?? "ayah-by-ayah";

/** `top` lies wholly above `below` on the page. */
async function expectAbove(top: Locator, below: Locator, what: string) {
  expect(await precedes(top, below), `${what}: in reading order`).toBe(true);
  const a = (await top.boundingBox())!;
  const b = (await below.boundingBox())!;
  expect(a.y + a.height, `${what}: on the page`).toBeLessThanOrEqual(b.y + 1);
}

// ---------------------------------------------------------------- the Shared Ayahs

Then(
  "the Share page shows {ayahs} {layout} in {script} and {language}",
  async ({ reader, reading }, shared: SharedAyahs, layout: ShareLayout, script: Script, lang: Language) => {
    const { page } = reader;
    const o = openedIn(reading);
    expect({ surah: o.surah, from: o.from, to: o.to, script: o.script, lang: o.lang }, "the Share page opened").toEqual({
      ...shared,
      script,
      lang,
    });
    if (o.status !== undefined) expect(o.status, `${o.path} answers`).toBe(200);
    const ayahs = ayahsOf(shared);
    if (layout === "flowing") {
      const arabic = flowingArabic(page, shared, script);
      const translation = flowingTranslation(page, shared, lang);
      await expect(arabic, `all the Arabic of ${o.path} running on`).toBeVisible();
      await expect(translation, `one translation paragraph, each Ayah's number before its translation`).toBeVisible();
      expect(await precedes(arabic, translation), "the Arabic before the translation paragraph").toBe(true);
    } else {
      for (const [i, ayah] of ayahs.entries()) {
        const arabic = ayahArabic(page, ayah, script);
        const translation = ayahTranslationText(page, ayah, lang);
        await expect(arabic, `${ayah}'s ${script} Arabic on its own`).toBeVisible();
        await expect(translation, `${ayah}'s ${lang} Ayah translation on its own`).toBeVisible();
        expect(await precedes(arabic, translation), `${ayah}'s Arabic before its translation`).toBe(true);
        if (ayahs[i + 1]) {
          const next = ayahArabic(page, ayahs[i + 1], script);
          expect(await precedes(translation, next), `${ayah}'s translation before ${ayahs[i + 1]}'s Arabic`).toBe(true);
        }
      }
    }
    // Nothing of the other Script, or of the other Language's Ayah translation, is shown.
    // A Word the other Script writes as this Script writes a Word of any Shared
    // Ayah proves nothing (18:84:10 in Indo-Pak is written as 18:85:2 in Uthmani).
    const shownWords = new Set((await page.locator("body").innerText()).split(/\s+/));
    const mine = ayahs.flatMap((a) => ayahText(a, script).split(" "));
    for (const ayah of ayahs) {
      const other = ayahText(ayah, OTHER_SCRIPT[script]).split(" ").filter((w) => !mine.includes(w));
      expect(other.filter((w) => shownWords.has(w)), `${ayah}'s ${OTHER_SCRIPT[script]} Words shown`).toEqual([]);
      await expect(page.getByText(ayahTranslation(ayah, lang === "ur" ? "en" : "ur")), `${ayah}'s other Ayah translation`).toHaveCount(0);
    }
  },
);

Then(
  "in the translation paragraph each Ayah's number is a small superscript before its Ayah translation",
  async ({ reader, reading }) => {
    const o = openedIn(reading);
    const paragraph = flowingTranslation(reader.page, o, o.lang);
    await expect(paragraph).toBeVisible();
    for (const ayah of ayahsOf(o)) {
      const n = Number(ayah.split(":")[1]);
      const number = paragraph.getByText(whole(numberPattern(n))).first();
      await expect(number, `Ayah ${ayah}'s number in the paragraph`).toBeVisible();
      const look = await number.evaluate((el, p) => {
        const s = getComputedStyle(el);
        return {
          raised: el.tagName === "SUP" || s.verticalAlign === "super" || s.verticalAlign === "top" || s.verticalAlign === "text-top",
          smaller: parseFloat(s.fontSize) < parseFloat(getComputedStyle(p as Element).fontSize),
        };
      }, await paragraph.elementHandle());
      expect(look, `Ayah ${ayah}'s number is a small superscript`).toEqual({ raised: true, smaller: true });
    }
  },
);

// ---------------------------------------------------------------- the frame's head and colophon

Then(
  "the frame's head shows the Surah's Arabic and English names and the Ayah range, above the first Shared Ayah",
  async ({ reader, reading }) => {
    const { page } = reader;
    const o = openedIn(reading);
    const surah = sourceSurahs()[o.surah - 1];
    const range = o.from === o.to ? `${o.surah}:${o.from}` : `${o.surah}:${o.from}[–-]${o.to}`;
    const arabicName = page.getByText(surah.nameArabic, { exact: true }).first();
    const englishAndRange = page.getByText(new RegExp(`^\\s*${escape(surah.nameLatin)}\\s*·\\s*${range}\\s*$`, "iu")).first();
    await expect(arabicName, `Surah ${o.surah}'s Arabic name`).toBeVisible();
    await expect(englishAndRange, `"${surah.nameLatin} · ${o.surah}:${o.from}–${o.to}"`).toBeVisible();
    await expectAbove(arabicName, firstArabic(page, o), "the Surah's Arabic name above the first Shared Ayah");
    await expectAbove(englishAndRange, firstArabic(page, o), "the English name and range above the first Shared Ayah");
  },
);

/** Each Language's Ayah translation's translator (the Credits page). */
const CREDIT: Record<Language, string> = { ur: "Fateh Muhammad Jalandhari", en: "Saheeh International" };

const colophon = (page: Page, lang: Language) => ({
  translator: page.getByText(CREDIT[lang]).last(),
  read: page.getByRole("link", { name: "Read this in Quran Analysis", exact: true }),
  brand: page.getByText("Saaliheen", { exact: true }).last(),
});

Then(
  `the colophon shows the translator, a "Read this in Quran Analysis" link to the first Shared Ayah and the Saaliheen name, below the last Shared Ayah`,
  async ({ reader, reading }) => {
    const { page } = reader;
    const o = openedIn(reading);
    const c = colophon(page, o.lang);
    const last = lastTranslation(page, o);
    for (const [what, part] of Object.entries(c)) {
      await expect(part, `the colophon's ${what}`).toBeVisible();
      await expectAbove(last, part, `the colophon's ${what} below the last Shared Ayah`);
    }
    const href = await c.read.getAttribute("href");
    const target = new URL(href!, page.url());
    expect(target.pathname + target.hash, "Read this in Quran Analysis goes to the first Shared Ayah").toBe(`/${o.lang}/${o.surah}#${o.surah}:${o.from}`);
  },
);

Then(
  `below the frame there is a "Share your own" link to a Share page in {language}`,
  async ({ reader }, lang: Language) => {
    const { page } = reader;
    const link = page.getByRole("link", { name: "Share your own", exact: true });
    await expect(link).toBeVisible();
    await expectAbove(colophon(page, lang).brand, link, `"Share your own" below the colophon`);
    expect(new URL((await link.getAttribute("href"))!, page.url()).pathname).toMatch(new RegExp(`^/${lang}/share/`));
  },
);

// ---------------------------------------------------------------- the Passage title

const titleOf = (p: FilePassage, lang: Language) => (lang === "ur" ? p.title_ur : p.title_en);

Then(
  "the frame's head shows the Passage title of {ayahs} in {language}, above the first Shared Ayah",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language) => {
    const { page } = reader;
    const passage = passageOf(shared);
    if (!passage) throw new Error(`the Passages file has no Passage ${shared.surah}:${shared.from}–${shared.to}`);
    const title = page.getByText(titleOf(passage, lang), { exact: true }).first();
    await expect(title, `the ${lang} Passage title`).toBeVisible();
    await expectAbove(title, firstArabic(page, openedIn(reading)), "the Passage title above the first Shared Ayah");
    await expectMarked(title, lang, lang === "ur" ? "rtl" : "ltr", "the Passage title");
  },
);

Then("the frame's head shows no Passage title of Surah {int}", async ({ reader }, surah: number) => {
  const text = await reader.page.locator("body").innerText();
  const titles = filePassages()
    .filter((p) => p.surah_no === surah)
    .flatMap((p) => LANGUAGES.map((lang) => titleOf(p, lang)));
  expect(titles.filter((t) => text.includes(t)), "Passage titles shown").toEqual([]);
});

// ---------------------------------------------------------------- the visitor's Share layout toggle

export const LAYOUT_NAME: Record<ShareLayout, string> = { "ayah-by-ayah": "Ayah by Ayah", flowing: "Flowing" };

/** The visitor's Share layout toggle: a group (or radio group) named "Share layout". */
const toggle = (page: Page) =>
  page
    .getByRole("group", { name: "Share layout", exact: true })
    .or(page.getByRole("radiogroup", { name: "Share layout", exact: true }));

const option = (page: Page, layout: ShareLayout) =>
  toggle(page)
    .getByRole("button", { name: LAYOUT_NAME[layout], exact: true })
    .or(toggle(page).getByRole("radio", { name: LAYOUT_NAME[layout], exact: true }));

/** Whether a toggle option is the chosen one: pressed, or checked. */
const isChosen = (l: Locator) =>
  l.evaluate((el) => el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true" || (el as HTMLInputElement).checked === true);

Then("the Share layout toggle shows {layout} chosen", async ({ reader, reading }, layout: ShareLayout) => {
  const { page } = reader;
  await expect(toggle(page), "the Share layout toggle").toBeVisible();
  const other: ShareLayout = layout === "flowing" ? "ayah-by-ayah" : "flowing";
  await expect.poll(() => isChosen(option(page, layout)), `${LAYOUT_NAME[layout]} chosen`).toBe(true);
  expect(await isChosen(option(page, other)), `${LAYOUT_NAME[other]} not chosen`).toBe(false);
  await expectAbove(colophon(page, openedIn(reading).lang).brand, toggle(page), "the toggle below the frame");
});

Then("there is no Share layout toggle", async ({ reader }) => {
  const { page } = reader;
  await expect(toggle(page)).toHaveCount(0);
  for (const name of Object.values(LAYOUT_NAME)) {
    await expect(page.getByRole("button", { name, exact: true }).or(page.getByRole("radio", { name, exact: true }))).toHaveCount(0);
  }
});

/** Choose a layout; a tap before the page has hydrated does nothing, so tap again, as a visitor would. */
When("I choose the {layout} Share layout", async ({ reader, reading }, layout: ShareLayout) => {
  const choice = option(reader.page, layout);
  await expect(async () => {
    await choice.click();
    await expect.poll(() => isChosen(choice), { timeout: 1000 }).toBe(true);
  }).toPass();
  shownLayout.set(reading, layout);
});

Then("the address is still the one I opened", async ({ reader, reading }) => {
  const o = openedIn(reading);
  await expect(reader.page).toHaveURL((url) => url.pathname === o.path && url.search === "" && url.hash === "");
});

// ---------------------------------------------------------------- sizing

/** Each Shared Ayah's Arabic and translation as the page shows them now. */
const shown = (page: Page, reading: Reading) => {
  const o = openedIn(reading);
  const { arabic, translations } = shownTexts(page, o, layoutOf(reading));
  return [...arabic, ...translations];
};

Then("every Shared Ayah is shown whole, nothing cut off", async ({ reader, reading }) => {
  for (const text of shown(reader.page, reading)) {
    await expect(text).toBeVisible();
    const cut = await text.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (s.webkitLineClamp !== "none" && s.webkitLineClamp !== "") return "line-clamped";
      if (el.scrollHeight > el.clientHeight + 1 && s.overflowY !== "visible") return "its own box cuts it off";
      for (let a = el.parentElement; a; a = a.parentElement) {
        const as = getComputedStyle(a);
        if (as.overflowX === "visible" && as.overflowY === "visible") continue;
        if (a === document.documentElement || a === document.body) continue;
        const r = a.getBoundingClientRect();
        if (box.top < r.top - 1 || box.bottom > r.bottom + 1 || box.left < r.left - 1 || box.right > r.right + 1) return `cut off by <${a.tagName.toLowerCase()}>`;
      }
      return null;
    });
    expect(cut, `"${(await text.textContent())?.slice(0, 40)}…"`).toBeNull();
  }
});

const pageHeight = (page: Page) => page.evaluate(() => ({ height: document.documentElement.scrollHeight, screen: window.innerHeight }));

Then("the page is taller than one screen", async ({ reader }) => {
  const { height, screen } = await pageHeight(reader.page);
  expect(height).toBeGreaterThan(screen);
});

Then("the page is at least one screen tall", async ({ reader }) => {
  const { height, screen } = await pageHeight(reader.page);
  expect(height).toBeGreaterThanOrEqual(screen);
});

Then("the colophon is below the last Shared Ayah", async ({ reader, reading }) => {
  const { page } = reader;
  const o = openedIn(reading);
  const last = shown(page, reading).at(-1)!;
  for (const [what, part] of Object.entries(colophon(page, o.lang))) await expectAbove(last, part, `the colophon's ${what}`);
});

Then("the colophon sits at the foot of the first screen", async ({ reader, reading }) => {
  const { page } = reader;
  await page.evaluate(() => window.scrollTo(0, 0));
  const screen = page.viewportSize()!.height;
  const brand = (await colophon(page, openedIn(reading).lang).brand.boundingBox())!;
  const bottom = brand.y + brand.height;
  expect(bottom, "the colophon's foot is on the first screen").toBeLessThanOrEqual(screen);
  expect(bottom, "the colophon's foot is in the screen's lowest quarter").toBeGreaterThanOrEqual(screen * 0.75);
});

Then("every Shared Ayah fits within the screen's width", async ({ reader, reading }) => {
  const width = reader.page.viewportSize()!.width;
  for (const text of shown(reader.page, reading)) {
    const box = (await text.boundingBox())!;
    expect(box.x, "left edge").toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, "right edge").toBeLessThanOrEqual(width);
  }
});

/**
 * Where Ayah `s:a`'s last Word and its end are drawn: the vertical middle and
 * height of each, found by their text (read from the sources) in the page's
 * Arabic, so a person reading the page could point at them.
 */
async function lastWordAndEnd(page: Page, ayah: string, script: Script) {
  const lastWord = ayahText(ayah, script).split(" ").at(-1)!;
  const end = script === "uthmani" ? `(?:۝\\s*)?${escape(sourceAyahEnd(ayah, "uthmani"))}` : escape(sourceAyahEnd(ayah, "indopak"));
  const pattern = `(${escape(lastWord)})\\s+(${end})(?!\\d)`;
  return page.evaluate((source) => {
    const re = new RegExp(source, "u");
    for (const el of Array.from(document.querySelectorAll('[lang="ar"]'))) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes: { node: Text; start: number }[] = [];
      let flat = "";
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        nodes.push({ node: n as Text, start: flat.length });
        flat += n.nodeValue;
      }
      const m = re.exec(flat);
      if (!m) continue;
      const at = (offset: number): [Text, number] => {
        const hit = nodes.findLast((t) => t.start <= offset)!;
        return [hit.node, offset - hit.start];
      };
      const box = (from: number, to: number) => {
        const r = document.createRange();
        r.setStart(...at(from));
        r.setEnd(...at(to));
        const b = r.getBoundingClientRect();
        return { middle: b.top + b.height / 2, height: b.height };
      };
      const endFrom = m.index + m[0].length - m[2].length;
      return { word: box(m.index, m.index + m[1].length), end: box(endFrom, m.index + m[0].length) };
    }
    return null;
  }, pattern);
}

Then("each Shared Ayah's end is on the same line as its last Word", async ({ reader, reading }) => {
  const o = openedIn(reading);
  await reader.page.evaluate(() => document.fonts.ready);
  for (const ayah of ayahsOf(o)) {
    const drawn = await lastWordAndEnd(reader.page, ayah, o.script);
    expect(drawn, `${ayah}'s last Word followed by its end`).not.toBeNull();
    const { word, end } = drawn!;
    const apart = Math.abs(word.middle - end.middle);
    expect(apart, `${ayah}'s end on its last Word's line`).toBeLessThan(Math.min(word.height, end.height) / 2);
  }
});

Then("the Shared Ayahs' Arabic is set in a font face that has loaded", async ({ reader, reading }) => {
  const arabic = firstArabic(reader.page, openedIn(reading));
  await expect(arabic).toBeVisible();
  const font = await arabic.evaluate(async (el) => {
    await document.fonts.ready;
    const family = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    return { family, loaded: Array.from(document.fonts).some((f) => f.family.replace(/^['"]|['"]$/g, "") === family && f.status === "loaded") };
  });
  expect(font.loaded, `the Arabic's font ${font.family} has loaded`).toBe(true);
});

// ---------------------------------------------------------------- light and dark

/** Relative luminance (0 black – 1 white) of an rgb()/rgba() colour. */
const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

Then("the Share page is drawn in its {theme} look", async ({ reader, reading }, theme: Theme) => {
  const text = shown(reader.page, reading).at(-1)!;
  const { paper, ink } = await text.evaluate((el) => {
    let paper = "rgb(255, 255, 255)";
    for (let a: Element | null = el; a; a = a.parentElement) {
      const bg = getComputedStyle(a).backgroundColor;
      const alpha = bg.startsWith("rgba") ? Number(bg.split(",")[3].replace(")", "")) : 1;
      if (alpha > 0.5) {
        paper = bg;
        break;
      }
    }
    return { paper, ink: getComputedStyle(el).color };
  });
  if (theme === "light") {
    expect(luminance(paper), `the paper behind the Ayahs (${paper}) is light`).toBeGreaterThan(0.6);
    expect(luminance(ink), `the Ayah translation's colour (${ink}) is dark`).toBeLessThan(0.3);
  } else {
    expect(luminance(paper), `the paper behind the Ayahs (${paper}) is dark`).toBeLessThan(0.1);
    expect(luminance(ink), `the Ayah translation's colour (${ink}) is light`).toBeGreaterThan(0.4);
  }
});

// ---------------------------------------------------------------- assistive technology

/** `l` is in Language `lang` as a screen reader reads it (its own lang, or its nearest ancestor's) and its text runs `dir`. */
async function expectMarked(l: Locator, lang: string, dir: string, what: string) {
  const seen = await l.evaluate((el) => ({ lang: el.closest("[lang]")?.getAttribute("lang") ?? null, dir: getComputedStyle(el).direction }));
  expect(seen, what).toEqual({ lang, dir });
}

Then(
  "the Shared Ayahs' Arabic and the Surah's Arabic name are marked lang {string} and run {string}",
  async ({ reader, reading }, lang: string, dir: string) => {
    const { page } = reader;
    const o = openedIn(reading);
    const { arabic } = shownTexts(page, o, layoutOf(reading));
    for (const [i, a] of arabic.entries()) await expectMarked(a, lang, dir, `the Shared Ayahs' Arabic (${i + 1})`);
    await expectMarked(page.getByText(sourceSurahs()[o.surah - 1].nameArabic, { exact: true }).first(), lang, dir, "the Surah's Arabic name");
  },
);

Then("the Ayah translations are marked lang {string} and run {string}", async ({ reader, reading }, lang: string, dir: string) => {
  const { translations } = shownTexts(reader.page, openedIn(reading), layoutOf(reading));
  for (const [i, t] of translations.entries()) await expectMarked(t, lang, dir, `Ayah translation ${i + 1}`);
});

Then("the frame's artwork is hidden from assistive technology", async ({ reader }) => {
  const { page } = reader;
  const tree = await page.locator("body").ariaSnapshot();
  expect(tree, "an image in the accessibility tree").not.toMatch(/^\s*- (img|image)\b/m);
  // Ornaments drawn with symbol characters (❁, ✦, ◆, ★ …) must not be read out.
  expect(tree.match(/[☀-➿■-◿⬀-⯿]/gu) ?? [], "ornament characters in the accessibility tree").toEqual([]);
  const exposed = await page.evaluate(() =>
    Array.from(document.querySelectorAll("svg, img, canvas"))
      .filter((el) => !el.closest('[aria-hidden="true"]'))
      .filter((el) => !["presentation", "none"].includes(el.getAttribute("role") ?? ""))
      .filter((el) => !(el.tagName === "IMG" && el.getAttribute("alt") === ""))
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(exposed, "artwork not hidden from assistive technology").toEqual([]);
});

// ---------------------------------------------------------------- not found

Then(
  "the Share pages of these Shared Ayahs are not found, in either Language:",
  async ({ request }, table: { hashes(): Record<string, string>[] }) => {
    const rows = table.hashes();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const shared = parseSharedAyahs(row["Shared Ayahs"]);
      for (const lang of LANGUAGES) {
        const p = shareAddress({ ...shared, lang, script: "uthmani" });
        expect((await request.get(p)).status(), `${p} (${row.why})`).toBe(404);
      }
    }
  },
);

// ---------------------------------------------------------------- evidence

/** Save the whole Share page (or only what is on screen) as DELIVERY evidence when SCREENS_DIR is set. */
async function saveShot(page: Page, name: string, fullPage: boolean) {
  const dir = process.env.SCREENS_DIR;
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage });
}

Then("I save a screenshot of the Share page {string}", async ({ reader }, name: string) => saveShot(reader.page, name, true));
Then("I save a screenshot of the Share page as it is on screen {string}", async ({ reader }, name: string) => saveShot(reader.page, name, false));
