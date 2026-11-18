// Steps for #250: Known words colour. The switch is found as the other reader
// settings' steps find theirs (./allah-reference-colour-switch.steps.ts); a
// Word card's tint is read as the Phrase colours' steps read it
// (./phrase-colours.steps.ts), and each Word's Root comes from QUL's word root
// database (./roots), never typed. Known Roots are stored as a reader marks
// them (ADR 0057) before the page is opened.

import { expect, type Locator, type Page } from "@playwright/test";
import { card, sourceWords, STRINGS } from "../support";
import { ALLAH_REFERENCE_CONTRAST, isSeededAllahReference } from "./allah-references";
import { drawerSwitch } from "./allah-reference-colour-switch.steps";
import { Given, resolveColor, Then, When, type Reading } from "./fixtures";
import { contrast, drawnCards, firstCardFrame, wordsOf, type DrawnCard } from "./phrase-colours.steps";
import { controlAfter, inSettings, settingsPanel } from "./reader";
import { qulAnalysis, rootAt } from "./roots";

// ---------------------------------------------------------------- Known Roots

/** Stores Roots or particles, by kind and text, as this browser's Known words, as Memorized? would, from a page of the site. */
export async function knowWords(page: Page, words: { kind: string; text: string }[]) {
  await page.goto("/en/credits");
  const entries = words.map(({ kind, text }, i) => ({ kind, text, known: true, markedAt: 1_700_000_000_000 + i }));
  await page.evaluate((stored) => localStorage.setItem("qwt-known-words", stored), JSON.stringify(entries));
}

/** Stores `letters` as this browser's Known Roots. */
const knowRoots = (page: Page, letters: string[]) => knowWords(page, letters.map((text) => ({ kind: "root", text })));

/** The quoted Root letters of a step: `"ر ح م", "ح م د"`. */
const quotedRoots = (list: string) => [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/** The letters of every Root QUL gives a Word of Surah `surah`. */
const rootsOf = (surah: number) => [...new Set(sourceWords(surah).flatMap((w) => rootAt(w.location)?.letters ?? []))];

Given(/^this browser knows the Roots ((?:"[^"]+"(?:, )?)+)$/, async ({ reader }, list: string) => {
  await knowRoots(reader.page, quotedRoots(list));
});

Given("this browser knows every Root of Surah {int}", async ({ reader }, surah: number) => {
  await knowRoots(reader.page, rootsOf(surah));
});

Given("this browser knows every Root", async ({ reader }) => {
  await knowRoots(reader.page, [...qulAnalysis().roots.values()].map((r) => r.letters));
});

// ---------------------------------------------------------------- the switch

const knownSwitch = (page: Page) => drawerSwitch(page, STRINGS.knownWordsColour);
const allahSwitch = (page: Page) => drawerSwitch(page, STRINGS.allahReferenceColour);
const phraseSwitch = (page: Page) => drawerSwitch(page, STRINGS.phraseColours);

When(/^I turn Known words colour (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = knownSwitch(reader.page);
    // Turning it on starts from off, and off from on.
    await expect(toggle).toBeChecked({ checked: state === "off" });
    await toggle.click();
    await expect(toggle).toBeChecked({ checked: state === "on" });
  });
});

Then(/^the Known words colour switch is (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, () => expect(knownSwitch(reader.page)).toBeChecked({ checked: state === "on" }));
});

Then("the Known words colour switch comes straight after the Allah reference colour switch", async ({ reader }) => {
  const page = reader.page;
  await inSettings(page, async () => {
    await expect(knownSwitch(page)).toHaveCount(1);
    const allah = allahSwitch(page);
    await expect(allah).toHaveCount(1);
    const after = await controlAfter(page, allah);
    expect(after, "the control after the Allah reference colour switch").toBe(STRINGS.knownWordsColour);
  });
});

/** The Phrase colours switch's note that Known words colour is on, by its text. */
const knownNote = (page: Page) => settingsPanel(page).getByText(STRINGS.phraseColoursKnownNote, { exact: true });

Then("the Phrase colours switch is greyed out, with a note that Known words colour is on", async ({ reader }) => {
  const page = reader.page;
  await inSettings(page, async () => {
    const toggle = phraseSwitch(page);
    await expect(toggle).toBeDisabled();
    await expect(knownNote(page)).toBeVisible();
    // Greyed out: drawn fainter than the Allah reference colour switch.
    const opacity = (l: Locator) => l.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await opacity(toggle)).toBeLessThan(await opacity(allahSwitch(page)));
  });
});

Then("the Phrase colours switch can be used, with no note", async ({ reader }) => {
  const page = reader.page;
  await inSettings(page, async () => {
    await expect(phraseSwitch(page)).toBeEnabled();
    await expect(knownNote(page)).toBeHidden();
  });
});

// ---------------------------------------------------------------- the green

/** Whether an `rgb(r, g, b)` colour is green: its green channel the strongest of the three. */
const isGreen = (colour: string) => {
  const [r, g, b] = (colour.match(/\d+/g) ?? []).map(Number);
  return g > r && g > b;
};

/** Expect Surah `surah`'s Words whose Root is one of `letters` drawn on one green, and every other Word on the paper. */
const expectGreen = (page: Page, surah: number, lang: "ur" | "en", letters: string[]) =>
  expectGreenWhere(page, surah, lang, (location) => letters.includes(rootAt(location)?.letters ?? ""), `has a Root of ${letters.join(", ")}`);

/** Expect Surah `surah`'s known Words (`known`, which some Word `is`) drawn on one green, and every other Word on the paper. */
export async function expectGreenWhere(page: Page, surah: number, lang: "ur" | "en", known: (location: string) => boolean, is: string): Promise<DrawnCard[]> {
  const words = wordsOf(surah, lang);
  expect(words.some((w) => known(w.location)), `some Word of Surah ${surah} ${is}`).toBe(true);
  await expect(card(page, words.at(-1)!.location)).toBeAttached({ timeout: 30_000 });
  let drawn: DrawnCard[] = [];
  await expect(async () => {
    drawn = await drawnCards(page, words);
    const greens = new Set(drawn.filter((d) => known(d.location)).map((d) => d.tint));
    expect([...greens], "the known Words are drawn on one tint").toHaveLength(1);
    const [green] = greens;
    expect(isGreen(green), `${green} is green`).toBe(true);
    const wrong = drawn
      .map((d) => ({ location: d.location, want: known(d.location) ? green : d.paper, got: d.tint }))
      .filter((x) => x.want !== x.got)
      .map((x) => `${x.location}: ${x.got}, not ${x.want}`);
    expect(wrong, `each Word card's tint (green ${green}, paper ${drawn[0].paper})`).toEqual([]);
  }).toPass({ timeout: 5_000 });
  return drawn.filter((d) => known(d.location));
}

Then(/^the Word cards of Surah (\d+) whose Root is ((?:"[^"]+"(?:, )?)+) are green, and no other Word card is tinted$/, async ({ reader }, surah: string, list: string) => {
  await expectGreen(reader.page, Number(surah), reader.language, quotedRoots(list));
});

Then("every Word card of Surah {int} with a Root is green, all in one green", async ({ reader, reading }, surah: number) => {
  notesOf(reading).greenCards = await expectGreen(reader.page, surah, reader.language, rootsOf(surah));
});

Then(
  "on every green Word card of Surah 1 the Arabic and the Word meaning contrast with the green by at least {float} to 1, an Allah reference's Arabic by 3 to 1",
  async ({ reading }, ratio: number) => {
    const cards = notesOf(reading).greenCards;
    expect(cards?.length, "green Word cards noted").toBeGreaterThan(0);
    const low = cards!.flatMap((d) =>
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
    expect(cards!.some((d) => isSeededAllahReference(d.location)), "an Allah reference is among the green Word cards").toBe(true);
    expect(low).toEqual([]);
  },
);

Then("the Word card at 1:1:1 was green in the first frame the page was drawn in", async ({ reader }) => {
  const first = await firstCardFrame(reader.page);
  expect(first.tint, "the Word card at 1:1:1 in the first frame, against the paper").not.toBe(first.paper);
  expect(isGreen(first.tint), `${first.tint} is green`).toBe(true);
});

Then("the Recited Word's card is ringed in the accent, over the green when its Word has a Root", async ({ reader }) => {
  const page = reader.page;
  const accent = await resolveColor(page, "var(--accent)");
  await expect(async () => {
    const recited = page.locator("main div[id][data-recited]");
    await expect(recited).toHaveCount(1, { timeout: 500 });
    const location = (await recited.getAttribute("id"))!;
    const [d] = await drawnCards(page, wordsOf(Number(location.split(":")[0]), reader.language).filter((w) => w.location === location));
    const ring = await recited.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(ring, `the ring of the Recited Word at ${location}`).toBe(accent);
    if (rootAt(location)) expect(isGreen(d.tint), `the Recited Word at ${location} is on the green (${d.tint})`).toBe(true);
    else expect(d.tint, `the Recited Word at ${location}, a Word with no Root, is on the paper`).toBe(d.paper);
  }).toPass({ timeout: 5_000 });
});

// ---------------------------------------------------------------- drawn again

/** In the page: every Word card added, removed or changed since the watch began. */
type Watched = { __redrawn?: string[] };

When("I watch Surah {int}'s Word cards for being drawn again", async ({ reader }, surah: number) => {
  await expect(card(reader.page, sourceWords(surah).at(-1)!.location)).toBeAttached();
  await reader.page.evaluate(() => {
    const w = window as unknown as Watched;
    w.__redrawn = [];
    const isCard = (n: Node) => n instanceof Element && /^\d+:\d+:\d+$/.test(n.id);
    const cardsIn = (n: Node) => (n instanceof Element ? [n, ...n.querySelectorAll("[id]")].filter(isCard).map((c) => c.id) : []);
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes" && isCard(r.target)) w.__redrawn!.push(`${(r.target as Element).id} ${r.attributeName}`);
        for (const n of [...r.addedNodes, ...r.removedNodes]) w.__redrawn!.push(...cardsIn(n));
        if (r.type === "childList" && r.target instanceof Element && r.target.closest("[id]") && isCard(r.target.closest("[id]")!)) w.__redrawn!.push(r.target.closest("[id]")!.id);
      }
    }).observe(document.querySelector("main")!, { subtree: true, childList: true, attributes: true, characterData: true });
  });
});

Then("no Word card was drawn again", async ({ reader }) => {
  expect(await reader.page.evaluate(() => (window as unknown as Watched).__redrawn)).toEqual([]);
});

// ---------------------------------------------------------------- pages without it

interface Noted {
  green?: string;
  greenCards?: DrawnCard[];
}
const noted = new WeakMap<Reading, Noted>();
const notesOf = (reading: Reading): Noted => {
  if (!noted.has(reading)) noted.set(reading, {});
  return noted.get(reading)!;
};

Given("I note the green of the Word card at {location}", async ({ reader, reading }, location: string) => {
  const words = wordsOf(Number(location.split(":")[0]), reader.language).filter((w) => w.location === location);
  await expect(card(reader.page, location)).toBeAttached({ timeout: 30_000 });
  await expect(async () => {
    const [drawn] = await drawnCards(reader.page, words);
    expect(isGreen(drawn.tint), `the Word card at ${location} is green (${drawn.tint})`).toBe(true);
  }).toPass({ timeout: 5_000 });
  // The card's own background, as an element on another page would compute it.
  notesOf(reading).green = await card(reader.page, location).evaluate((el) => getComputedStyle(el).backgroundColor);
});

Then("nothing on the page is drawn in the noted green", async ({ reader, reading }) => {
  const green = notesOf(reading).green;
  expect(green, "the green noted earlier").toBeDefined();
  const page = reader.page;
  await page.waitForLoadState("load");
  await expect(page.locator("main")).toBeVisible();
  // Some Words of the page are in it, as a check that it drew what it shows.
  await expect.poll(() => page.locator("main [lang=ar]").count(), { message: "Arabic on the page" }).toBeGreaterThan(0);
  const greenOnes = await page.evaluate((green) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    return Array.from(document.querySelectorAll("*"))
      .filter((el) => getComputedStyle(el).backgroundColor === green)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} ${el.textContent?.trim().slice(0, 30)}`);
  }, green!);
  expect(greenOnes).toEqual([]);
});
