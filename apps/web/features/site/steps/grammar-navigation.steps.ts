// #279: getting around Quran Grammar. The Grammar page's Surah picker is found
// as a screen reader finds it, a button opening a dialog of Surah links; its
// foot as the Surah page's is, the navigation named "Surahs". Surah names are
// QUL's Surah metadata. A Link preview is fetched as an app fetches it
// (link-preview.steps.ts).

import { expect, type Page } from "@playwright/test";
import { card, clickOutside, expectFocusStayedInside, focusInside, isModal, sourceSurahs, STRINGS, type Language } from "../support";
import { resolveColor, Then, When } from "./fixtures";
import { rowsOf } from "./index-tabs";
import { fetchPage, type App } from "./link-preview.steps";

const ALL_SURAHS = sourceSurahs().map((s) => s.number);

const langOf = (page: Page) => new URL(page.url()).pathname.split("/")[1];
const grammarPath = (lang: string, surah: number) => `/${lang}/grammar/${surah}`;

const pickerButton = (page: Page) => page.getByRole("button", { name: STRINGS.grammarPicker, exact: true });
const picker = (page: Page) => page.getByRole("dialog", { name: STRINGS.grammarPicker });

/** The Grammar page each of the picker's rows leads to, by Surah number, or NaN for a row leading elsewhere. */
const pickerSurahs = async (page: Page) =>
  (await rowsOf(picker(page))).map(({ href }) => Number(href.match(new RegExp(`^/${langOf(page)}/grammar/(\\d+)$`))?.[1]));

Then("the Grammar page is of Surah {int}", async ({ page }, surah: number) => {
  const { nameLatin } = sourceSurahs()[surah - 1];
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`${surah}. ${nameLatin}`);
});

// Surah 2's later Grammar parts take a while to arrive (#278): its reading area is busy until they have.
Then("the Grammar page has all its Ayahs", async ({ page }) => {
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
});

// As a reader does, by the wheel: the page stops seating the Word it landed on (ayah-at-top.ts's TAKE_OVER).
When("I scroll back up to the Grammar page's head", async ({ page }) => {
  await page.mouse.move(10, 200);
  await page.mouse.wheel(0, -100_000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

When("I open the Grammar page's Surah picker", async ({ page }) => {
  await expect(pickerButton(page)).toHaveAttribute("aria-haspopup", "dialog");
  await pickerButton(page).click();
  await expect(picker(page)).toBeVisible();
});

Then("the Grammar page's Surah picker lists all 114 Surahs, each leading to its Grammar page in {language}", async ({ page }, lang: Language) => {
  expect(langOf(page)).toBe(lang);
  // Each row leads to its own Surah's Grammar page and names it, read in one go.
  const rows = async () => (await rowsOf(picker(page))).map(({ href, text }) => [href, text.includes(sourceSurahs()[Number(href.split("/").pop()) - 1]?.nameLatin)]);
  await expect.poll(rows).toEqual(ALL_SURAHS.map((n) => [grammarPath(lang, n), true]));
});

Then("the Grammar page's Surah picker is a modal dialog holding the focus", async ({ page }) => {
  expect(await isModal(picker(page))).toBe(true);
  await expect.poll(() => focusInside(picker(page))).toBe(true);
});

// After "I press Tab 6 times" (roots.steps.ts).
Then("focus stayed inside the Grammar page's Surah picker after every press", async ({ page, reading }) => {
  await expect(picker(page)).toBeVisible();
  expectFocusStayedInside(reading.focusTrail);
});

When(/^I close the Grammar page's Surah picker with (its close button|Escape|a click outside it)$/, async ({ page }, how: string) => {
  if (how === "Escape") await page.keyboard.press("Escape");
  else if (how === "its close button") await picker(page).getByRole("button", { name: STRINGS.close, exact: true }).click();
  else await clickOutside(picker(page));
});

Then("the Grammar page's Surah picker is closed", async ({ page }) => {
  await expect(picker(page)).toHaveCount(0);
});

Then("the Grammar page's Surah picker is closed and its button has the focus", async ({ page }) => {
  await expect(picker(page)).toHaveCount(0);
  await expect(pickerButton(page)).toBeFocused();
});

When("I search the Grammar page's Surah picker for {string}", async ({ page }, query: string) => {
  await picker(page).getByRole("searchbox").fill(query);
});

Then("the Grammar page's Surah picker lists only Surah {int}", async ({ page }, surah: number) => {
  await expect.poll(() => pickerSurahs(page)).toEqual([surah]);
});

When("I choose Surah {int} in the Grammar page's Surah picker", async ({ page }, surah: number) => {
  await picker(page).locator(`a[href="${grammarPath(langOf(page), surah)}"]`).click();
});

Then(
  "the Grammar page's foot leads to the Grammar pages of Surah {int} and Surah {int} in {language}, each named by its Latin name from the Surah metadata",
  async ({ page }, prev: number, next: number, lang: Language) => {
    const foot = page.getByRole("navigation", { name: STRINGS.surahFoot, exact: true });
    for (const [n, word] of [
      [prev, STRINGS.prev],
      [next, STRINGS.next],
    ] as const) {
      const link = foot.getByRole("link", { name: word });
      await expect(link, `the link to Surah ${n}`).toHaveAttribute("href", grammarPath(lang, n));
      await expect(link).toContainText(`${n}. ${sourceSurahs()[n - 1].nameLatin}`);
    }
  },
);

Then("the address, with its Word location, is {string}", async ({ page }, address: string) => {
  await expect(page).toHaveURL((url) => url.pathname + url.hash === address);
});

// A Word location is marked as a Surah page's Word card is, by the accent colour as its border.
const wordBorder = (page: Page, location: string) =>
  card(page, location).evaluate((el) => getComputedStyle(el).borderTopColor);

Then("the Word at {location} is marked", async ({ page }, location: string) => {
  const accent = await resolveColor(page, "var(--accent)");
  await expect.poll(() => wordBorder(page, location)).toBe(accent);
});

Then("the Word at {location} is not marked", async ({ page }, location: string) => {
  const accent = await resolveColor(page, "var(--accent)");
  expect(await wordBorder(page, location)).not.toBe(accent);
});

When("{app} fetches the Grammar page of Surah {int} in {language}", async ({ reader, reading }, app: App, surah: number, lang: Language) => {
  await fetchPage(reader.page.request, reading, app, grammarPath(lang, surah));
});

Then("the Grammar page has no Recitation control", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Listen from Ayah/ }), "Listen buttons").toHaveCount(0);
  await expect(page.getByRole("button", { name: STRINGS.play, exact: true }), "Play").toHaveCount(0);
  await expect(page.getByRole("region", { name: STRINGS.recitationBar }), "the Recitation bar").toHaveCount(0);
});
