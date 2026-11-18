// The site documents, the privacy policy and the terms of service, and the
// Surah index footer that links to them (#50).

import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";

Given("I open the site document {string}", async ({ page, reading }, path: string) => {
  reading.status = (await page.goto(path))?.status();
  reading.surah = undefined;
});

Then("the page's heading reads {string}", async ({ page }, heading: string) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
});

Then("the brand links to {string}", async ({ page }, href: string) => {
  await expect(page.getByRole("banner").getByRole("link", { name: "Saaliheen" })).toHaveAttribute("href", href);
});

When("I follow the footer link {string}", async ({ page }, label: string) => {
  await page.getByRole("contentinfo").getByRole("link", { name: label, exact: true }).click();
});

Then("I am on the site document {string}", async ({ page }, path: string) => {
  await expect(page).toHaveURL(path);
});
