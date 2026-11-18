// Steps for #100: marking and editing Phrases in the Passage editor's Phrases
// mode, by tapping Word cards; the refusals; Undo and reload; and the Passage
// edits that must keep Phrases whole. What the editor should show is Neon's
// Phrases (../passages-in-the-test-database.ts, #171) with the changes the
// scenario names; every Word location a step names is checked against the
// sources, and every one of Neon's Phrases it names against what Neon holds.

import { expect, type Page } from "@playwright/test";
import { sourceWords } from "../support";
import { neonPassages, neonPhrases, written } from "../passages-in-the-test-database";
import { Then, When, type Reading } from "./fixtures";
import { phrasedWords, type FilePhrase, type PhrasedWord } from "./phrases";
import type { FilePassage } from "./passages";
import { act, draggedRange, dropPlaces, passage, startDragging, surahOf } from "./passage-editor.steps";
import { cardIdsIn, drawnCards, editorColour, headingOf, tintsNoted } from "./phrases-mode.steps";

// ------------------------------------------------------------- Word locations

/** The Word location of `ref` (<Ayah>:<Word>) in the open Surah, checked against the sources. */
function wordAt(reading: Reading, ref: string): string {
  const location = `${surahOf(reading)}:${ref}`;
  if (!sourceWords(surahOf(reading)).some((w) => w.location === location)) throw new Error(`the sources have no Word ${location}`);
  return location;
}

/** The Phrase `ref` (<Ayah>:<Word>–<Ayah>:<Word>) in the open Surah. */
export function phraseAt(reading: Reading, ref: string): FilePhrase {
  const [first, last] = ref.split("–");
  if (!first || !last) throw new Error(`"${ref}" is not written <Ayah>:<Word>–<Ayah>:<Word>`);
  return { first: wordAt(reading, first), last: wordAt(reading, last) };
}

const same = (x: FilePhrase, y: FilePhrase) => x.first === y.first && x.last === y.last;

// ----------------------------------------------------------- what is expected

/** Neon's Phrases with the scenario's changes, as last checked: the Words of the Passage last checked. */
const expectedWords = new WeakMap<Reading, PhrasedWord[]>();

/** Neon's Phrases with `changes` ("X" added, "X" removed, "X" in place of "Y", joined by "and") applied. */
export function phrasesWith(reading: Reading, changes: string | undefined): FilePhrase[] {
  let phrases = neonPhrases();
  const inNeon = (p: FilePhrase, ref: string) => {
    if (!phrases.some((q) => same(q, p))) throw new Error(`Neon has no Phrase ${ref}`);
  };
  for (const [, ref, how, replaced] of (changes ?? "").matchAll(/"([^"]+)" (added|removed|in place of "([^"]+)")/g)) {
    const phrase = phraseAt(reading, ref);
    if (how === "added") phrases = [...phrases, phrase];
    else if (how === "removed") {
      inNeon(phrase, ref);
      phrases = phrases.filter((p) => !same(p, phrase));
    } else {
      const old = phraseAt(reading, replaced);
      inNeon(old, replaced);
      phrases = phrases.map((p) => (same(p, old) ? phrase : p));
    }
  }
  return phrases;
}

/** Neon's Passages of the open Surah, those wholly inside `range` joined as one Passage `range`. */
function passagesWith(reading: Reading, range: string): FilePassage[] {
  const surah = surahOf(reading);
  const mine = neonPassages().filter((p) => p.surah_no === surah);
  if (mine.some((p) => written(p) === range)) return mine;
  const [from, till] = range.split("–").map(Number);
  const inside = mine.filter((p) => from <= p.ayah_from && p.ayah_till <= (till ?? from));
  if (inside[0]?.ayah_from !== from || inside.at(-1)?.ayah_till !== (till ?? from)) throw new Error(`Neon's Passages of Surah ${surah} can't be joined as ${range}`);
  const at = mine.indexOf(inside[0]);
  return [...mine.slice(0, at), { ...inside[0], ayah_till: inside.at(-1)!.ayah_till }, ...mine.slice(at + inside.length)];
}

/** What is wrong with Passage `range`'s Word cards, drawn against `words`: [] when nothing is. */
async function problemsOf(page: Page, reading: Reading, range: string, words: PhrasedWord[]): Promise<string[]> {
  const region = passage(page, range);
  const ids = await cardIdsIn(region);
  const want = words.map((w) => w.location);
  if (ids.join() !== want.join()) return [`Passage ${range} shows Word cards [${ids.slice(0, 3)}…] (${ids.length}), not [${want.slice(0, 3)}…] (${want.length})`];
  const drawn = new Map((await drawnCards(page, region)).map((c) => [c.location, c]));
  const paper = drawn.get(want[0])!.paper;
  const tintOf = (colour: "a" | "b") => {
    const tints = new Set(words.filter((w) => editorColour(w) === colour).map((w) => drawn.get(w.location)!.tint));
    return tintsNoted.get(reading)?.[colour] ?? (tints.size === 1 ? [...tints][0] : `one tint (got ${[...tints].join(", ")})`);
  };
  const seen = { a: tintOf("a"), b: tintOf("b") };
  const problems: string[] = [];
  if (seen.a === paper) problems.push(`tint A is the page's paper ${paper}`);
  if (words.some((w) => editorColour(w) === "b") && seen.a === seen.b) problems.push(`tint A and tint B are both ${seen.a}`);
  const markedOutlines = new Set(words.filter((w) => w.phrase !== undefined).map((w) => drawn.get(w.location)!.outline));
  for (const w of words) {
    const c = drawn.get(w.location)!;
    const colour = editorColour(w);
    if (colour && c.tint !== seen[colour]) problems.push(`${w.location} is drawn on ${c.tint}, not tint ${colour.toUpperCase()} (${seen[colour]})`);
    if (colour && /unmarked/i.test(c.description)) problems.push(`${w.location}, in a Phrase, is described as unmarked`);
    if (!colour && c.tint !== paper) problems.push(`${w.location}, in no Phrase, is drawn on ${c.tint}, not the paper ${paper}`);
    if (!colour && !/unmarked/i.test(c.description)) problems.push(`${w.location}, in no Phrase, is described as "${c.description}", not "Unmarked"`);
    if (!colour && markedOutlines.has(c.outline)) problems.push(`${w.location}, in no Phrase, is outlined as a Word in a Phrase`);
  }
  return problems;
}

Then(/^Passage (\S+) shows Neon's Phrases(?:, with (.+))?$/, async ({ reader, reading }, range: string, changes?: string) => {
  const words = phrasedWords(surahOf(reading), phrasesWith(reading, changes), passagesWith(reading, range)).filter((w) => written(w.passage) === range);
  expectedWords.set(reading, words);
  await expect
    .poll(() => problemsOf(reader.page, reading, range, words), {
      message: `Passage ${range}'s Word cards take tint A and tint B Phrase by Phrase from its first Phrase, its other Words marked unmarked`,
    })
    .toEqual([]);
});

Then(/^Passage (\S+)'s heading shows its progress for those Phrases$/, async ({ reader, reading }, range: string) => {
  const words = expectedWords.get(reading);
  if (!words || written(words[0].passage) !== range) throw new Error(`Passage ${range}'s Phrases were not checked first`);
  const inPhrase = words.filter((w) => w.phrase !== undefined).length;
  const want = inPhrase === words.length ? "Phrases ✓" : `Phrases ${inPhrase} / ${words.length} Words`;
  await expect
    .poll(async () => (await headingOf(reader.page, range).innerText()).replace(/\s+/g, " ").trim(), { message: `Passage ${range}'s heading shows "${want}"` })
    .toContain(want);
});

// --------------------------------------------------------------------- tapping

/** Tap (on a phone) or click the Word card at `ref`. */
async function tapWord(page: Page, reading: Reading, ref: string) {
  const card = page.locator(`[id="${wordAt(reading, ref)}"]`);
  await expect(card, `the Word card at ${surahOf(reading)}:${ref} is shown`).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await act(reading, card);
}

When(/^I tap the Word at (\d+:\d+)$/, async ({ reader, reading }, ref: string) => {
  await tapWord(reader.page, reading, ref);
});

When(/^I tap the Word at (\d+:\d+), then the Word at (\d+:\d+)$/, async ({ reader, reading }, first: string, last: string) => {
  await tapWord(reader.page, reading, first);
  await tapWord(reader.page, reading, last);
});

const PHRASE_CONTROLS = ["Delete Phrase", "Move first Word", "Move last Word"] as const;
const control = (page: Page, name: (typeof PHRASE_CONTROLS)[number]) => page.getByRole("button", { name, exact: true });

Then('the editor offers "Delete Phrase", "Move first Word" and "Move last Word"', async ({ reader }) => {
  for (const name of PHRASE_CONTROLS) await expect(control(reader.page, name), `the editor offers "${name}"`).toBeVisible();
});

When("I delete the selected Phrase", async ({ reader, reading }) => {
  await act(reading, control(reader.page, "Delete Phrase"));
});

When(/^I move the selected Phrase's (first|last) Word to (\d+:\d+)$/, async ({ reader, reading }, end: string, to: string) => {
  await act(reading, control(reader.page, end === "first" ? "Move first Word" : "Move last Word"));
  await tapWord(reader.page, reading, to);
});

// -------------------------------------------------------------------- refusals

/** What the page's alerts and status messages say, whitespace collapsed. */
const announced = (page: Page) =>
  page
    .locator('[role="alert"], [role="status"]')
    .evaluateAll((els) => els.filter((e) => (e as HTMLElement).checkVisibility()).map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()));

const REASONS: Record<string, { says: RegExp[]; what: string }> = {
  "the Phrase would overlap another": { says: [/overlap/i], what: "that the Phrase would overlap another" },
  "the Phrase would leave its Passage": { says: [/Passage/, /leave|outside|past|beyond|cross|across|edge|end/i], what: "that the Phrase would leave its Passage" },
  "the Phrase must be changed first": { says: [/Phrase/, /first/i], what: "that a Phrase must be changed first" },
};

async function expectTold(page: Page, reason: keyof typeof REASONS) {
  const { says, what } = REASONS[reason];
  await expect
    .poll(async () => (await announced(page)).some((text) => says.every((r) => r.test(text))), { message: `an alert says ${what}` })
    .toBe(true);
}

Then(/^I am told (the Phrase would overlap another|the Phrase would leave its Passage|the Phrase must be changed first)$/, async ({ reader }, reason: string) => {
  await expectTold(reader.page, reason);
});

// ------------------------------------------------------------------- dragging

const ayahList = (list: string) => list.split(",").map((s) => Number(s.trim()));

Then("the gaps before Ayahs {string} are drop places", async ({ reader }, list: string) => {
  const wanted = ayahList(list);
  await expect.poll(() => dropPlaces(reader.page), { message: `the gaps before Ayahs ${list} are drop places while dragging` }).toEqual(expect.arrayContaining(wanted));
});

Then(
  "the gaps before Ayahs {string} are not drop places, or dropping it on them is refused, explaining the Phrase must be changed first",
  async ({ reader }, list: string) => {
    const page = reader.page;
    const range = draggedRange.get(page);
    if (!range) throw new Error("no Passage heading is being dragged");
    for (const ayah of ayahList(list)) {
      if (!(await dropPlaces(page)).includes(ayah)) continue;
      const place = page.getByText(`Start at Ayah ${ayah}`, { exact: true });
      const box = await place.boundingBox();
      if (!box) throw new Error(`the drop place before Ayah ${ayah} is not laid out`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
      await page.mouse.up();
      await expectTold(page, "the Phrase must be changed first");
      await startDragging(page, range);
    }
    await page.mouse.move(4, 4, { steps: 8 });
    await page.mouse.up();
  },
);
