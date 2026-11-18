// Steps for opening a Surah from inside the app (#24): its skeleton, its Ayahs
// arriving in parts, and what happens when they are slow or fail. The server's
// parts are held back or failed by intercepting the browser's requests for
// them (./parts-server, shared with the Theme opening, #131), which is all a
// reader on a slow or broken connection would see.

import { expect, type Page } from "@playwright/test";
import { ayahSection, ayahSections, hydrated, sourceWords, surahMeta } from "../support";
import { shownBar } from "./destinations.steps";
import { Given, Then, When } from "./fixtures";
import { partsServer } from "./parts-server";

const reading = (page: Page) => page.locator("main");
const skeleton = (page: Page) => page.locator("main [data-skeleton]");
const failure = (page: Page) => page.locator("main [role=alert]");
const retry = (page: Page) => failure(page).getByRole("button", { name: "Retry", exact: true });

// ---------------------------------------------------------------- leaving a visit

// From the keyboard, so the page stays where the reader scrolled it: a mouse
// click on the sticky (or slid away) bar's link makes Playwright scroll the
// page first, which a reader's tap never does, and that scroll moves the
// place the visit is left at. Enter on the link before React has hydrated it
// would load a new document, which a reader's later tap (once it has) never does.
When(/^I follow the destination "(Read|Explore|Me)" from the keyboard$/, async ({ reader }, name: string) => {
  const link = (await shownBar(reader.page)).getByRole("link", { name, exact: true });
  await hydrated(link, "the link, hydrated");
  await link.evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
  await reader.page.keyboard.press("Enter");
});

// ---------------------------------------------------------------- the server

Given("the server holds back every part of a Surah", async ({ reader }) => {
  await partsServer(reader.page, "hold");
});

Given("the server holds back every part of a Surah but the first", async ({ reader }) => {
  await partsServer(reader.page, "hold", true);
});

Given("the server fails every part of a Surah but the first", async ({ reader }) => {
  await partsServer(reader.page, "fail", true);
});

When("the held-back parts arrive", async ({ reader }) => {
  await partsServer(reader.page, "serve");
});

When("the server serves every part again", async ({ reader }) => {
  await partsServer(reader.page, "serve");
});

// ---------------------------------------------------------------- getting around

// The previous and next Surah links at the foot of the Surah, after its reading area;
// since #192 each also names its Surah ("Next → 3. Al-Imran").
When("I follow the next Surah link at the foot of the Surah", async ({ reader }) => {
  const from = reader.page.url();
  await reader.page.locator("main ~ nav").getByRole("link", { name: /^[^\p{L}]*Next\b/u }).click();
  await expect(reader.page).not.toHaveURL(from);
});

When("I go back {int} pages", async ({ reader }, pages: number) => {
  // One page at a time, as a reader presses Back: each Back waits for the last
  // to land, since one leap of many entries can be dropped while the page is busy.
  for (let n = 0; n < pages; n++) {
    const from = reader.page.url();
    await reader.page.evaluate(() => void setTimeout(() => history.back()));
    await expect(reader.page).not.toHaveURL(from);
  }
});

When("I press Retry", async ({ reader }) => {
  await retry(reader.page).click();
});

Given("my system prefers reduced motion", async ({ reader }) => {
  await reader.page.emulateMedia({ reducedMotion: "reduce" });
});

// ---------------------------------------------------------------- what the page shows

Then("the Surah's loading skeleton is shown", async ({ reader }) => {
  await expect(skeleton(reader.page).first()).toBeVisible();
  await expect(reading(reader.page)).toHaveAttribute("aria-busy", "true");
});

Then("no loading skeleton is shown", async ({ reader }) => {
  await expect(skeleton(reader.page)).toHaveCount(0);
});

Then("no Ayah is shown yet", async ({ reader }) => {
  await expect(ayahSections(reader.page)).toHaveCount(0);
});

Then("Ayah {word} is shown while the Surah is still loading", async ({ reader }, ayah: string) => {
  await expect(ayahSection(reader.page, ayah)).toBeVisible();
  await expect(reading(reader.page)).toHaveAttribute("aria-busy", "true");
});

Then("Ayah {word} is shown", async ({ reader }, ayah: string) => {
  await expect(ayahSection(reader.page, ayah)).toBeVisible();
});

Then("every Ayah of Surah {int} is shown", async ({ reader }, surah: number) => {
  await expect(ayahSections(reader.page)).toHaveCount(surahMeta(surah).verses_count, { timeout: 30_000 });
  await expect(reading(reader.page)).toHaveAttribute("aria-busy", "false");
  await expect(skeleton(reader.page)).toHaveCount(0);
});

const expectFailure = async (page: Page, timeout?: number) => {
  await expect(failure(page)).toContainText("could not be loaded", { timeout });
  await expect(retry(page)).toBeVisible();
};

Then("the page says the rest of the Surah could not be loaded, with a Retry button", async ({ reader }) => {
  await expectFailure(reader.page);
});

Then(
  "within {int} seconds the page says the rest of the Surah could not be loaded, with a Retry button",
  async ({ reader }, seconds: number) => {
    await expect(failure(reader.page)).toHaveCount(0);
    await expectFailure(reader.page, seconds * 1000);
  },
);

Then("the page no longer says the rest of the Surah could not be loaded", async ({ reader }) => {
  await expect(failure(reader.page)).toHaveCount(0);
});

/** The animation of each shimmering placeholder in the skeleton. */
const shimmers = (page: Page) =>
  skeleton(page).locator("div").evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).backgroundImage.includes("gradient")).map((el) => getComputedStyle(el).animationName),
  );

Then("the loading skeleton is still", async ({ reader }) => {
  const animations = await shimmers(reader.page);
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.filter((name) => name !== "none")).toEqual([]);
});

Then("the loading skeleton shimmers", async ({ reader }) => {
  await expect(skeleton(reader.page).first()).toBeVisible();
  const animations = await shimmers(reader.page);
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.filter((name) => name === "none")).toEqual([]);
});

// A browser loading the page itself, not the app moving to it, asks for no RSC payload (no `rsc` header).
Then(
  "the page {string} as loaded directly carries every Word card of Surah {int}",
  async ({ request }, address: string, surah: number) => {
    const res = await request.get(address);
    expect(res.status()).toBe(200);
    const html = await res.text();
    const shown = new Set([...html.matchAll(/ id="(\d+:\d+:\d+)"/g)].map((m) => m[1]));
    const words = sourceWords(surah).map((w) => w.location);
    expect(words.length).toBeGreaterThan(0);
    expect(words.filter((location) => !shown.has(location)), "Word cards missing from the page").toEqual([]);
  },
);
