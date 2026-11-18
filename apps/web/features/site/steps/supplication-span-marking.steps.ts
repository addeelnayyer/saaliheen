// Steps for marking Supplication spans in the Supplication editor (#271):
// features/site/supplication-editor-spans.feature. Tapping Word cards, and how
// they are drawn, are the Iltifat editor's (./marked-words.steps.ts); saving,
// the alert and the run's fields are the Iltifat editor's too
// (./iltifat-editor.steps.ts); reloading and screenshots are the reader's
// (./reader-settings.steps.ts); the two tabs are the Supplication editor's
// (./supplication-editor.steps.ts); which
// Supplications have spans, and the Supplications page's pieces, are the
// Supplication span steps' (./supplication-spans.steps.ts).
//
// The editor's shape these steps expect: each Word card the element whose id
// is its Word location (s:a:w), a button named with what a screen reader
// hears of it; in the list, each entry an <article> whose heading links to
// /admin/supplications/{id}, and the "Not yet marked" checkbox.

import { expect, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Then, resolveColor, type Reading } from "./fixtures";
import { drawnCards } from "./marked-words.steps";
import { compareLocations } from "./roots";
import { idAt, spansIn } from "./supplication-spans.steps";

// ---------------------------------------------------------------- the editor's Word cards

const IN_SPAN = "in a Supplication span";
const STARTS = "a Supplication span starts here";

/** The Word locations of the editor's cards that the spans written `spans` hold. */
const heldBy = (locations: Iterable<string>, spans: string) => {
  const held = spansIn(spans);
  return [...locations].filter((l) => held.some((s) => compareLocations(s.from, l) <= 0 && compareLocations(l, s.to) <= 0));
};

Then("the editor draws the Word cards of the spans {string} on the Supplication span tint, and no other card tinted", async ({ reader }, spans: string) => {
  const tint = await resolveColor(reader.page, "var(--supplication-span)");
  await expect(async () => {
    const drawn = await drawnCards(reader.page);
    const held = new Set(heldBy(drawn.keys(), spans));
    if (spansIn(spans).length > 0) expect(held.size, `the editor's Word cards the spans ${spans} hold`).toBeGreaterThan(0);
    const wrong = [...held].filter((l) => drawn.get(l) !== tint).map((l) => `${l}: ${drawn.get(l)}`);
    expect(wrong, `Word cards in a span not drawn on the Supplication span tint (${tint})`).toEqual([]);
    const others = new Set([...drawn].filter(([l]) => !held.has(l)).map(([, c]) => c));
    expect(others.size, "the Word cards in no span drawn alike").toBe(1);
    expect([...others], "the Word cards in no span").not.toContain(tint);
  }).toPass({ timeout: 5_000 });
});

Then("the editor draws no Word card on the Supplication span tint", async ({ reader }) => {
  const tint = await resolveColor(reader.page, "var(--supplication-span)");
  const drawn = await drawnCards(reader.page);
  expect([...drawn].filter(([, c]) => c === tint).map(([l]) => l), "Word cards on the Supplication span tint").toEqual([]);
});

/** The Word locations of the cards a screen reader hears `said` of. */
const cardsSaying = (page: Page, said: string) =>
  page.getByRole("button", { name: said }).evaluateAll((els) => els.map((el) => el.id).filter((id) => /^\d+:\d+:\d+$/.test(id)));

/** What a screen reader hears of each card, as expected: `inSpan` in a span, `starting` a span's pending start. */
async function expectHeard(page: Page, inSpan: string[], starting: string[]) {
  await expect.poll(() => cardsSaying(page, IN_SPAN), { message: `Word cards heard as "${IN_SPAN}"` }).toEqual(inSpan);
  await expect.poll(() => cardsSaying(page, STARTS), { message: `Word cards heard as "${STARTS}"` }).toEqual(starting);
}

Then(/^a screen reader hears the Word card at (\S+) as "a Supplication span starts here", and no other card as in a span or starting one$/, async ({ reader }, location: string) => {
  await expectHeard(reader.page, [], [location]);
});

Then(
  /^a screen reader hears the Word cards of the spans "(.+)" as "in a Supplication span", and no other card as in a span or starting one$/,
  async ({ reader }, spans: string) => {
    const cards = await drawnCards(reader.page);
    await expectHeard(reader.page, heldBy(cards.keys(), spans), []);
  },
);

// ---------------------------------------------------------------- the editor's list

/** The list's entries on screen, in order: their editors' addresses, and whether one says "Marked". */
const listedEntries = (page: Page) =>
  page.locator("main article").evaluateAll((articles) =>
    articles
      .filter((a) => a.getClientRects().length > 0)
      .map((a) => ({
        href: a.querySelector("h2 a")?.getAttribute("href") ?? "",
        marked: Array.from(a.querySelectorAll("*")).some((el) => el.children.length === 0 && el.textContent?.trim() === "Marked"),
      })),
  );

/** The list's entries a scenario first looked at, by their editors' addresses. */
const shownBefore = new WeakMap<Reading, string[]>();
const addressesOf = async (table: DataTable) => new Set(await Promise.all(table.hashes().map(async (row) => `/admin/supplications/${await idAt(row.Supplication)}`)));

Then('the list\'s entries of these Supplications say "Marked", and no other entry does:', async ({ reader, reading }, table: DataTable) => {
  const marked = await addressesOf(table);
  await expect(reader.page.locator("main article").first(), "an entry of the list").toBeVisible();
  const entries = await listedEntries(reader.page);
  shownBefore.set(reading, entries.map((e) => e.href));
  for (const address of marked) expect(entries.map((e) => e.href), `the list shows ${address}`).toContain(address);
  const wrong = entries.filter((e) => e.marked !== marked.has(e.href)).map((e) => `${e.href}${e.marked ? " says" : " does not say"} "Marked"`);
  expect(wrong, 'entries saying "Marked" that should not, or not saying it that should').toEqual([]);
});

/** The list shows the entries it showed when the scenario first looked at it, but those whose addresses are `left`. */
async function expectShownBefore(page: Page, reading: Reading, left = new Set<string>()) {
  const shown = shownBefore.get(reading);
  if (!shown) throw new Error("the list was not looked at yet in this scenario");
  const expected = shown.filter((href) => !left.has(href));
  await expect.poll(async () => (await listedEntries(page)).map((e) => e.href), { message: "the list's entries on screen" }).toEqual(expected);
}

Then("the list shows every entry it showed before but these:", async ({ reader, reading }, table: DataTable) => {
  await expectShownBefore(reader.page, reading, await addressesOf(table));
});

Then("the list shows every entry it showed before", async ({ reader, reading }) => {
  await expectShownBefore(reader.page, reading);
});
