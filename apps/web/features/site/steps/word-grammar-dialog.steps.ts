// #277: the Word grammar dialog. Its Segments are held to the committed Corpus
// source (data/quran-morphology.txt): their number, order, text and Part of
// speech; every feature to the tables the scenarios give. Its Word to QUL's
// sources, its Root to QUL's word root database and its particle to ./particles,
// the Root and particle Study shows.

import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { card, clickOutside, DATA, indopakText, isModal, nextFrames, PHONE, shot, sourceWord, STRINGS } from "../support";
import { Then, When } from "./fixtures";
import { particleAt, particleText } from "./particles";
import { rootAt } from "./roots";
import type { Script } from "./reader";

/** The Word grammar dialog, open or not. */
const dialog = (page: Page) => page.locator("[data-word-grammar-dialog]");
/** Its Segments, in order. */
const segments = (page: Page) => dialog(page).locator("ol > li");

/** The grammarians' three Parts of speech as the dialog names them, by the Corpus's tag (CONTEXT.md § Part of speech). */
const PART_OF_SPEECH: Record<string, string> = { N: "Ism · اِسْم", V: "Fi'l · فِعْل", P: "Harf · حَرْف" };

let corpus: Map<string, { text: string; partOfSpeech: string }[]> | undefined;
/** Each Word's Segments as the Corpus source gives them, by Word location, read once. */
function sourceSegments(location: string) {
  if (!corpus) {
    corpus = new Map();
    for (const line of fs.readFileSync(path.join(DATA, "quran-morphology.txt"), "utf8").split("\n")) {
      if (line === "" || line.startsWith("#")) continue;
      const [at, text, partOfSpeech] = line.split("\t");
      const word = at.split(":").slice(0, 3).join(":");
      corpus.set(word, [...(corpus.get(word) ?? []), { text, partOfSpeech }]);
    }
  }
  return corpus.get(location) ?? [];
}

const grammarPageAt = (page: Page) => page.evaluate(() => ({ y: window.scrollY, width: document.body.getBoundingClientRect().width }));

// ---------------------------------------------------------------- opening

When("I tap Word {location} on the Grammar page", async ({ page, reading }, location: string) => {
  await card(page, location).click();
  reading.grammarWord = location;
});

When("I focus Word {location} on the Grammar page and press Enter", async ({ page, reading }, location: string) => {
  await card(page, location).focus();
  await page.keyboard.press("Enter");
  reading.grammarWord = location;
});

/** Taps, where it is, the first Word wholly on screen that `wanted` accepts: nothing scrolls the page to it. */
async function tapFirstOnScreen(page: Page, wanted: (location: string) => boolean) {
  const onScreen = await page.evaluate(() =>
    [...document.querySelectorAll("main [data-word]")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= 80 && box.bottom <= window.innerHeight - 20;
      })
      .map((el) => el.id),
  );
  const location = onScreen.find(wanted);
  if (!location) throw new Error("no such Word on screen");
  const box = (await card(page, location).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return location;
}

When("I tap the first Word on screen on the Grammar page", async ({ page, reading }) => {
  reading.grammarWord = await tapFirstOnScreen(page, () => true);
});

When("I tap the first Word on screen with a Root on the Grammar page", async ({ page, reading }) => {
  reading.grammarWord = await tapFirstOnScreen(page, (location) => rootAt(location) !== null);
});

Then("the Word grammar dialog is open", async ({ page }) => {
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: STRINGS.close, exact: true })).toBeVisible();
});

Then(
  "the Word grammar dialog for Word {location} is open, its head showing its {script} text and its Word location",
  async ({ page }, location: string, script: Script) => {
    const text = script === "uthmani" ? sourceWord(location).uthmani : indopakText(location);
    const head = dialog(page).locator("header");
    await expect(dialog(page)).toBeVisible();
    await expect(head.getByRole("heading", { name: text, exact: true })).toBeVisible();
    await expect(head.getByText(location, { exact: true })).toBeVisible();
  },
);

Then("the Word grammar dialog is a modal dialog named by its Word, with its close button named {string}", async ({ page, reading }, name: string) => {
  await expect(dialog(page)).toHaveAccessibleName(sourceWord(reading.grammarWord!).uthmani);
  expect(await isModal(dialog(page)), "a modal dialog").toBe(true);
  await expect(dialog(page).getByRole("button", { name, exact: true })).toBeVisible();
});

// ---------------------------------------------------------------- its Segments

Then(
  "the Word grammar dialog lists Word {location}'s Segments in order, each in the source's text with its Part of speech",
  async ({ page }, location: string) => {
    const expected = sourceSegments(location);
    expect(expected.length, `the Corpus's Segments of ${location}`).toBeGreaterThan(0);
    await expect(segments(page)).toHaveCount(expected.length);
    for (const [i, { text, partOfSpeech }] of expected.entries()) {
      const segment = segments(page).nth(i);
      await expect(segment.locator(":scope > [lang=ar]"), `Segment ${i + 1}'s text`).toHaveText(text);
      await expect(segment.getByRole("listitem").first(), `Segment ${i + 1}'s Part of speech`).toHaveText(PART_OF_SPEECH[partOfSpeech]);
    }
  },
);

Then("the Word grammar dialog's Segments read:", async ({ page }, table: { hashes(): { Segment: string; Terms: string }[] }) => {
  const rows = table.hashes();
  await expect(segments(page)).toHaveCount(rows.length);
  for (const [i, { Segment, Terms }] of rows.entries()) {
    const segment = segments(page).nth(i);
    await expect(segment.locator(":scope > [lang=ar]")).toHaveText(Segment);
    await expect(segment.getByRole("listitem")).toHaveText(Terms.split(";").map((t) => t.trim()));
  }
});

Then("the Word grammar dialog says the Word has no Word grammar", async ({ page }) => {
  await expect(dialog(page).getByText(STRINGS.noWordGrammar, { exact: true })).toBeVisible();
  await expect(segments(page)).toHaveCount(0);
});

const NOTE = /Segments are in the Uthmani Script/;

Then("the Word grammar dialog shows the note that its Segments are in Uthmani", async ({ page }) => {
  await expect(dialog(page).getByText(NOTE)).toBeVisible();
});

Then("the Word grammar dialog does not show the note that its Segments are in Uthmani", async ({ page }) => {
  // Its Segments show, so the dialog has loaded and the note would be there by now.
  await expect(segments(page).first()).toBeVisible();
  await expect(dialog(page).getByText(NOTE)).toBeHidden();
});

// ---------------------------------------------------------------- to its Root or particle

const rootTagIn = (page: Page, location: string) => dialog(page).getByRole("button", { name: rootAt(location)!.letters, exact: true });

Then("the Word grammar dialog offers the Root QUL gives {location}", async ({ page }, location: string) => {
  expect(rootAt(location), `QUL's Root at ${location}`).not.toBeNull();
  await expect(rootTagIn(page, location)).toBeVisible();
});

When("I open the Root tag in the Word grammar dialog", async ({ page, reading }) => {
  const root = rootAt(reading.grammarWord!);
  if (!root) throw new Error(`QUL gives ${reading.grammarWord} no Root`);
  await rootTagIn(page, reading.grammarWord!).click();
  reading.root = root.letters;
});

When("I open the Particle tag in the Word grammar dialog", async ({ page, reading }) => {
  const particle = particleAt(reading.grammarWord!);
  if (!particle) throw new Error(`${reading.grammarWord} has a Root, not a particle`);
  await dialog(page).getByRole("button", { name: particle.text, exact: true }).click();
});

/** The dialog named `name` is open and on top of the Word grammar dialog, which is open beneath it. */
async function expectOpenOver(page: Page, name: string) {
  const over = page.getByRole("dialog", { name, exact: true });
  await expect(over).toBeVisible();
  await expect(dialog(page)).toBeVisible();
  // Whatever is at the top dialog's head is its own: it is drawn over the Word grammar dialog.
  const head = (await over.locator("header").boundingBox())!;
  const point = [head.x + head.width / 2, head.y + head.height / 2];
  expect(await over.evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x, y)), point), `${name} is on top`).toBe(true);
}

Then("the Root dialog for the Root QUL gives {location} is open over the Word grammar dialog", async ({ page }, location: string) => {
  await expectOpenOver(page, rootAt(location)!.letters);
});

Then("the Particle dialog for Word {location}'s particle is open over the Word grammar dialog", async ({ page }, location: string) => {
  // The page shows the reader's default Script, Uthmani.
  await expectOpenOver(page, particleText(particleAt(location)!, "uthmani"));
});

When("I close the top dialog with Escape", async ({ page }) => {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

Then("the Root tag in the Word grammar dialog has focus", async ({ page, reading }) => {
  await expect(rootTagIn(page, reading.grammarWord!)).toBeFocused();
});

// ---------------------------------------------------------------- closing, and the page beneath

When("I scroll the Grammar page down by {int} pixels", async ({ page }, dy: number) => {
  await page.evaluate((dy) => window.scrollTo({ top: dy, behavior: "instant" }), dy);
  await nextFrames(page);
});

When("I note where the Grammar page is", async ({ page, reading }) => {
  await nextFrames(page);
  reading.grammarPageAt = await grammarPageAt(page);
  expect(reading.grammarPageAt.y, "the page has scrolled").toBeGreaterThan(0);
});

When("I turn the mouse wheel down by {int} pixels over the Word grammar dialog", async ({ page }, dy: number) => {
  const box = (await dialog(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, dy);
  await nextFrames(page);
});

When("I close the Word grammar dialog with its close button", async ({ page }) => {
  await dialog(page).getByRole("button", { name: STRINGS.close, exact: true }).click();
});

When("I close the Word grammar dialog with a click outside", async ({ page }) => {
  await clickOutside(dialog(page));
});

When("I close the Word grammar dialog with Escape", async ({ page }) => {
  await page.keyboard.press("Escape");
});

Then("no Word grammar dialog is open", async ({ page }) => {
  await expect(dialog(page)).toHaveCount(0);
});

Then("the Word I tapped has focus", async ({ page, reading }) => {
  await expect(card(page, reading.grammarWord!)).toBeFocused();
});

Then("the Grammar page has not moved", async ({ page, reading }) => {
  await nextFrames(page);
  expect(await grammarPageAt(page)).toEqual(reading.grammarPageAt);
});

// ---------------------------------------------------------------- evidence

When("I save a screenshot of the Word grammar dialog {string}", async ({ page }, name: string) => {
  await expect(segments(page).first()).toBeVisible();
  await shot(page, name);
});

When("I save a screenshot of the Word grammar dialog {string} on a phone", async ({ page }, name: string) => {
  await page.setViewportSize(PHONE);
  await expect(segments(page).first()).toBeVisible();
  await shot(page, name);
});
