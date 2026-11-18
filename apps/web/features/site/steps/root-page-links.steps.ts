// Steps for #289: features/site/root-page-links.feature. The Root dialog's
// head links to its Root's Root page, found in the dialog's <header> by its
// name; on the Known words page each Root's link is named by its letters. A
// Root page's address is compared decoded, as a reader reads it, the Root's
// letters without their spaces (ADR 0065); the Roots come from QUL's word root
// database (./roots).

import { expect, type Page } from "@playwright/test";
import { hydrated, type Language } from "../support";
import { STRINGS, Then, When } from "./fixtures";
import { allRoots, rootList } from "./known-roots.steps";
import { main } from "./root-page.steps";
import { rootDialog, rootPagePath } from "./roots";

/** The Root dialog's link to its Root page. */
const dialogLink = (page: Page) => rootDialog(page).locator("header").getByRole("link", { name: STRINGS.rootPage, exact: true });

Then("the Root dialog's head links to {string}", async ({ reader: { page } }, path: string) => {
  const link = dialogLink(page);
  await expect(link).toBeVisible();
  expect(decodeURI((await link.getAttribute("href")) ?? "")).toBe(path);
});

When("I follow the Root dialog's link to its Root page", async ({ reader: { page } }) => {
  const link = dialogLink(page);
  await hydrated(link);
  await link.click();
});

Then("I am on the Root page of {string} in {language}", async ({ reader: { page }, reading }, letters: string, lang: Language) => {
  await expect.poll(() => decodeURI(new URL(page.url()).pathname)).toBe(rootPagePath(lang, letters));
  await expect(main(page).locator("header").getByRole("heading", { level: 1 })).toHaveText(letters);
  reading.lang = lang;
  reading.surah = undefined;
});

Then("every Root on the Known words page links to its Root page in {language}", async ({ reader: { page } }, lang: Language) => {
  const roots = allRoots();
  const links = rootList(page).getByRole("link");
  await expect(links).toHaveCount(roots.length);
  const found = await links.evaluateAll((as) => as.map((a): [string, string] => [a.textContent?.trim() ?? "", decodeURI(a.getAttribute("href") ?? "")]));
  expect(new Map(found)).toEqual(new Map(roots.map((letters) => [letters, rootPagePath(lang, letters)])));
});

When("I follow {string} on the Known words page", async ({ reader: { page } }, letters: string) => {
  const link = rootList(page).getByRole("link", { name: letters, exact: true });
  await hydrated(link);
  await link.click();
});
