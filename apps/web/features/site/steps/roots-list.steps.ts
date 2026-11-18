// Steps for the Roots list (#290): features/site/roots-list.feature. Every
// Root, its letters and its count of occurrences come from QUL's word root
// database and the Arabic alphabet's order from ./roots, and what a search
// should find from the issue's rules, folded here apart from the app's own
// folding so the two can disagree: letters with their spaces and vowel marks
// taken out, a transliteration in lower case without accents or hyphens.
//
// The page's shape these steps expect: each letter a <section> of <main>
// headed by an <h2>; under it a list of items, each one Root's link, the
// link's first lang="ar" text its letters and its lang="ar-Latn" text its
// transliteration; a Known Root's tick an element marked `data-known-root`.

import { expect, type Page } from "@playwright/test";
import { shot, STRINGS, type Language } from "../support";
import { Then, When } from "./fixtures";
import { inArabicOrder, qulAnalysis } from "./roots";

const main = (page: Page) => page.getByRole("main");
const searchBox = (page: Page) => main(page).getByRole("searchbox", { name: "Search by letters or transliteration" });

/** A row of the Roots list as the reader meets it. */
interface ShownRoot {
  /** The letter heading it is under. */
  letter: string;
  letters: string;
  transliteration: string;
  /** Everything the link says, a screen reader's words included. */
  text: string;
  href: string;
  ticked: boolean;
}

/** Every row the Roots list shows, in order, read in one go: there are some 1,650. */
async function shownRoots(page: Page): Promise<ShownRoot[]> {
  await expect(main(page)).toBeVisible();
  return main(page).evaluate((el) =>
    [...el.querySelectorAll("section")].flatMap((section) => {
      const letter = section.querySelector("h2")?.textContent?.trim() ?? "";
      return [...section.querySelectorAll("li a")].map((a) => ({
        letter,
        letters: a.querySelector('[lang="ar"]')?.textContent?.trim() ?? "",
        transliteration: a.querySelector('[lang="ar-Latn"]')?.textContent?.trim() ?? "",
        text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
        href: decodeURIComponent(a.getAttribute("href") ?? ""),
        ticked: a.querySelector("[data-known-root]") !== null,
      }));
    }),
  );
}

/** The letter headings the Roots list shows, in order. */
const shownHeadings = (page: Page) => main(page).locator("section h2").allInnerTexts();

/** Every QUL Root's letters. */
const qulRoots = () => [...qulAnalysis().roots.values()].map((r) => r.letters);

/** How many Word locations QUL gives each Root, by its letters. */
function qulOccurrences(): Map<string, number> {
  const { roots, rootOf } = qulAnalysis();
  const counts = new Map<string, number>();
  for (const id of rootOf.values()) {
    const letters = roots.get(id)!.letters;
    counts.set(letters, (counts.get(letters) ?? 0) + 1);
  }
  return counts;
}

/** Arabic text with its spaces and vowel marks taken out, an Urdu keyboard's ک, ی and ہ as the Arabic letters. */
const bareLetters = (s: string) =>
  s
    .replace(/[\sً-ْٰ]/g, "")
    .replace(/ک/g, "ك")
    .replace(/ی/g, "ي")
    .replace(/[ہھ]/g, "ه");
/** A transliteration in lower case, without accents, apostrophes, hyphens or spaces. */
const bareLatin = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ'’ʿʾ\s-]/g, "");

/** Waits until the Roots list shows `n` rows, as it does once a search has been followed. */
const showsRows = (page: Page, n: number) => expect(main(page).locator("section li a")).toHaveCount(n);

// ---------------------------------------------------------------- every Root, grouped and ordered

Then("the Roots list holds every Root of QUL's word root database, each once, and nothing else", async ({ reader: { page } }) => {
  const expected = qulRoots();
  await showsRows(page, expected.length);
  const shown = (await shownRoots(page)).map((r) => r.letters);
  expect([...shown].sort(), "the Roots listed").toEqual([...expected].sort());
});

Then("the Roots list's letter headings are its Roots' first letters, each once, in Arabic alphabetical order", async ({ reader: { page } }) => {
  const firstLetters = [...new Set(qulRoots().map((letters) => letters.split(" ")[0]))].sort(inArabicOrder);
  expect(await shownHeadings(page), "the letter headings").toEqual(firstLetters);
});

Then("under each letter heading are the Roots beginning with that letter, in Arabic alphabetical order", async ({ reader: { page } }) => {
  const shown = await shownRoots(page);
  expect(shown.filter((r) => r.letters.split(" ")[0] !== r.letter).map((r) => `${r.letters} under ${r.letter}`), "Roots under another letter").toEqual([]);
  expect(shown.map((r) => r.letters), "the Roots in order").toEqual([...shown.map((r) => r.letters)].sort(inArabicOrder));
});

Then("the Roots list has no Memorized? choice", async ({ reader: { page } }) => {
  await expect(main(page).locator("section").first()).toBeVisible();
  await expect(main(page).getByRole("switch")).toHaveCount(0);
  await expect(main(page).getByText(STRINGS.memorized)).toHaveCount(0);
});

// ---------------------------------------------------------------- each row and its link

Then(
  "every row of the Roots list shows its Root's count of occurrences and links to its Root page in {language}",
  async ({ reader: { page } }, lang: Language) => {
    const occurrences = qulOccurrences();
    const shown = await shownRoots(page);
    expect(shown.length, "rows").toBe(qulRoots().length);
    const wrong = shown.flatMap((r) => {
      const n = occurrences.get(r.letters) ?? 0;
      const problems = [];
      if (!new RegExp(`(^|\\D)${n}×`).test(r.text)) problems.push(`${r.letters} says "${r.text}", not ${n}×`);
      if (r.href !== `/${lang}/roots/${r.letters.replaceAll(" ", "")}`) problems.push(`${r.letters} links to ${r.href}`);
      if (!r.transliteration) problems.push(`${r.letters} has no transliteration`);
      return problems;
    });
    expect(wrong, "rows with a wrong count, link or no transliteration").toEqual([]);
  },
);

Then("the Roots list's row for {string} shows {string} and {int} occurrences", async ({ reader: { page } }, letters: string, transliteration: string, n: number) => {
  const row = (await shownRoots(page)).find((r) => r.letters === letters);
  expect(row, `a row for ${letters}`).toBeDefined();
  expect(row!.transliteration).toBe(transliteration);
  expect(row!.text).toContain(`${n}×`);
});

/** The Roots list's row for `letters`. */
const rowFor = (page: Page, letters: string) =>
  main(page).locator("section li a").filter({ has: page.locator('[lang="ar"]', { hasText: new RegExp(`^${letters}$`) }) });

When("I follow the Roots list's row for {string}", async ({ reader: { page } }, letters: string) => {
  await rowFor(page, letters).scrollIntoViewIfNeeded();
  await rowFor(page, letters).click();
});

// ---------------------------------------------------------------- ticks

/** Waits until the Roots list ticks exactly `letters`: ticks fill in once the page runs in the browser. */
async function expectTicked(page: Page, letters: string[]) {
  await showsRows(page, qulRoots().length);
  // Only the ticked rows are read on each try: reading all of them is slow.
  const ticked = main(page).locator("section li a").filter({ has: page.locator("[data-known-root]") }).locator('[lang="ar"]');
  await expect.poll(async () => (await ticked.allTextContents()).map((t) => t.trim()).sort(), { message: "the ticked Roots" }).toEqual([...letters].sort());
}

Then("no row of the Roots list is ticked", async ({ reader: { page } }) => {
  await expectTicked(page, []);
});

Then("the Roots list ticks {string}, and no other Root", async ({ reader: { page } }, letters: string) => {
  await expectTicked(page, [letters]);
});

Then("the Roots list ticks {string} and {string}, and no other Root", async ({ reader: { page } }, first: string, second: string) => {
  await expectTicked(page, [first, second]);
});

Then("the Roots list ticks {string}, which a screen reader hears as a Known Root, and no other Root", async ({ reader: { page } }, letters: string) => {
  await expectTicked(page, [letters]);
  const row = main(page).locator("section li a").filter({ has: page.locator("[data-known-root]") });
  await expect(row).toHaveAccessibleName(new RegExp(`^${letters} .*Known Root$`));
});

Then("I save a screenshot of the Roots list's row for {string} {string}", async ({ reader: { page } }, letters: string, name: string) => {
  await rowFor(page, letters).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await shot(page, name);
});

// ---------------------------------------------------------------- search

When("I search the Roots list for {string}", async ({ reader: { page } }, search: string) => {
  await searchBox(page).fill(search);
});

When("I clear the Roots list's search", async ({ reader: { page } }) => {
  await searchBox(page).fill("");
});

Then(
  /^the Roots list lists "(.+)", and only Roots whose (letters|transliteration) holds "(.+)"$/,
  async ({ reader: { page } }, letters: string, what: string, search: string) => {
    const all = qulRoots();
    // The list follows the search once typing pauses: wait for it to narrow.
    await expect.poll(() => main(page).locator("section li a").count(), { message: "Roots shown" }).toBeLessThan(all.length);
    const shown = await shownRoots(page);
    expect(shown.map((r) => r.letters), `the Roots ${search} finds`).toContain(letters);
    const holds = (r: ShownRoot) =>
      what === "letters" ? bareLetters(r.letters).includes(bareLetters(search)) : bareLatin(r.transliteration).includes(bareLatin(search));
    expect(shown.filter((r) => !holds(r)).map((r) => r.letters), `Roots shown whose ${what} does not hold ${search}`).toEqual([]);
  },
);

Then("the Roots list lists no Root and says no Root matches {string}", async ({ reader: { page } }, search: string) => {
  await showsRows(page, 0);
  await expect(main(page).getByText(`No Root matches “${search}”`)).toBeVisible();
});
