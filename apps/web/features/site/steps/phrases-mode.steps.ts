// Steps for #100: Phrases mode in the Passage editor. The toolbar's "Phrases"
// switch, Word cards Ayah by Ayah, their Phrase colours, unmarked Words and
// each Passage heading's progress. Expected Words, Arabic and Word meanings
// come from the sources; Phrases and Passages from what Neon holds, as
// ../passages-in-the-test-database.ts arranges the run's Postgres (#171); none
// is typed.
//
// A Word card is the element whose id is its Word location, as on a Surah
// page; its tint is the colour drawn behind it (DRAWN, phrase-colours.steps).

import { expect, type Locator, type Page } from "@playwright/test";
import { indopakText, sourceWords, type SourceWord } from "../support";
import { NEON_PHRASED, neonPassages, neonPhrases, written } from "../passages-in-the-test-database";
import { Given, Then, When, type Reading } from "./fixtures";
import { expectedColour, filePhrases, phrasedWords, type PhrasedWord } from "./phrases";
import { DRAWN } from "./phrase-colours.steps";
import { act, chosen, passage, shownRanges, surahOf } from "./passage-editor.steps";

// ------------------------------------------------------------------ locators

const toolbar = (page: Page) => page.getByRole("toolbar");
/** The toolbar's "Phrases" switch: a switch, or a pressable button, of that name. */
export const phrasesSwitch = (page: Page) =>
  toolbar(page).getByRole("switch", { name: "Phrases", exact: true }).or(toolbar(page).getByRole("button", { name: "Phrases", exact: true }));

/** The Word card at `location` in Passage `range`. */
export const wordCard = (page: Page, range: string, location: string) => passage(page, range).locator(`[id="${location}"]`);
/** The Word locations of the Word cards inside `scope`, in page order. */
export const cardIdsIn = (scope: Locator) =>
  scope.evaluate((r) => Array.from(r.querySelectorAll("[id]")).map((e) => e.id).filter((id) => /^\d+:\d+:\d+$/.test(id)));

// --------------------------------------------------------------- Neon's Phrases

/** Surah `surah`'s Words placed by Neon's Phrases and Passages. */
export const neonWords = (surah: number) => phrasedWords(surah, neonPhrases(), neonPassages());
/** The Words of the open Surah's Passage `range` in Neon. */
export const wordsOf = (reading: Reading, range: string) => {
  const words = neonWords(surahOf(reading)).filter((w) => written(w.passage) === range);
  if (words.length === 0) throw new Error(`Neon has no Passage ${range} in Surah ${surahOf(reading)}`);
  return words;
};
/** The tint the editor gives a Word: its Phrase's, alternating from A in its Passage, covered or not; undefined in no Phrase. */
export const editorColour = (w: PhrasedWord) => (w.phrase === undefined ? undefined : w.phrase % 2 === 0 ? "a" : "b");

// ------------------------------------------------------------ what was noted

export const tintsNoted = new WeakMap<Reading, { a: string; b: string }>();
const tintsOf = (reading: Reading) => {
  const tints = tintsNoted.get(reading);
  if (!tints) throw new Error("no tints noted from a reader's page in this scenario");
  return tints;
};

/** A Word card as drawn: where it is, what is drawn behind it, its outline, and what a screen reader is told of it. */
export interface Drawn {
  location: string;
  tint: string;
  paper: string;
  outline: string;
  description: string;
}

export async function drawnCards(page: Page, scope: Locator | null): Promise<Drawn[]> {
  await page.mouse.move(0, 0);
  const root = scope ?? page.locator("body");
  return root.evaluate((r, src) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const drawn = new Function(`return (${src})`)() as (el: Element) => { behind: string };
    const paper = drawn(document.body).behind;
    return Array.from(r.querySelectorAll("[id]"))
      .filter((e) => /^\d+:\d+:\d+$/.test(e.id))
      .map((e) => {
        const s = getComputedStyle(e);
        const described = [e.getAttribute("aria-description"), e.getAttribute("title"), ...(e.getAttribute("aria-describedby") ?? "").split(/\s+/).map((id) => (id ? document.getElementById(id)?.textContent : ""))];
        return {
          location: e.id,
          tint: drawn(e).behind,
          paper,
          outline: `${s.borderTopStyle} ${s.borderTopColor} ${s.outlineStyle} ${s.outlineColor}`,
          description: described.filter(Boolean).join(" "),
        };
      });
  }, DRAWN);
}

// -------------------------------------------------------------------- steps

Given("I note the two tints readers see on Al-Fatihah's Word cards", async ({ reader, reading }) => {
  const page = reader.page;
  await page.goto("/en/1", { waitUntil: "networkidle" });
  const words = phrasedWords(1);
  const cards = new Map((await drawnCards(page, null)).map((c) => [c.location, c]));
  const first = (colour: "a" | "b") => cards.get(words.find((w) => expectedColour(w) === colour)!.location)?.tint;
  const tints = { a: first("a")!, b: first("b")! };
  expect(tints.a, "a reader sees tint A on Al-Fatihah").toBeTruthy();
  expect(tints.a, "tint A differs from tint B").not.toBe(tints.b);
  tintsNoted.set(reading, tints);
});

Given("the committed Phrases have no Phrase in Surah 18", () => {
  const inSurah = filePhrases().filter((p) => p.first.startsWith(`${NEON_PHRASED.surah}:`));
  expect(inSurah, "the committed Phrases file's Surah 18 Phrases").toEqual([]);
});

Then(/^the toolbar holds the "Phrases" switch, (on|off)$/, async ({ reader }, state: string) => {
  await expect(phrasesSwitch(reader.page), 'the toolbar holds "Phrases"').toBeVisible();
  await expect.poll(() => chosen(phrasesSwitch(reader.page)), { message: `"Phrases" is ${state}` }).toBe(String(state === "on"));
});

Then(/^the "Phrases" switch is (on|off)$/, async ({ reader }, state: string) => {
  await expect.poll(() => chosen(phrasesSwitch(reader.page)), { message: `"Phrases" is ${state}` }).toBe(String(state === "on"));
});

When(/^I turn Phrases mode (on|off)$/, async ({ reader, reading }, state: string) => {
  const control = phrasesSwitch(reader.page);
  await expect(control, 'the toolbar holds "Phrases"').toBeVisible();
  if ((await chosen(control)) !== String(state === "on")) await act(reading, control);
  await expect.poll(() => chosen(control), { message: `"Phrases" is ${state}` }).toBe(String(state === "on"));
});

Then(
  "every Passage shows its Ayahs Ayah by Ayah as Word cards, each with its Arabic and its English Word meaning",
  async ({ reader, reading }) => {
    const page = reader.page;
    const surah = surahOf(reading);
    const ranges = await shownRanges(page);
    expect(ranges.length, "the editor shows Passages").toBeGreaterThan(0);
    // The Arabic in the Script the page shows: signing in brings the Admin's Account's Script (#70),
    // which another scenario signed in as the same Admin may have changed meanwhile.
    const indopak = (await page.locator("html").getAttribute("data-script")) === "indopak";
    const arabicOf = (w: SourceWord) => (indopak ? indopakText(w.location) : w.uthmani);
    const want = new Map(sourceWords(surah).map((w) => [w.location, { arabic: arabicOf(w), en: w.meaning.en }]));
    for (const range of ranges) {
      const region = passage(page, range);
      const expected = wordsOf(reading, range).map((w) => w.location);
      await expect.poll(() => cardIdsIn(region), { message: `Passage ${range}'s Word cards, in reading order` }).toEqual(expected);
      const texts = await region.evaluate((r) =>
        Array.from(r.querySelectorAll("[id]"))
          .filter((e) => /^\d+:\d+:\d+$/.test(e.id))
          .map((e) => ({ location: e.id, text: (e as HTMLElement).innerText.replace(/\s+/g, " ").trim() })),
      );
      const wrong = texts
        .filter(({ location, text }) => {
          const w = want.get(location)!;
          return !text.includes(w.arabic) || !text.includes(w.en.replace(/\s+/g, " ").trim());
        })
        .map(({ location, text }) => ({ location, shown: text, want: `${want.get(location)!.arabic} · ${want.get(location)!.en}` }));
      expect(wrong, `Passage ${range}'s Word cards show their Arabic and English Word meaning`).toEqual([]);
      // Ayah by Ayah: each Ayah's Word cards start on a line below the last Ayah's.
      const tops = await region.evaluate((r) =>
        Array.from(r.querySelectorAll("[id]"))
          .filter((e) => /^\d+:\d+:\d+$/.test(e.id))
          .map((e) => ({ location: e.id, top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom })),
      );
      const ayahOf = (l: string) => l.split(":")[1];
      const runOn = tops.filter((c, i) => i > 0 && ayahOf(c.location) !== ayahOf(tops[i - 1].location) && c.top < Math.max(...tops.slice(0, i).map((p) => p.bottom)) - 1);
      expect(runOn.map((c) => c.location), `Passage ${range}: an Ayah's Word cards start below the Ayah before`).toEqual([]);
    }
  },
);

/** Check Passage `range`'s Word cards that `pick` keeps against their expected tints. */
async function expectTinted(page: Page, reading: Reading, range: string, pick: (w: PhrasedWord) => boolean) {
  const tints = tintsNoted.get(reading);
  const words = wordsOf(reading, range).filter(pick);
  expect(words.length, `Passage ${range} has Words in Neon's Phrases`).toBeGreaterThan(0);
  await expect.poll(async () => (await cardIdsIn(passage(page, range))).length, { message: `Passage ${range} shows Word cards` }).toBeGreaterThan(0);
  const drawn = new Map((await drawnCards(page, passage(page, range))).map((c) => [c.location, c]));
  const paper = [...drawn.values()][0]?.paper;
  const seen = { a: tints?.a ?? drawn.get(words.find((w) => editorColour(w) === "a")!.location)?.tint, b: tints?.b ?? drawn.get(words.find((w) => editorColour(w) === "b")?.location ?? "")?.tint };
  expect(seen.a, "tint A is not the page's paper").not.toBe(paper);
  const wrong = words
    .map((w) => ({ location: w.location, want: editorColour(w) === "a" ? seen.a : seen.b, got: drawn.get(w.location)?.tint ?? "missing" }))
    .filter((x) => x.got !== x.want);
  expect(wrong, `Passage ${range}'s Word cards in Neon's Phrases take tint A (${seen.a}) and tint B (${seen.b})`).toEqual([]);
}

Then(
  /^Passage (\S+)'s Word cards take tint A and tint B Phrase by Phrase as Neon's Phrases say, starting on tint A and carrying across Ayah ends$/,
  async ({ reader, reading }, range: string) => {
    tintsOf(reading);
    const words = wordsOf(reading, range);
    expect(words.every((w) => w.phrase !== undefined), `Neon's Phrases cover Passage ${range}`).toBe(true);
    await expectTinted(reader.page, reading, range, () => true);
  },
);

Then(
  /^Passage (\S+)'s Word cards in Neon's Phrases take tint A and tint B Phrase by Phrase, starting on tint A$/,
  async ({ reader, reading }, range: string) => {
    await expectTinted(reader.page, reading, range, (w) => w.phrase !== undefined);
  },
);

/** Check that the Word cards of Passage `range` that `pick` keeps are marked as unmarked, and the rest are not. */
async function expectUnmarked(page: Page, reading: Reading, range: string, pick: (w: PhrasedWord) => boolean) {
  await expect.poll(async () => (await cardIdsIn(passage(page, range))).length, { message: `Passage ${range} shows Word cards` }).toBeGreaterThan(0);
  const words = wordsOf(reading, range);
  const drawn = new Map((await drawnCards(page, passage(page, range))).map((c) => [c.location, c]));
  const marked = words.filter((w) => w.phrase !== undefined).map((w) => drawn.get(w.location)!).filter(Boolean);
  const unmarked = words.filter(pick);
  expect(unmarked.length, `Passage ${range} has Words in no Phrase in Neon`).toBeGreaterThan(0);
  const wrong = unmarked
    .map((w) => drawn.get(w.location) ?? { location: w.location, tint: "missing", paper: "", outline: "", description: "" })
    .map((c) => {
      const problems: string[] = [];
      if (c.tint !== c.paper) problems.push(`drawn on ${c.tint}, not the page's paper ${c.paper}`);
      if (!/unmarked/i.test(c.description)) problems.push(`described as "${c.description}", not "Unmarked"`);
      if (marked.some((m) => m.outline === c.outline)) problems.push(`outlined as a Word in a Phrase (${c.outline})`);
      return { location: c.location, problems };
    })
    .filter((x) => x.problems.length > 0);
  expect(wrong, `Passage ${range}'s Words in no Phrase are marked as unmarked`).toEqual([]);
  const notUnmarked = marked.filter((m) => /unmarked/i.test(m.description)).map((m) => m.location);
  expect(notUnmarked, `Passage ${range}'s Words in a Phrase are not described as unmarked`).toEqual([]);
}

Then(/^Passage (\S+)'s other Word cards are marked as unmarked$/, async ({ reader, reading }, range: string) => {
  await expectUnmarked(reader.page, reading, range, (w) => w.phrase === undefined);
});

Then(/^every Word card of Passage (\S+) is marked as unmarked$/, async ({ reader, reading }, range: string) => {
  expect(wordsOf(reading, range).every((w) => w.phrase === undefined), `Neon has no Phrase in Passage ${range}`).toBe(true);
  await expectUnmarked(reader.page, reading, range, () => true);
});

Then(/^no Word card of Passage (\S+) is marked as unmarked$/, async ({ reader }, range: string) => {
  await expect.poll(async () => (await cardIdsIn(passage(reader.page, range))).length, { message: `Passage ${range} shows Word cards` }).toBeGreaterThan(0);
  const drawn = await drawnCards(reader.page, passage(reader.page, range));
  expect(drawn.filter((c) => /unmarked/i.test(c.description)).map((c) => c.location), `Passage ${range}'s Word cards described as unmarked`).toEqual([]);
});

/** The progress Passage `range`'s heading should show, from Neon's Phrases. */
function progressOf(reading: Reading, range: string): string {
  const words = wordsOf(reading, range);
  const inPhrase = words.filter((w) => w.phrase !== undefined).length;
  return inPhrase === words.length ? "Phrases ✓" : `Phrases ${inPhrase} / ${words.length} Words`;
}

export const headingOf = (page: Page, range: string) => passage(page, range).getByRole("heading", { level: 2 });
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

async function expectProgress(page: Page, range: string, want: string) {
  await expect.poll(async () => flat(await headingOf(page, range).innerText()), { message: `Passage ${range}'s heading shows "${want}"` }).toContain(want);
}

Then(/^Passage (\S+)'s heading shows "Phrases ✓"$/, async ({ reader, reading }, range: string) => {
  expect(progressOf(reading, range), `Neon's Phrases cover Passage ${range}`).toBe("Phrases ✓");
  await expectProgress(reader.page, range, "Phrases ✓");
});

Then(/^Passage (\S+)'s heading shows "Phrases <n> \/ <N> Words", counted from Neon's Phrases$/, async ({ reader, reading }, range: string) => {
  const want = progressOf(reading, range);
  expect(want, `Neon's Phrases leave Words of Passage ${range} unmarked`).not.toBe("Phrases ✓");
  await expectProgress(reader.page, range, want);
});

Then("every Passage heading shows its progress, counted from Neon's Phrases", async ({ reader, reading }) => {
  const ranges = await shownRanges(reader.page);
  expect(ranges.length, "the editor shows Passages").toBeGreaterThan(0);
  for (const range of ranges) await expectProgress(reader.page, range, progressOf(reading, range));
});

Then(/^Passage (\S+) shows no Word cards$/, async ({ reader }, range: string) => {
  await expect(passage(reader.page, range), `Passage ${range} is shown`).toBeVisible();
  await expect.poll(() => cardIdsIn(passage(reader.page, range)), { message: `Passage ${range}'s Word cards` }).toEqual([]);
});

Then(/^Passage (\S+) shows its Word cards$/, async ({ reader, reading }, range: string) => {
  const expected = wordsOf(reading, range).map((w) => w.location);
  await expect.poll(() => cardIdsIn(passage(reader.page, range)), { message: `Passage ${range}'s Word cards, in reading order` }).toEqual(expected);
});
