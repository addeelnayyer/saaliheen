// Steps for #99: Phrase colours in Quran Analysis, the setting that switches
// them, Share pages without them, and the Phrases the published Surah files
// carry. Expected Phrases and Passages are read from the committed Phrases
// and Passages files (./phrases), never typed.
//
// A Word card's tint is the colour drawn behind it: every background from the
// page's canvas down to the card, composited as the browser paints them,
// read with the pointer away from every card.

import { expect, type Page } from "@playwright/test";
import { blockStorage, card, sourceWords, STRINGS } from "../support";
import { ALLAH_REFERENCE_CONTRAST, isSeededAllahReference } from "./allah-references";
import { Given, Then, When, type Reading } from "./fixtures";
import { expectedColour, phrasedWords, passageName, type FilePhrase, filePhrases } from "./phrases";
import { inSettings, settingsPanel, stepper } from "./reader";
import { rootAt } from "./roots";

// ---------------------------------------------------------------- reading colours in the page

/**
 * In the page: the colour drawn behind `el`, and `over` (a CSS colour) drawn
 * over it, each as `rgb(r, g, b)`. Each background from the root down is
 * painted on a one-pixel canvas, as the browser composites them. Self-contained:
 * it is sent into the page as source.
 */
function drawnInPage(el: Element, over?: string[]): { behind: string; over: string[] } {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  const chain: Element[] = [];
  for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
  const paint = () => {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1, 1);
    for (const e of chain) {
      ctx.fillStyle = getComputedStyle(e).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
    }
  };
  const read = () => {
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
  paint();
  const behind = read();
  const drawnOver = (over ?? []).map((colour) => {
    paint();
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 1, 1);
    return read();
  });
  return { behind, over: drawnOver };
}
/** drawnInPage as source, to send into the page. */
export const DRAWN = drawnInPage.toString();

/** A Word card as drawn: its tint, the page's paper, and its Arabic's, Word meaning's and Root tag's colours. */
export interface DrawnCard {
  location: string;
  tint: string;
  paper: string;
  arabic: string | null;
  meaning: string | null;
  root: string | null;
  rootBackground: string | null;
  /** The Arabic's and the Word meaning's colours drawn over the tint, opaque. */
  arabicOnTint: string | null;
  meaningOnTint: string | null;
}

/** Each Word card at `words` as drawn once its transitions end; a card the page lacks is reported as missing. */
export async function drawnCards(page: Page, words: { location: string; uthmani: string; meaning: string }[]): Promise<DrawnCard[]> {
  await page.mouse.move(0, 0);
  return page.evaluate(
    ([src, words]) => {
      // A card's background eases over .15s when a setting changes it, and an
      // off-screen Ayah (content-visibility) may never run its ease: read each
      // card as it is once its transitions end.
      for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
      const drawn = new Function(`return (${src})`)() as typeof drawnInPage;
      const paper = drawn(document.body).behind;
      return words.map(({ location, uthmani, meaning }) => {
        const el = document.getElementById(location);
        if (!el) return { location, tint: "missing", paper, arabic: null, meaning: null, root: null, rootBackground: null, arabicOnTint: null, meaningOnTint: null };
        const shown = Array.from(el.children).filter((c) => getComputedStyle(c).display !== "none");
        const ar = shown.find((c) => c.tagName !== "BUTTON" && c.textContent === uthmani) ?? shown[0];
        const mean = shown.find((c) => c !== ar && c.textContent?.trim() === meaning.trim());
        const root = shown.find((c) => c.tagName === "BUTTON");
        const colour = (c: Element | undefined) => (c ? getComputedStyle(c).color : null);
        const { behind, over } = drawn(el, [colour(ar) ?? "transparent", colour(mean) ?? "transparent"]);
        return {
          location,
          tint: behind,
          paper,
          arabic: colour(ar),
          meaning: colour(mean),
          root: colour(root),
          rootBackground: root ? getComputedStyle(root).backgroundColor : null,
          arabicOnTint: ar ? over[0] : null,
          meaningOnTint: mean ? over[1] : null,
        };
      });
    },
    [DRAWN, words] as const,
  );
}

/** Surah `surah`'s Words, each with its Arabic and its Word meaning in `lang`. */
export const wordsOf = (surah: number, lang: "ur" | "en") =>
  sourceWords(surah).map((w) => ({ location: w.location, uthmani: w.uthmani, meaning: w.meaning[lang] }));

/** WCAG 2 contrast ratio of two `rgb(r, g, b)` colours. */
export function contrast(a: string, b: string): number {
  const luminance = (c: string) => {
    const [r, g, bl] = (c.match(/\d+/g) ?? []).slice(0, 3).map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- what a scenario noted

interface Noted {
  /** Tint A and tint B, as the Surah page drew them. */
  tints?: { a: string; b: string };
  /** The Arabic's, Word meaning's and Root tag's colours on an untinted Word card. */
  untinted?: Pick<DrawnCard, "arabic" | "meaning" | "root" | "rootBackground">;
}
const noted = new WeakMap<Reading, Noted>();
const notesOf = (reading: Reading): Noted => {
  if (!noted.has(reading)) noted.set(reading, {});
  return noted.get(reading)!;
};

// ---------------------------------------------------------------- the tints

/**
 * Al-Fatihah's Word cards are tinted as its Phrases say: in each Passage the
 * first Phrase's Words take tint A, the next Phrase's tint B, and so on, a
 * Phrase keeping its tint across an Ayah's end. Returns tint A and tint B.
 */
export async function expectFatihahTinted(page: Page, lang: "ur" | "en"): Promise<{ a: string; b: string }> {
  const words = phrasedWords(1);
  for (const w of words) expect(w.covered, `Al-Fatihah's Passage ${passageName(w.passage)} is covered by the Phrases file`).toBe(true);
  // So the check can tell alternation from chance: a Passage has more than one
  // Phrase. None of Al-Fatihah's Phrases runs past an Ayah's end, so carrying a
  // tint across one is left to the dataset's scenarios (dataset/phrases.feature).
  expect(words.some((w) => w.phrase! > 0), "some Passage of Al-Fatihah has more than one Phrase").toBe(true);

  await expect(card(page, words.at(-1)!.location)).toBeAttached({ timeout: 30_000 });
  let tints = { a: "", b: "" };
  await expect(async () => {
    const drawn = await drawnCards(page, wordsOf(1, lang));
    const at = new Map(drawn.map((d) => [d.location, d]));
    const firstOf = (colour: "a" | "b") => at.get(words.find((w) => expectedColour(w) === colour)!.location)!.tint;
    tints = { a: firstOf("a"), b: firstOf("b") };
    const paper = drawn[0].paper;
    expect(tints.a, "tint A is not the page's paper").not.toBe(paper);
    expect(tints.b, "tint B is not the page's paper").not.toBe(paper);
    expect(tints.a, "tint A differs from tint B").not.toBe(tints.b);
    const wrong = words
      .map((w) => ({ location: w.location, want: expectedColour(w) === "a" ? tints.a : tints.b, got: at.get(w.location)!.tint }))
      .filter((x) => x.want !== x.got)
      .map((x) => `${x.location}: ${x.got}, not ${x.want}`);
    expect(wrong, `each Word card's tint (A ${tints.a}, B ${tints.b})`).toEqual([]);
  }).toPass({ timeout: 5_000 });
  return tints;
}

Then(
  "Al-Fatihah's Word cards alternate between tint A and tint B Phrase by Phrase, each Passage starting on tint A",
  async ({ reader, reading }) => {
    notesOf(reading).tints = await expectFatihahTinted(reader.page, reader.language);
  },
);

Given("I note the two tints of Al-Fatihah's Word cards", async ({ reader, reading }) => {
  notesOf(reading).tints = await expectFatihahTinted(reader.page, reader.language);
});

Given("Surah {int}'s Passages are not covered by the Phrases file", async ({}, surah: number) => {
  const covered = [...new Set(phrasedWords(surah).filter((w) => w.covered).map((w) => passageName(w.passage)))];
  expect(covered, `Surah ${surah}'s covered Passages`).toEqual([]);
});

/** No Word of Surah `surah` is drawn on anything but the page's paper: no Word card in Study, no Word in Flowing (#125). */
export async function expectUntinted(page: Page, surah: number, lang: "ur" | "en") {
  const words = wordsOf(surah, lang);
  await expect(card(page, words.at(-1)!.location)).toBeAttached({ timeout: 30_000 });
  await expect(async () => {
    const drawn = await drawnCards(page, words);
    const tinted = drawn.filter((d) => d.tint !== d.paper).map((d) => `${d.location}: ${d.tint}`);
    expect(tinted, `Words drawn on something other than the paper (${drawn[0].paper})`).toEqual([]);
  }).toPass({ timeout: 5_000 });
}

Then("no Word card of Surah {int} is tinted", async ({ reader }, surah: number) => {
  await expectUntinted(reader.page, surah, reader.language);
});

// ---------------------------------------------------------------- readable tints

Given(
  "I note the colours of the Arabic, the Word meaning and the Root tag on the untinted Word card at {location}",
  async ({ reader, reading }, location: string) => {
    const surah = Number(location.split(":")[0]);
    const word = wordsOf(surah, reader.language).find((w) => w.location === location)!;
    await expect(card(reader.page, location)).toBeAttached();
    let d: DrawnCard | undefined;
    await expect(async () => {
      [d] = await drawnCards(reader.page, [word]);
      expect(d.tint, `the Word card at ${location} is drawn on the paper`).toBe(d.paper);
      expect([d.arabic, d.meaning, d.root], "its Arabic, Word meaning and Root tag are found").not.toContain(null);
    }).toPass({ timeout: 5_000 });
    notesOf(reading).untinted = { arabic: d!.arabic, meaning: d!.meaning, root: d!.root, rootBackground: d!.rootBackground };
  },
);

Then(
  "the Arabic, the Word meaning and the Root tag on every tinted Word card of Al-Fatihah keep their noted colours",
  async ({ reader, reading }) => {
    const before = notesOf(reading).untinted;
    expect(before, "colours noted on an untinted Word card").toBeDefined();
    const drawn = await drawnCards(reader.page, wordsOf(1, reader.language));
    const changed = drawn
      .filter((d) => d.tint !== d.paper)
      .flatMap((d) =>
        (["arabic", "meaning", "root", "rootBackground"] as const)
          // A Word QUL gives no Root (a particle or pronoun) has no Root tag to keep.
          .filter((k) => !((k === "root" || k === "rootBackground") && rootAt(d.location) === null))
          // An Allah reference's Arabic is in Allah reference colour over the tint (#147, allah-reference-colour.feature).
          .filter((k) => !(k === "arabic" && isSeededAllahReference(d.location)))
          .filter((k) => d[k] !== before![k])
          .map((k) => `${d.location} ${k}: ${d[k]}, not ${before![k]}`),
      );
    expect(drawn.some((d) => d.tint !== d.paper), "some Word card of Al-Fatihah is tinted").toBe(true);
    expect(changed).toEqual([]);
  },
);

Then(
  "on every tinted Word card of Al-Fatihah the Arabic and the Word meaning contrast with the tint by at least {float} to {int}",
  async ({ reader }, ratio: number, one: number) => {
    expect(one).toBe(1);
    const drawn = await drawnCards(reader.page, wordsOf(1, reader.language));
    const tinted = drawn.filter((d) => d.tint !== d.paper);
    expect(tinted.length, "some Word card of Al-Fatihah is tinted").toBeGreaterThan(0);
    const low = tinted.flatMap((d) =>
      (
        [
          ["Arabic", d.arabicOnTint],
          ["Word meaning", d.meaningOnTint],
        ] as const
      )
        .map(([what, colour]) => ({ what, colour, ratio: colour ? contrast(colour, d.tint) : 0 }))
        .filter((x) => x.ratio < (x.what === "Arabic" && isSeededAllahReference(d.location) ? ALLAH_REFERENCE_CONTRAST : ratio))
        .map((x) => `${d.location} ${x.what}: ${x.colour} on ${d.tint} is ${x.ratio.toFixed(2)} to 1`),
    );
    expect(low).toEqual([]);
  },
);

// ---------------------------------------------------------------- the setting

/** The Phrase colours switch: a switch (or checkbox) by its name, in the Settings drawer. */
const phraseColoursSwitch = (page: Page) =>
  settingsPanel(page)
    .getByRole("switch", { name: STRINGS.phraseColours, exact: true })
    .or(settingsPanel(page).getByRole("checkbox", { name: STRINGS.phraseColours, exact: true }))
    .first();

When(/^I turn Phrase colours (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = phraseColoursSwitch(reader.page);
    // Turning them on starts from off, and off from on.
    if (state === "on") await expect(toggle).not.toBeChecked();
    else await expect(toggle).toBeChecked();
    await toggle.click();
    if (state === "on") await expect(toggle).toBeChecked();
    else await expect(toggle).not.toBeChecked();
  });
});

Then(/^the Phrase colours switch is (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = phraseColoursSwitch(reader.page);
    if (state === "on") await expect(toggle).toBeChecked();
    else await expect(toggle).not.toBeChecked();
  });
});

Then("the Phrase colours switch sits next to Arabic size, with no other control between them", async ({ reader }) => {
  const page = reader.page;
  const toggle = phraseColoursSwitch(page);
  const arabicSize = stepper(page, "Arabic size").group;
  await expect(toggle).toHaveCount(1);
  await expect(arabicSize).toHaveCount(1);
  const [toggleHandle, groupHandle] = [await toggle.elementHandle(), await arabicSize.elementHandle()];
  // The drawer's controls in document order: Arabic size's own controls, then
  // or before them the Phrase colours switch, with nothing else in between.
  const between = await settingsPanel(page).evaluate(
    (drawer, [toggle, group]) => {
      const controls = Array.from(drawer.querySelectorAll("button, input, select, textarea, [role=switch], [role=checkbox]"))
        .filter((c) => !c.closest("[aria-hidden=true]"))
        .map((c) => (group!.contains(c) ? "Arabic size" : c === toggle || toggle!.contains(c) || c.contains(toggle!) ? "Phrase colours" : c.getAttribute("aria-label") || c.textContent?.trim() || c.tagName))
        .filter((name, i, all) => i === 0 || name !== all[i - 1] || (name !== "Arabic size" && name !== "Phrase colours"));
      const at = controls.indexOf("Phrase colours");
      return { at, before: controls[at - 1] ?? null, after: controls[at + 1] ?? null };
    },
    [toggleHandle, groupHandle] as const,
  );
  expect(between.at, "the Phrase colours switch is among the drawer's controls").toBeGreaterThanOrEqual(0);
  expect([between.before, between.after], "the controls on either side of the Phrase colours switch").toContain("Arabic size");
});

// ---------------------------------------------------------------- the first frame

/**
 * Record, in the first animation frame in which the Word card at 1:1:1 exists
 * (just before the browser paints it), the colour drawn behind it and the
 * page's paper. Installed before any of the page's scripts on every load.
 */
async function watchFirstCardFrame(page: Page) {
  await page.addInitScript((src: string) => {
    const w = window as unknown as { __firstCard?: { tint: string; paper: string } | null };
    w.__firstCard = null;
    const drawn = new Function(`return (${src})`)() as typeof drawnInPage;
    const look = () => {
      const el = document.getElementById("1:1:1");
      if (el && document.body) w.__firstCard = { tint: drawn(el).behind, paper: drawn(document.body).behind };
      else requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, DRAWN);
}

export async function firstCardFrame(page: Page) {
  await page.waitForLoadState("load");
  const read = () => page.evaluate(() => (window as unknown as { __firstCard?: { tint: string; paper: string } | null }).__firstCard ?? null);
  await expect.poll(read, { message: "the Word card at 1:1:1 was drawn" }).not.toBeNull();
  return (await read())!;
}

const watched = new WeakSet<Page>();
When("I reload the page, watching the first frame it is drawn in", async ({ reader }) => {
  if (!watched.has(reader.page)) {
    await watchFirstCardFrame(reader.page);
    watched.add(reader.page);
  }
  await reader.page.reload();
});

Then("no Word card of Surah 1 was tinted in the first frame the page was drawn in", async ({ reader }) => {
  const first = await firstCardFrame(reader.page);
  expect(first.tint, "the Word card at 1:1:1 in the first frame, against the paper").toBe(first.paper);
});

Then("Al-Fatihah's Word cards were already tinted in the first frame the page was drawn in", async ({ reader, reading }) => {
  const first = await firstCardFrame(reader.page);
  const tints = notesOf(reading).tints;
  expect(tints, "the tints noted earlier in the scenario").toBeDefined();
  expect(expectedColour(phrasedWords(1)[0]), "the first Word of Al-Fatihah takes Phrase colour a").toBe("a");
  expect(first.tint, "the Word card at 1:1:1 in the first frame").toBe(tints!.a);
});

// ---------------------------------------------------------------- storage unavailable

Given("a browser whose storage is unavailable", async ({ reader }) => {
  const context = await reader.newContext();
  await blockStorage(context);
  reader.page = await context.newPage();
});

// ---------------------------------------------------------------- Share pages

Then(/^nothing on the (?:Share|Grammar) page is drawn in either noted tint$/, async ({ reader, reading }) => {
  const tints = notesOf(reading).tints;
  expect(tints, "the tints noted earlier in the scenario").toBeDefined();
  const page = reader.page;
  await expect(page.locator("main")).toBeVisible();
  await page.waitForLoadState("load");
  await page.mouse.move(0, 0);
  const inTint = await page.evaluate(
    ([src, tints]) => {
      const drawn = new Function(`return (${src})`)() as typeof drawnInPage;
      return Array.from(document.body.querySelectorAll("*"))
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => ({ el, behind: drawn(el).behind }))
        .filter(({ behind }) => behind === tints.a || behind === tints.b)
        .slice(0, 10)
        .map(({ el, behind }) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${el.className}: ${behind}`);
    },
    [DRAWN, tints!] as const,
  );
  expect(inTint, `elements drawn in tint A (${tints!.a}) or tint B (${tints!.b})`).toEqual([]);
});

// ---------------------------------------------------------------- the published Surah files

interface PublishedSurah {
  phrases?: FilePhrase[];
  ayahs: { words: { location: string; phraseColour?: unknown }[] }[];
}
const publishedSurah = (reading: Reading): PublishedSurah => {
  expect(reading.file, "a fetched Surah file").toBeDefined();
  return JSON.parse(reading.file!.body) as PublishedSurah;
};

/** Surah `surah`'s Phrases in the Phrases file, in Quran order. */
function phrasesListedIn(surah: number): FilePhrase[] {
  const order = new Map(sourceWords(surah).map((w, i) => [w.location, i]));
  return filePhrases()
    .filter((p) => Number(p.first.split(":")[0]) === surah)
    .sort((x, y) => order.get(x.first)! - order.get(y.first)!);
}

Then("the file's Phrases are Surah {int}'s Phrases in the Phrases file, in Quran order", async ({ reading }, surah: number) => {
  const listed = phrasesListedIn(surah);
  expect(listed.length, `the Phrases file lists Phrases in Surah ${surah}`).toBeGreaterThan(0);
  expect(publishedSurah(reading).phrases?.map(({ first, last }) => ({ first, last }))).toEqual(listed.map(({ first, last }) => ({ first, last })));
});

Then(
  'each Word in the file carries the Phrase colour its Phrase takes, alternating from "a" at the first Phrase of each covered Passage',
  async ({ reading }) => {
    const file = publishedSurah(reading);
    const surah = Number(file.ayahs[0].words[0].location.split(":")[0]);
    const want = new Map(phrasedWords(surah).map((w) => [w.location, expectedColour(w)]));
    const wrong = file.ayahs
      .flatMap((a) => a.words)
      .filter((w) => w.phraseColour !== want.get(w.location))
      .map((w) => `${w.location}: ${JSON.stringify(w.phraseColour)}, not ${JSON.stringify(want.get(w.location))}`);
    expect([...want.values()].some(Boolean), `some Word of Surah ${surah} takes a Phrase colour`).toBe(true);
    expect(wrong).toEqual([]);
  },
);

Then(
  "the file's Phrases are those the Phrases file lists in Surah {int}, and no Word in it carries a Phrase colour",
  async ({ reading }, surah: number) => {
    const file = publishedSurah(reading);
    expect(file.phrases, "the file's Phrases").toEqual(phrasesListedIn(surah).map(({ first, last }) => ({ first, last })));
    const coloured = file.ayahs.flatMap((a) => a.words).filter((w) => "phraseColour" in w).map((w) => w.location);
    expect(coloured, "Words carrying a Phrase colour").toEqual([]);
  },
);
