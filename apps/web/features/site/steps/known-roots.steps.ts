// Steps for #248: Known Roots, marked with Memorized? in the Root dialog and on
// the Known words page on Me, in the browser the reader is looking at (#252).
// Controls are found by role and accessible name; the Roots the page should
// list come from QUL's word root database (./roots), in the Arabic alphabet's
// order written out here.

import { expect, type Locator, type Page } from "@playwright/test";
import { blockStorage, hydrated, type Language } from "../support";
import { Given, Then, When } from "./fixtures";
import { inArabicOrder, qulAnalysis, rootDialog } from "./roots";

/** The Root dialog's, or the Particle dialog's, Memorized? choice: the one dialog's. */
const dialogMemorized = (page: Page) => rootDialog(page).getByRole("switch", { name: "Memorized?", exact: true });

/** The Known words page's content. */
const main = (page: Page) => page.getByRole("main");

/** The Known words page's list of Roots. */
export const rootList = (page: Page) => main(page).getByRole("list", { name: "Roots", exact: true });

/** The rows the Known words page shows, on whichever tab is chosen. */
export const rows = (page: Page) => main(page).getByRole("list").getByRole("listitem");

/** The row of the Root `letters`, or of the particle with that text, on the Known words page. */
const rowOf = (page: Page, letters: string) => rows(page).filter({ has: page.getByText(letters, { exact: true }) });

/** The Memorized? choice on the row of the Root `letters`, or of the particle with that text. */
const rowMemorized = (page: Page, letters: string) => rowOf(page, letters).getByRole("switch", { name: /^Memorized\?/ });

/** The Arabic of every row the page shows, in order, as the reader sees it: a Root's letters, or a particle in the Script shown. */
export const shownLetters = (page: Page) =>
  rows(page).evaluateAll((items) => items.map((item) => (item.querySelector('[lang="ar"]') as HTMLElement | null)?.innerText.trim() ?? ""));

/** Every QUL Root's letters. */
export const allRoots = () => [...qulAnalysis().roots.values()].map((r) => r.letters);

/** Flips a switch, as a reader would once the page has hydrated: a tap before then does nothing. */
async function flip(choice: Locator) {
  await hydrated(choice);
  const was = await choice.getAttribute("aria-checked");
  await choice.click();
  await expect(choice).not.toHaveAttribute("aria-checked", was ?? "");
}

/** Flips Memorized? on the row of the Root `letters`, in `page`. */
async function flipRow(page: Page, letters: string) {
  const choice = rowMemorized(page, letters);
  await choice.scrollIntoViewIfNeeded();
  await flip(choice);
}

// ---------------------------------------------------------------- storage unavailable

// As "a browser whose storage is unavailable", but on this scenario's own page,
// which the Root dialog's steps use: every use of localStorage or sessionStorage throws.
Given("this browser's storage is unavailable", async ({ page }) => {
  await blockStorage(page.context());
});

// ---------------------------------------------------------------- the Root dialog

When(/^I switch the (?:Root|Particle) dialog's Memorized\?$/, async ({ reader: { page } }) => {
  await flip(dialogMemorized(page));
});

Then(/^the (?:Root|Particle) dialog's Memorized\? is (on|off)$/, async ({ reader: { page } }, state: string) => {
  await expect(dialogMemorized(page)).toHaveAttribute("aria-checked", String(state === "on"));
});

Then(/^the (?:Root dialog's Memorized\? is in its head, beside its letters|Particle dialog's Memorized\? is in its head, beside its particle)$/, async ({ reader: { page } }) => {
  const dialog = rootDialog(page);
  const choice = dialogMemorized(page);
  await expect(choice).toBeVisible();
  const letters = dialog.getByRole("heading", { level: 2 });
  // Measured again until the dialog has finished opening.
  await expect(async () => {
    const [c, l] = [(await choice.boundingBox())!, (await letters.boundingBox())!];
    const middle = c.y + c.height / 2;
    expect(middle, "Memorized? level with the Root's letters or the particle").toBeGreaterThan(l.y);
    expect(middle, "Memorized? level with the Root's letters or the particle").toBeLessThan(l.y + l.height);
    expect(c.x + c.width, "Memorized? beside, not over, the Root's letters or the particle").toBeLessThanOrEqual(l.x + 1);
  }).toPass();
});

// ---------------------------------------------------------------- the Known words page

Given("I open the Known words page in {language}", async ({ reader, reading }, lang: Language) => {
  reading.status = (await reader.page.goto(`/${lang}/me/known-words`))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

Then("the Known words page's {string} tab is selected", async ({ reader: { page } }, name: string) => {
  await expect(main(page).getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
});

Then("the Known words page's head reads {string}", async ({ reader: { page } }, count: string) => {
  await expect(main(page).getByText(count, { exact: true })).toBeVisible();
});

Then(
  "the Known words page lists every Root in Arabic letter order, each with a Memorized? choice that is off",
  async ({ reader: { page } }) => {
    const expected = allRoots().sort(inArabicOrder);
    expect(expected).toHaveLength(1642);
    expect(await shownLetters(page)).toEqual(expected);
    const choices = rootList(page).getByRole("switch");
    await expect(choices).toHaveCount(1642);
    expect(await choices.evaluateAll((els) => els.filter((el) => el.getAttribute("aria-checked") !== "false").length)).toBe(0);
  },
);

When("I search the Known words page for {string}", async ({ reader: { page } }, search: string) => {
  const box = main(page).getByRole("searchbox");
  await hydrated(box);
  await box.fill(search);
});

Then("the Known words page lists only the Roots whose letters hold {string} in a row", async ({ reader: { page } }, letters: string) => {
  const held = letters.replaceAll(" ", "");
  const expected = allRoots()
    .filter((root) => root.replaceAll(" ", "").includes(held))
    .sort(inArabicOrder);
  expect(expected.length, `QUL's Roots holding ${letters}`).toBeGreaterThan(0);
  await expect.poll(() => shownLetters(page)).toEqual(expected);
});

Then("the Known words page lists {string}", async ({ reader: { page } }, letters: string) => {
  await expect(rowOf(page, letters)).toHaveCount(1);
  await expect.poll(async () => (await shownLetters(page)).length).toBeLessThan(1642);
});

Then("the Known words page does not list {string}", async ({ reader: { page } }, letters: string) => {
  await expect(rowOf(page, letters)).toHaveCount(0);
});

Then("the Known words page lists no Roots and says none match", async ({ reader: { page } }) => {
  await expect(rows(page)).toHaveCount(0);
  await expect(main(page).getByText("No Root matches this search.", { exact: true })).toBeVisible();
});

Then("the Known words page lists {int} Roots", async ({ reader: { page } }, n: number) => {
  await expect(rows(page)).toHaveCount(n);
});

/** Each scenario's second tab, in the same browser as its page. */
const secondTabs = new WeakMap<Page, Page>();

Given("a second tab on the Known words page in {language}", async ({ reader: { page } }, lang: Language) => {
  const second = await page.context().newPage();
  await second.goto(`/${lang}/me/known-words`);
  secondTabs.set(page, second);
});

When("I switch Memorized? for {string} in the second tab", async ({ reader: { page } }, letters: string) => {
  await flipRow(secondTabs.get(page)!, letters);
});

When("I switch Memorized? for {string} on the Known words page", async ({ reader: { page } }, letters: string) => {
  await flipRow(page, letters);
});

Then(/^Memorized\? for "(.+)" on the Known words page is (on|off)$/, async ({ reader: { page } }, letters: string, state: string) => {
  await expect(rowMemorized(page, letters)).toHaveAttribute("aria-checked", String(state === "on"));
});
