// The Surah bar's picker of Surahs and Juz (#193): the Surah's name on the
// Surah bar opens a dialog with the Surah index's Surahs and Juz tabs. Where
// each Juz runs comes from steps/juz.ts; Surah names from QUL's Surah metadata.

import { expect, type Page } from "@playwright/test";
import { shot, sourceSurahs } from "../support";
import { Then, When, surahOf } from "./fixtures";
import { panelIn, rowLinks, rowsOf, tabIn, type IndexTab } from "./index-tabs";
import { juzOf, runsText } from "./juz";

const ALL_SURAHS = sourceSurahs().map((s) => s.number);
const ALL_JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

const slimRow = (page: Page) => page.getByRole("navigation", { name: "Surah", exact: true });
const picker = (page: Page) => page.getByRole("dialog").filter({ has: page.getByRole("tablist") });

/** The Surah bar's button holding the Surah's name: it names the Surah as it shows it (WCAG's label in name). */
const nameButton = (page: Page, surah: number) =>
  slimRow(page).getByRole("button", { name: new RegExp(sourceSurahs()[surah - 1].nameLatin) });

const tabName = (s: string): IndexTab => {
  if (s !== "Surahs" && s !== "Juz") throw new Error(`no "${s}" tab`);
  return s;
};

const shownJuz = async (page: Page) => (await rowsOf(panelIn(picker(page), "Juz"))).map((r) => r.number);

Then("the Surah's name on the Surah bar is a button that opens a dialog", async ({ page, reading }) => {
  const button = nameButton(page, surahOf(reading));
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-haspopup", "dialog");
});

When("I press the Surah's name on the Surah bar", async ({ page, reading }) => {
  await nameButton(page, surahOf(reading)).click();
});

When("I tap the Surah's name on the mini Surah bar", async ({ page }) => {
  // One tap where the mini bar shows the Surah's Arabic name, as a reader's finger lands.
  const names = page.locator('[data-form="mini"] [lang="ar"]').first();
  const box = await names.boundingBox();
  if (!box) throw new Error("the mini Surah bar shows no Surah name");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
});

When("I move keyboard focus to the Surah's name on the Surah bar", async ({ page, reading }) => {
  await nameButton(page, surahOf(reading)).focus();
});

Then("the Surah's name on the Surah bar has the focus", async ({ page, reading }) => {
  await expect(nameButton(page, surahOf(reading))).toBeFocused();
});

Then("the quick picker is open with the {string} tab selected", async ({ page }, name: string) => {
  await expect(picker(page)).toBeVisible();
  await expect(picker(page)).toHaveAttribute("aria-modal", "true");
  await expect(tabIn(picker(page), tabName(name))).toHaveAttribute("aria-selected", "true");
});

Then("the quick picker is closed", async ({ page }) => {
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

Then("the keyboard focus is inside the quick picker", async ({ page }) => {
  await expect(picker(page).locator(":focus")).toHaveCount(1);
});

Then("the quick picker's Surahs tab lists all 114 Surahs", async ({ page, reading }) => {
  const lang = new URL(page.url()).pathname.split("/")[1];
  await expect
    .poll(async () =>
      (await rowsOf(panelIn(picker(page), "Surahs"))).filter((r) => new RegExp(`^/${lang}/\\d+$`).test(r.href)).map((r) => Number(r.href.split("/")[2])),
    )
    .toEqual(ALL_SURAHS);
  expect(surahOf(reading)).toBeGreaterThan(0);
});

When("I choose the quick picker's {string} tab", async ({ page }, name: string) => {
  await tabIn(picker(page), tabName(name)).click();
});

When("I move keyboard focus to the quick picker's {string} tab", async ({ page }, name: string) => {
  await tabIn(picker(page), tabName(name)).focus();
});

Then("the quick picker's {string} tab is selected", async ({ page }, name: string) => {
  await expect(tabIn(picker(page), tabName(name))).toHaveAttribute("aria-selected", "true");
});

Then("the quick picker's {string} tab is selected and has the focus", async ({ page }, name: string) => {
  await expect(tabIn(picker(page), tabName(name))).toHaveAttribute("aria-selected", "true");
  await expect(tabIn(picker(page), tabName(name))).toBeFocused();
});

Then("the quick picker's Juz tab lists all 30 Juz, each with where it runs in Uthmani", async ({ page }) => {
  await expect.poll(() => shownJuz(page)).toEqual(ALL_JUZ);
  for (const row of await rowsOf(panelIn(picker(page), "Juz"))) {
    expect(row.text, `Juz ${row.number}'s row`).toContain(runsText(juzOf("uthmani", row.number)));
  }
});

When("I choose Surah {int} in the quick picker", async ({ page }, surah: number) => {
  const lang = new URL(page.url()).pathname.split("/")[1];
  await rowLinks(panelIn(picker(page), "Surahs")).and(page.locator(`[href="/${lang}/${surah}"]`)).click();
});

When("I choose Juz {int} in the quick picker", async ({ page }, n: number) => {
  await expect.poll(() => shownJuz(page), `Juz ${n} in the picker`).toContain(n);
  await rowLinks(panelIn(picker(page), "Juz")).nth((await shownJuz(page)).indexOf(n)).click();
});

Then("I save a screenshot of the quick picker {string}", async ({ page }, name: string) => {
  await shot(page, name);
});
