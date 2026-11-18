// Steps for a large Root's Spellings, closed until opened and loaded fifty
// Ayahs at a time (#288): features/site/root-page-spelling-parts.feature.
// What a Root holds is read from QUL's databases and the sources through
// ./roots, as ./root-page.steps.ts reads it. Each Spelling is found by order:
// the buttons in the Spelling headings, one per Spelling in the Root's order;
// its Ayahs and "Show more" inside the element its aria-controls names. The
// browser's requests for parts are watched, and failed, by ./parts-server.

import { expect, type Locator, type Page } from "@playwright/test";
import { STRINGS } from "../support";
import { Given, Then, When, type Reading } from "./fixtures";
import { tintedIn } from "./marked-words.steps";
import { partsServer, requestedParts } from "./parts-server";
import { ayahOf, ayahsOfSpelling, lemmaSections, main, spellingsOf } from "./root-page.steps";
import { holdsNumber } from "./roots.steps";
import { expectedRoot, type ExpectedRoot, type ExpectedSpelling } from "./roots";

/** How many Ayahs a part of a Spelling's Ayahs holds. */
const PART = 50;

/** The buttons heading the Spellings, one per Spelling in the Root's order. */
const toggles = (page: Page) => main(page).getByRole("heading", { level: 3 }).getByRole("button");

/** `toggle`, when the accessibility tree says it is `expanded` (or collapsed), as a screen reader hears it. */
const heard = (page: Page, toggle: Locator, expanded: boolean) => toggle.and(page.getByRole("button", { expanded }));

/** The element holding the Ayahs and "Show more" of the Spelling `toggle` opens and closes. */
async function shownBy(page: Page, toggle: Locator): Promise<Locator> {
  const id = await toggle.getAttribute("aria-controls");
  expect(id, "the Spelling's button names what it opens").toBeTruthy();
  return page.locator(`[id="${id}"]`);
}

/** The Spelling of the scenario, by its place among the Root's Spellings, and the Root. */
const chosen = new WeakMap<Reading, { root: ExpectedRoot; index: number }>();
function chosenSpelling(page: Page, reading: Reading) {
  const choice = chosen.get(reading);
  if (!choice) throw new Error("no Spelling opened yet in this scenario");
  const { spelling } = spellingsOf(choice.root)[choice.index];
  return { ...choice, spelling, toggle: toggles(page).nth(choice.index) };
}

/** Opens the Spelling at `index` of `root`, once the page answers a tap. */
async function openSpelling(page: Page, reading: Reading, root: ExpectedRoot, index: number) {
  chosen.set(reading, { root, index });
  const toggle = toggles(page).nth(index);
  await expect(toggles(page)).toHaveCount(spellingsOf(root).length);
  // A tap before the page has hydrated does nothing.
  await expect(async () => {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
}

/** The number of distinct Ayahs a Spelling's Word locations are in, each part PART of them. */
const partsOfSpelling = (s: ExpectedSpelling) => Math.ceil(ayahsOfSpelling(s).length / PART);

/** Checks the Ayahs listed under the Spelling are its first `count`, in Quran order, its own Words tinted in each. */
async function expectListed(page: Page, spelling: ExpectedSpelling, toggle: Locator, count: number) {
  const items = (await shownBy(page, toggle)).locator("li[data-ayah]");
  const expected = ayahsOfSpelling(spelling).slice(0, count);
  await expect(items, `the Ayahs under the Spelling at ${spelling.locations[0]}`).toHaveCount(expected.length);
  expect(await items.evaluateAll((els) => els.map((el) => el.getAttribute("data-ayah")))).toEqual(expected);
  const ours = spelling.locations.filter((l) => expected.includes(ayahOf(l))).sort();
  await expect.poll(() => tintedIn(items), { message: "the Words drawn on a tint under the Spelling" }).toEqual(ours);
}

// ---------------------------------------------------------------- the requests for parts

Given("the browser's requests for parts are watched", async ({ reader }) => {
  await partsServer(reader.page, "serve");
});

Given("the browser's requests for parts fail", async ({ reader }) => {
  await partsServer(reader.page, "fail");
});

When("the browser's requests for parts are served again", async ({ reader }) => {
  await partsServer(reader.page, "serve");
});

// ---------------------------------------------------------------- closed and open

/** Checks every Spelling of `root` but those at `except` is closed, its count shown and its state heard. */
async function expectClosed(page: Page, root: ExpectedRoot, except: number[] = []) {
  const spellings = spellingsOf(root);
  await expect(toggles(page)).toHaveCount(spellings.length);
  for (const [i, { spelling }] of spellings.entries()) {
    if (except.includes(i)) continue;
    const toggle = toggles(page).nth(i);
    await expect(heard(page, toggle, false), `the Spelling at ${spelling.locations[0]}, heard collapsed`).toHaveCount(1);
    const text = await toggle.innerText();
    expect(holdsNumber(text, spelling.locations.length), `its count ${spelling.locations.length} in "${text}"`).toBe(true);
  }
}

Then("every Spelling of {string} is closed, showing its count, and a screen reader hears it collapsed", async ({ reader }, letters: string) => {
  await expectClosed(reader.page, expectedRoot(letters));
});

Then("the Root page lists no Ayah, and no part has been requested", async ({ reader }) => {
  const { page } = reader;
  await expect(main(page).locator("li[data-ayah]")).toHaveCount(0);
  const html = await (await page.request.get(page.url())).text();
  expect(html, "the page's HTML holds no listed Ayah").not.toContain("data-ayah=");
  expect(requestedParts(page), "parts requested").toEqual([]);
});

Then("every Spelling of {string} is open, and a screen reader hears it expanded", async ({ reader }, letters: string) => {
  const root = expectedRoot(letters);
  await expect(toggles(reader.page)).toHaveCount(spellingsOf(root).length);
  for (let i = 0; i < spellingsOf(root).length; i++) await expect(heard(reader.page, toggles(reader.page).nth(i), true), `Spelling ${i + 1}, heard expanded`).toHaveCount(1);
});

Then("the Root page offers no {string}, and no part has been requested", async ({ reader }, label: string) => {
  await expect(main(reader.page).getByRole("button", { name: label, exact: true })).toHaveCount(0);
  expect(requestedParts(reader.page), "parts requested").toEqual([]);
});

// ---------------------------------------------------------------- opening, Show more and closing

When("I open the most frequent Spelling of {string}", async ({ reader, reading }, letters: string) => {
  const root = expectedRoot(letters);
  const spellings = spellingsOf(root);
  const most = spellings.reduce((m, s, i) => (s.spelling.locations.length > spellings[m].spelling.locations.length ? i : m), 0);
  expect(partsOfSpelling(spellings[most].spelling), "the most frequent Spelling's parts").toBeGreaterThan(2);
  await openSpelling(reader.page, reading, root, most);
});

When("I open a Spelling of {string} whose Ayahs are in two parts", async ({ reader, reading }, letters: string) => {
  const root = expectedRoot(letters);
  const index = spellingsOf(root).findIndex((s) => partsOfSpelling(s.spelling) === 2);
  expect(index, `a Spelling of ${letters} in two parts, in the sources`).toBeGreaterThanOrEqual(0);
  await openSpelling(reader.page, reading, root, index);
});

When("I close that Spelling", async ({ reader, reading }) => {
  const { toggle } = chosenSpelling(reader.page, reading);
  await toggle.click();
});

Then(/^a screen reader hears that Spelling (expanded|collapsed)$/, async ({ reader, reading }, state: string) => {
  const { toggle } = chosenSpelling(reader.page, reading);
  await expect(heard(reader.page, toggle, state === "expanded")).toHaveCount(1);
});

Then(/^that Spelling lists (?:its first (\d+)|all its) Ayahs in Quran order, its own Words tinted in each$/, async ({ reader, reading }, count?: string) => {
  const { spelling, toggle } = chosenSpelling(reader.page, reading);
  await expectListed(reader.page, spelling, toggle, count ? Number(count) : Infinity);
});

Then(/^that Spelling offers (no )?"([^"]+)"$/, async ({ reader, reading }, no: string | undefined, label: string) => {
  const { toggle } = chosenSpelling(reader.page, reading);
  const more = (await shownBy(reader.page, toggle)).getByRole("button", { name: label, exact: true });
  await expect(more).toHaveCount(no ? 0 : 1);
});

When(/^I choose "?(Show more|Retry)"? under that Spelling$/, async ({ reader, reading }, label: string) => {
  const { toggle } = chosenSpelling(reader.page, reading);
  await (await shownBy(reader.page, toggle)).getByRole("button", { name: label, exact: true }).click();
});

Then("none of that Spelling's Ayahs is on screen", async ({ reader, reading }) => {
  const { toggle } = chosenSpelling(reader.page, reading);
  await expect((await shownBy(reader.page, toggle)).locator("li[data-ayah]").filter({ visible: true })).toHaveCount(0);
});

// ---------------------------------------------------------------- the Lemma row

Then(
  "every Spelling of the last Lemma of {string} is open, listing its first Ayahs, and every other Spelling is closed",
  async ({ reader }, letters: string) => {
    const { page } = reader;
    const root = expectedRoot(letters);
    const last = root.lemmas.length - 1;
    const opened = spellingsOf(root).flatMap((s, i) => (s.l === last ? [i] : []));
    for (const i of opened) {
      const toggle = toggles(page).nth(i);
      await expect(heard(page, toggle, true)).toHaveCount(1);
      await expectListed(page, spellingsOf(root)[i].spelling, toggle, PART);
    }
    await expect(lemmaSections(page).nth(last).getByRole("heading", { level: 3 }).first()).toBeInViewport();
    await expectClosed(page, root, opened);
  },
);

// ---------------------------------------------------------------- a part that cannot be read

Then("in place of that Spelling's Ayahs is a message with a Retry", async ({ reader, reading }) => {
  const { toggle } = chosenSpelling(reader.page, reading);
  const shown = await shownBy(reader.page, toggle);
  await expect(shown.getByRole("alert")).toContainText(STRINGS.spellingPartFailed);
  await expect(shown.getByRole("button", { name: STRINGS.retry, exact: true })).toBeVisible();
  await expect(shown.locator("li[data-ayah]")).toHaveCount(0);
});

Then("the Root page's heading is {string}, and every other Spelling of it is closed, showing its count", async ({ reader, reading }, letters: string) => {
  const { page } = reader;
  await expect(main(page).locator("header").getByRole("heading", { level: 1 })).toHaveText(letters);
  await expectClosed(page, expectedRoot(letters), [chosenSpelling(page, reading).index]);
});
