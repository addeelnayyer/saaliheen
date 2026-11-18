// Steps for #149: Allah references in gold on Share pages. Which Words are
// Allah references is read from the seeded list (./allah-references), their
// Arabic by the page, and the Words of the Shared Ayahs from the QUL sources
// (../support); never typed.
//
// A Word's Arabic is gold when every letter of it is drawn in the gold of the
// frame's look: the colour of each text node's element under the Word's
// `data-location` element (#146). A Share page's looks follow the device's
// colour scheme alone, so the gold is read from the scheme, not from the
// reader's saved theme. "No other letter is gold" reads every text node under
// any Arabic (lang="ar") paragraph of the page, the Ayah ends included.
//
// An Ayah is "dimmed" as Flowing dims one in Quran Analysis: its Words and
// its end drawn dimmer. The Share page dims none of its own, so the step
// lowers the opacity of the Ayah's Words (and the end held with the last
// Word); the gold, being the colour of the letters, must go dimmer with them,
// measured as the contrast of the letters against the paper they sit on.

import { expect, type Page } from "@playwright/test";
import { sourceWords, type Language } from "../support";
import { isSeededAllahReference } from "./allah-references";
import { GOLD, GOLDS, rgb } from "./allah-references.steps";
import { seen } from "./ayah-share.steps";
import { Given, Then, When, type Reading, type SharedAyahs, type ShareLayout } from "./fixtures";
import type { Script } from "./reader";
import { noteSharePage } from "./share-page.steps";

/** The Word locations of the Shared Ayahs, from the sources, in order. */
const wordsOf = ({ surah, from, to }: SharedAyahs) =>
  sourceWords(surah)
    .map((w) => w.location)
    .filter((l) => {
      const ayah = Number(l.split(":")[1]);
      return ayah >= from && ayah <= to;
    });

/** The Allah references among the Shared Ayahs, per the seeded list. */
function allahReferencesOf(shared: SharedAyahs) {
  const listed = wordsOf(shared).filter(isSeededAllahReference);
  expect(listed.length, `the seeded list holds Allah references among ${shared.surah}:${shared.from}–${shared.to}`).toBeGreaterThan(0);
  return listed;
}

/** One text node of the page's Arabic: the Word it is in (null for none, e.g. an Ayah end), and its colour. */
interface Letters {
  location: string | null;
  colour: string;
}

/** In the page: every non-blank text node under an Arabic paragraph, with its Word's location and drawn colour. */
function arabicLetters(): Letters[] {
  const out: Letters[] = [];
  for (const p of Array.from(document.querySelectorAll('[lang="ar"]'))) {
    const walk = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const el = n.parentElement!;
      out.push({ location: el.closest("[data-location]")?.getAttribute("data-location") ?? null, colour: getComputedStyle(el).color });
    }
  }
  return out;
}

/** What `page`'s Arabic draws: each text node's Word and colour. */
export const lettersOnPage = (page: Page) => page.evaluate(arabicLetters);

/** The gold of the frame's look: its dark look when the device prefers a dark colour scheme, else its light look. */
export const frameGold = async (page: Page) =>
  rgb((await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)) ? GOLD.dark : GOLD.light);

/** Wait for the letters of `locations` to be on the page, and return what is drawn. */
async function lettersOf(page: Page, locations: string[]) {
  let letters: Letters[] = [];
  await expect
    .poll(async () => {
      letters = await lettersOnPage(page);
      return locations.filter((l) => !letters.some((x) => x.location === l));
    }, { message: "Words not yet on the Share page" })
    .toEqual([]);
  return letters;
}

// ---------------------------------------------------------------- the gold

/** Expect each Allah reference among `shared` drawn wholly in `colour`. */
async function expectGold(page: Page, shared: SharedAyahs, colour: string) {
  const locations = allahReferencesOf(shared);
  await expect
    .poll(async () => {
      const letters = await lettersOnPage(page);
      return locations.map((location) => ({ location, colours: [...new Set(letters.filter((l) => l.location === location).map((l) => l.colour))] }));
    })
    .toEqual(locations.map((location) => ({ location, colours: [colour] })));
}

Then(
  "the Arabic of every Allah reference of {ayahs} in the seeded list is gold on the Share page",
  async ({ reader }, shared: SharedAyahs) => {
    await expectGold(reader.page, shared, await frameGold(reader.page));
  },
);

Then(
  "the Arabic of every Allah reference of {ayahs} in the seeded list is drawn in {word} on the Share page",
  async ({ reader }, shared: SharedAyahs, hex: string) => {
    await expectGold(reader.page, shared, rgb(hex));
  },
);

Then("no other letter of the Arabic of {ayahs} on the Share page is gold", async ({ reader }, shared: SharedAyahs) => {
  const listed = new Set(allahReferencesOf(shared));
  const letters = await lettersOf(reader.page, wordsOf(shared));
  const gold = letters.filter((l) => GOLDS.includes(l.colour) && !(l.location && listed.has(l.location)));
  expect(gold, "letters of the Arabic, not of a seeded Allah reference, drawn in gold").toEqual([]);
});

Then("no letter of the Arabic of {ayahs} on the Share page is gold", async ({ reader }, shared: SharedAyahs) => {
  const letters = await lettersOf(reader.page, wordsOf(shared));
  expect(
    letters.filter((l) => GOLDS.includes(l.colour)),
    "letters of the Arabic drawn in gold",
  ).toEqual([]);
});

// ---------------------------------------------------------------- the token

Then(
  "the gold of every Allah reference of {ayahs} on the Share page is the --allah token and not the frame's --gold",
  async ({ reader }, shared: SharedAyahs) => {
    const locations = allahReferencesOf(shared);
    await lettersOf(reader.page, locations);
    const read = await reader.page.evaluate((locations) => {
      /** The colour `var(--name)` resolves to inside `el`. */
      const token = (el: Element, name: string) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${name})`;
        el.appendChild(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return colour;
      };
      return locations.map((location) => {
        const el = document.querySelector(`[data-location="${location}"]`)!;
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const drawn = new Set<string>();
        for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent?.trim()) drawn.add(getComputedStyle(n.parentElement!).color);
        return { location, drawn: [...drawn], allah: token(el, "--allah"), gold: token(el, "--gold") };
      });
    }, locations);
    for (const w of read) {
      expect(w.drawn, `the colours the Arabic at ${w.location} is drawn in: the --allah token`).toEqual([w.allah]);
      expect(w.allah, `the --allah token at ${w.location} is not the frame's --gold (${w.gold})`).not.toBe(w.gold);
      expect(GOLDS, `the --allah token at ${w.location}`).toContain(w.allah);
    }
  },
);

// ---------------------------------------------------------------- the dimming

/** Each Allah reference's letters' contrast with the paper behind them, through every opacity above them. */
interface Contrast {
  [location: string]: number;
}

/** Ayah `ayah`'s (`s:a`) Allah references, among those the page drew. */
const ofAyah = (ayah: string) => (location: string) => location.split(":").slice(0, 2).join(":") === ayah;

/** In the page: each Allah reference of `locations`'s contrast with its paper. Self-contained. */
function contrastsInPage(locations: string[]): Contrast {
  const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number) as number[];
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const out: Contrast = {};
  for (const location of locations) {
    const el = document.querySelector(`[data-location="${location}"]`)!;
    let text = el;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent?.trim()) text = n.parentElement!;
    const [r, g, b] = parse(getComputedStyle(text).color);
    let opacity = 1;
    let paper: number[] | null = null;
    for (let e: Element | null = text; e; e = e.parentElement) {
      opacity *= Number(getComputedStyle(e).opacity);
      const bg = parse(getComputedStyle(e).backgroundColor);
      if (!paper && e !== text && bg.length >= 3 && (bg[3] ?? 1) > 0) paper = bg;
    }
    const p = paper ?? [255, 255, 255];
    const blended = [r, g, b].map((v, i) => v * opacity + p[i] * (1 - opacity));
    const [hi, lo] = [lum(blended), lum(p)].sort((a, b) => b - a);
    out[location] = (hi + 0.05) / (lo + 0.05);
  }
  return out;
}

/** What each Share page's scenario noted: its Allah references' contrast before dimming. */
const noted = new WeakMap<Reading, Contrast>();

Given(
  "I note how the Arabic of every Allah reference of {ayahs} on the Share page is drawn",
  async ({ reader, reading }, shared: SharedAyahs) => {
    const locations = allahReferencesOf(shared);
    await lettersOf(reader.page, locations);
    noted.set(reading, await reader.page.evaluate(contrastsInPage, locations));
  },
);

When("Ayah {word} is dimmed on the Share page as an Ayah dimmed in Flowing is", async ({ reader }, ayah: string) => {
  const dimmed = await reader.page.evaluate((ayah) => {
    let n = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-location^="${ayah}:"]`))) {
      // The last Word is held with the Ayah's end in one span: dim that, so the end goes dimmer with it.
      const holder = el.parentElement?.matches('[lang="ar"]') ? el : el.parentElement!;
      holder.style.opacity = "0.4";
      n++;
    }
    return n;
  }, ayah);
  expect(dimmed, `Words of Ayah ${ayah} on the page`).toBeGreaterThan(0);
});

/** Each Allah reference of Ayah `ayah` among the noted, as it is drawn now against what was noted. */
async function againstNoted(reader: { page: Page }, reading: Reading, ayah: string) {
  const before = noted.get(reading);
  expect(before, "Allah references' contrast noted before").toBeDefined();
  const locations = Object.keys(before!).filter(ofAyah(ayah));
  expect(locations.length, `Allah references of Ayah ${ayah} noted`).toBeGreaterThan(0);
  const now = await reader.page.evaluate(contrastsInPage, locations);
  return locations.map((l) => ({ location: l, now: now[l], before: before![l], share: now[l] / before![l] }));
}

Then("the Arabic of every Allah reference of Ayah {word} on the Share page is dimmed", async ({ reader, reading }, ayah: string) => {
  const drawn = await againstNoted(reader, reading, ayah);
  // Dimmed: at most 80% of the contrast it had before (as Study's Flowing sets it, #126).
  expect(drawn.filter((d) => d.share > 0.8), "Allah references not dimmed with their Ayah").toEqual([]);
});

Then("the Arabic of every Allah reference of Ayah {word} on the Share page is drawn as noted", async ({ reader, reading }, ayah: string) => {
  const drawn = await againstNoted(reader, reading, ayah);
  expect(drawn.filter((d) => d.share < 0.9), "Allah references drawn dimmer than noted").toEqual([]);
});

// ---------------------------------------------------------------- Copy text

Then("the copied text holds no markup and no colour", async ({ reader }) => {
  const text = (await seen(reader.page)).copied.at(-1) ?? "";
  expect(text, "the text last copied").not.toBe("");
  expect(text, "no HTML tag").not.toMatch(/<[^>]*>/);
  expect(text, "no style, class or colour").not.toMatch(/style=|class=|data-|color\s*:|#[0-9a-f]{6}\b|rgb\(/i);
});

// ---------------------------------------------------------------- the first frame

/**
 * Record the colours of the letters of every Word (`data-location`) in the
 * first animation frame in which it exists. Installed before any of the
 * page's scripts on every load of `page`.
 */
async function watchFirstFrames(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shareFirstFrames?: Record<string, string[]> };
    const seen: Record<string, string[]> = (w.__shareFirstFrames = {});
    const look = () => {
      for (const el of Array.from(document.querySelectorAll("[data-location]"))) {
        const location = el.getAttribute("data-location")!;
        if (seen[location]) continue;
        const colours = new Set<string>();
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent?.trim()) colours.add(getComputedStyle(n.parentElement!).color);
        seen[location] = Array.from(colours);
      }
      if (document.readyState !== "complete") requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}

When(
  "I open the Share page of {ayahs} in {language} and {script}, {layout}, watching the first frame each Word is drawn in",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language, script: Script, layout: ShareLayout) => {
    await watchFirstFrames(reader.page);
    const range = shared.from === shared.to ? `${shared.from}` : `${shared.from}-${shared.to}`;
    const address = `/${lang}/share/${shared.surah}/${range}/${script}/${layout}`;
    reading.status = (await reader.page.goto(address))?.status();
    reading.lang = lang;
    reading.surah = undefined;
    noteSharePage(reading, { ...shared, lang, script, layout });
  },
);

Then(
  "no Allah reference of {ayahs} in the seeded list was gold in the first frame it was drawn in on the Share page",
  async ({ reader }, shared: SharedAyahs) => {
    const locations = allahReferencesOf(shared);
    await reader.page.waitForLoadState("load");
    let seen: Record<string, string[]> = {};
    await expect
      .poll(async () => {
        seen = await reader.page.evaluate(() => (window as unknown as { __shareFirstFrames?: Record<string, string[]> }).__shareFirstFrames ?? {});
        return locations.filter((l) => !(l in seen));
      }, { message: "Allah references not yet drawn" })
      .toEqual([]);
    const gold = locations.filter((l) => seen[l].some((c) => GOLDS.includes(c)));
    expect(gold, "Allah references gold in their first frame").toEqual([]);
  },
);
