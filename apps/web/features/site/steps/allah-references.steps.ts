// Steps for #147: Allah references in Allah reference colour in Study. Which
// Words are Allah references is read from the seeded list
// (../allah-references.json, the file the site tests' Postgres is seeded with
// before the build), their Arabic in each Script from the QUL sources, and
// their Lemmas from QUL's word lemma database; never typed.
//
// A Word's Arabic is gold when every letter of it is drawn in the gold of the
// theme in effect: the colour of each text node's element under the Word
// card's Arabic, so the gold may sit on the Arabic itself or on an element
// inside it.

import { expect, type Page } from "@playwright/test";
import { indopakText, sourceRecitedAyah, sourceWords, type Language } from "../support";
import { seededAllahReferences as seeded } from "./allah-references";
import { Given, Then, When } from "./fixtures";
import { reach } from "./recitation.steps";
import { qulAnalysis } from "./roots";

// ---------------------------------------------------------------- the seeded list

export const seededIn = (surah: number) => {
  const locations = seeded().filter((l) => l.startsWith(`${surah}:`));
  expect(locations.length, `the seeded list holds Allah references in Surah ${surah}`).toBeGreaterThan(0);
  return locations;
};

// ---------------------------------------------------------------- the gold

/** Allah reference colour, by theme (#147). */
export const GOLD = { light: "#A87A0A", dark: "#E3B84F" } as const;

/** `#RRGGBB` as getComputedStyle gives it, `rgb(r, g, b)`. */
export const rgb = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};
export const GOLDS = Object.values(GOLD).map(rgb);

/** The gold of the theme in effect on the page: the chosen theme, or the system's when none is chosen. */
export const goldOnPage = async (page: Page) => {
  const dark = await page.evaluate(() => {
    const theme = document.documentElement.dataset.theme;
    return theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  });
  return rgb(dark ? GOLD.dark : GOLD.light);
};

/** A Word card as drawn: the colour of each letter of its Arabic, and its Word meaning's and Root tag's colours. */
interface DrawnWord {
  location: string;
  /** Each distinct colour the Arabic's letters are drawn in; null when the card or its Arabic is missing. */
  arabic: string[] | null;
  meaning: string | null;
  root: string | null;
  rootBackground: string | null;
}

/** In the page: the Word card at `location` as drawn. Self-contained: it is sent into the page as source. */
function drawnWordInPage(location: string, arabicText: string, meaningText: string) {
  const el = document.getElementById(location);
  if (!el) return { location, arabic: null, meaning: null, root: null, rootBackground: null };
  const shown = Array.from(el.children).filter((c) => getComputedStyle(c).display !== "none");
  const ar = shown.find((c) => c.tagName !== "BUTTON" && c.textContent === arabicText);
  const mean = shown.find((c) => c !== ar && c.textContent?.trim() === meaningText.trim());
  const root = shown.find((c) => c.tagName === "BUTTON");
  const letters = (c: Element | undefined) => {
    if (!c) return null;
    const colours = new Set<string>();
    const walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent?.trim()) colours.add(getComputedStyle(n.parentElement!).color);
    return Array.from(colours);
  };
  return {
    location,
    arabic: letters(ar),
    meaning: mean ? getComputedStyle(mean).color : null,
    root: root ? getComputedStyle(root).color : null,
    rootBackground: root ? getComputedStyle(root).backgroundColor : null,
  };
}
const DRAWN_WORD = drawnWordInPage.toString();

/** The Script the page shows. */
const scriptOn = async (page: Page) => ((await page.locator("html").getAttribute("data-script")) === "indopak" ? "indopak" : "uthmani");

/** The Language of the page on screen, from its URL. */
const languageOn = (page: Page): Language => (new URL(page.url()).pathname.split("/")[1] === "ur" ? "ur" : "en");

/** Each Word card at `locations` of Surah `surah` as drawn, once every transition has ended. */
async function drawnWords(page: Page, surah: number, locations?: string[]): Promise<DrawnWord[]> {
  const script = await scriptOn(page);
  const lang = languageOn(page);
  const words = sourceWords(surah)
    .filter((w) => !locations || locations.includes(w.location))
    .map((w) => ({ location: w.location, arabic: script === "indopak" ? indopakText(w.location) : w.uthmani, meaning: w.meaning[lang] }));
  if (locations) expect(words.map((w) => w.location).sort()).toEqual([...locations].sort());
  await page.mouse.move(0, 0);
  return page.evaluate(
    ([src, words]) => {
      for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
      const drawn = new Function(`return (${src})`)() as typeof drawnWordInPage;
      return words.map((w) => drawn(w.location, w.arabic, w.meaning));
    },
    [DRAWN_WORD, words] as const,
  );
}

/** Wait for every Word card of Surah `surah` to be on the page. */
async function surahShown(page: Page, surah: number) {
  const last = sourceWords(surah).at(-1)!.location;
  await expect(page.locator(`[id="${last}"]`)).toBeAttached();
}

/** Expect every Word at `locations` drawn with its Arabic wholly in `colour`. */
export async function expectArabicIn(page: Page, surah: number, locations: string[], colour: string) {
  await surahShown(page, surah);
  await expect
    .poll(async () => (await drawnWords(page, surah, locations)).map(({ location, arabic }) => ({ location, arabic })))
    .toEqual(locations.map((location) => ({ location, arabic: [colour] })));
}

/** Expect no letter of the Arabic of any Word at `locations` (every Word of the Surah when none are given) drawn in either gold. */
export async function expectNotGold(page: Page, surah: number, locations?: string[]) {
  await surahShown(page, surah);
  // Wait out a change of Language or Script still being drawn: every card's Arabic first.
  let drawn: DrawnWord[] = [];
  await expect
    .poll(async () => {
      drawn = await drawnWords(page, surah, locations);
      return drawn.filter((w) => w.arabic === null).map((w) => w.location);
    }, { message: "Word cards whose Arabic the page lacks" })
    .toEqual([]);
  const gold = drawn.filter((w) => w.arabic!.some((c) => GOLDS.includes(c))).map((w) => w.location);
  expect(gold, "Word cards whose Arabic is gold").toEqual([]);
}

// ---------------------------------------------------------------- steps

Then("the Arabic of every Allah reference of Surah {int} in the seeded list is gold", async ({ reader: { page } }, surah: number) => {
  await expectArabicIn(page, surah, seededIn(surah), await goldOnPage(page));
});

Then(
  "the Arabic of every Allah reference of Surah {int} in the seeded list is drawn in {word}",
  async ({ reader: { page } }, surah: number, hex: string) => {
    await expectArabicIn(page, surah, seededIn(surah), rgb(hex));
  },
);

Then("the Arabic of no Word card of Surah {int} is gold", async ({ reader: { page } }, surah: number) => {
  await expectNotGold(page, surah);
});

Then("the Arabic of no other Word card of Surah {int} is gold", async ({ reader: { page } }, surah: number) => {
  const listed = new Set(seeded());
  await expectNotGold(page, surah, sourceWords(surah).map((w) => w.location).filter((l) => !listed.has(l)));
});

Then("the Arabic of the Word card at {location} is gold", async ({ reader: { page } }, location: string) => {
  await expectArabicIn(page, Number(location.split(":")[0]), [location], await goldOnPage(page));
});

Then("the Arabic of the Word card at {location} is not gold", async ({ reader: { page } }, location: string) => {
  await expectNotGold(page, Number(location.split(":")[0]), [location]);
});

Given(
  "the Word at {location} is not in the seeded list, but shares its Lemma with the Word at {location}, which is",
  async ({}, word: string, listed: string) => {
    expect(seeded(), "the seeded list").not.toContain(word);
    expect(seeded(), "the seeded list").toContain(listed);
    const { lemmaOf, lemmaText } = qulAnalysis();
    const lemma = lemmaOf.get(word);
    expect(lemma, `QUL gives ${word} a Lemma`).toBeDefined();
    expect(lemmaText.get(lemmaOf.get(listed)!), `the Lemma of ${listed}`).toBe(lemmaText.get(lemma!));
  },
);

Then(
  "on every Allah reference of Surah {int} in the seeded list, neither the Word meaning nor the Root tag is gold",
  async ({ reader: { page } }, surah: number) => {
    await surahShown(page, surah);
    const drawn = await drawnWords(page, surah, seededIn(surah));
    for (const w of drawn) {
      expect(w.meaning, `the Word meaning at ${w.location}`).not.toBeNull();
      expect(GOLDS, `the Word meaning at ${w.location}`).not.toContain(w.meaning);
      if (w.root !== null) expect(GOLDS, `the Root tag at ${w.location}`).not.toContain(w.root);
    }
  },
);

Then(
  "on every Allah reference of Surah {int} in the seeded list, the Word meaning and the Root tag are drawn as on the Word card at {location}, which is not one",
  async ({ reader: { page } }, surah: number, other: string) => {
    expect(seeded(), "the seeded list").not.toContain(other);
    await surahShown(page, surah);
    const [plain] = await drawnWords(page, surah, [other]);
    expect(plain.meaning, `the Word meaning at ${other}`).not.toBeNull();
    expect(plain.root, `the Root tag at ${other}`).not.toBeNull();
    const drawn = await drawnWords(page, surah, seededIn(surah));
    for (const w of drawn) {
      expect(w.meaning, `the Word meaning at ${w.location}`).toBe(plain.meaning);
      if (w.root !== null) expect({ root: w.root, background: w.rootBackground }, `the Root tag at ${w.location}`).toEqual({ root: plain.root, background: plain.rootBackground });
    }
  },
);

// ---------------------------------------------------------------- the Recited Word

/** What the page noted, on `window`, of the Word cards it marked as the Recited Word. */
interface RecitedGold {
  /** By Word location: whether the audio was playing, and each colour of the Arabic's letters, when the card was marked. */
  allahRecited?: Record<string, { playing: boolean; arabic: string[] | null }>;
}

When("the Recitation reaches where the Reciter first says the Word at {location}", async ({ reader: { page } }, location: string) => {
  const [s, a, w] = location.split(":").map(Number);
  const timing = sourceRecitedAyah(`${s}:${a}`).timings.find(([word]) => word === w);
  if (!timing) throw new Error(`the Recitation source never times the Word at ${location}`);
  const word = sourceWords(s).find((x) => x.location === location)!;
  // Note the card's Arabic the moment it is marked: it is marked only while the Reciter says it.
  await page.evaluate(
    ([src, location, arabic, meaning]) => {
      const notes = window as unknown as RecitedGold;
      notes.allahRecited ??= {};
      const drawn = new Function(`return (${src})`)() as typeof drawnWordInPage;
      const el = document.getElementById(location)!;
      const note = () => {
        if (!el.hasAttribute("data-recited") || notes.allahRecited![location]) return;
        // The audio element the page plays, as recitation.steps.ts notes it before the page runs.
        const audio = (window as unknown as { recitation?: HTMLAudioElement }).recitation;
        notes.allahRecited![location] = { playing: !!audio && !audio.paused, arabic: drawn(location, arabic, meaning).arabic };
      };
      new MutationObserver(note).observe(el, { attributes: true, attributeFilter: ["data-recited"] });
      note();
    },
    [DRAWN_WORD, location, word.uthmani, word.meaning[languageOn(page)]] as const,
  );
  await reach(page, timing[1] + 30);
});

Then(
  "while the Word card at {location} is marked as the Recited Word, its Arabic is gold",
  async ({ reader: { page } }, location: string) => {
    const gold = await goldOnPage(page);
    await expect
      .poll(() => page.evaluate((at) => (window as unknown as RecitedGold).allahRecited?.[at] ?? null, location))
      .toEqual({ playing: true, arabic: [gold] });
  },
);
