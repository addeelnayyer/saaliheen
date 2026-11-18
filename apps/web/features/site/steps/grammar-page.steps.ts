// #275: the Grammar page. A Word is found by its location (its id), its Arabic
// and Word meaning held to QUL's sources; its Grammar line and the underline
// beneath its Arabic to the Part of speech colour tokens, resolved in the
// browser; the three colours to each other and to the theme's paper.

import { expect, type Page } from "@playwright/test";
import { card, indopakText, sourceWord, type Language } from "../support";
import { STRINGS, Then, When, resolveColor } from "./fixtures";
import { contrast } from "./phrase-colours.steps";
import { PAPER, type Theme } from "./reader";

/** Each Part of speech's colour token, by the name a scenario gives it. */
const TOKENS: Record<string, string> = { Ism: "var(--grammar-ism)", "Fi'l": "var(--grammar-fil)", Harf: "var(--grammar-harf)" };

export const arabicOf = (page: Page, location: string) => card(page, location).locator(":scope > [lang=ar]:visible");
const lineOf = (page: Page, location: string) => card(page, location).locator(":scope > span").last();

When("I open the Grammar page of Surah {int} in {language}", async ({ reader, reading }, surah: number, lang: Language) => {
  reading.status = (await reader.page.goto(`/${lang}/grammar/${surah}`))?.status();
  reading.lang = lang;
  reading.surah = surah;
});

Then("the page is titled {string}", async ({ reader }, title: string) => {
  await expect(reader.page).toHaveTitle(title);
});

Then("the page is not found", async ({ reading }) => {
  expect(reading.status).toBe(404);
});

Then("Word {location} shows its Uthmani text and its {language} Word meaning from QUL", async ({ reader }, location: string, lang: Language) => {
  const word = sourceWord(location);
  await expect(arabicOf(reader.page, location)).toHaveText(word.uthmani);
  await expect(card(reader.page, location).getByText(word.meaning[lang], { exact: true })).toBeVisible();
});

Then("Word {location} shows its Indo-Pak text from QUL", async ({ reader }, location: string) => {
  await expect(arabicOf(reader.page, location)).toHaveText(indopakText(location));
});

Then(
  "Word {location}'s Grammar line reads {string}, drawn in the {word} colour, as is the underline beneath its Arabic",
  async ({ reader }, location: string, text: string, partOfSpeech: string) => {
    const page = reader.page;
    expect(TOKENS[partOfSpeech], `a Part of speech the steps know: ${partOfSpeech}`).toBeDefined();
    const colour = await resolveColor(page, TOKENS[partOfSpeech]);
    const line = lineOf(page, location);
    await expect(line).toHaveText(text);
    await expect(line).toHaveCSS("color", colour);
    await expect(arabicOf(page, location)).toHaveCSS("border-bottom-color", colour);
  },
);

Then("Word {location} says it has no Word grammar, with no underline beneath its Arabic", async ({ reader }, location: string) => {
  await expect(lineOf(reader.page, location)).toHaveText(STRINGS.noWordGrammar);
  await expect(arabicOf(reader.page, location)).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
});

Then("the Ism, Fi'l and Harf colours are three, each keeping 4.5:1 on the {theme} paper", async ({ reader }, theme: Theme) => {
  const page = reader.page;
  const colours = await Promise.all(Object.values(TOKENS).map((t) => resolveColor(page, t)));
  expect(new Set(colours).size, `three colours: ${colours.join(", ")}`).toBe(3);
  const paper = await resolveColor(page, PAPER[theme]);
  for (const colour of colours) expect(contrast(colour, paper), `${colour} on ${paper}`).toBeGreaterThanOrEqual(4.5);
});

Then("every Word's Arabic letters are drawn in the ink", async ({ reader }) => {
  const page = reader.page;
  const ink = await resolveColor(page, "var(--ink)");
  const colours = await page.locator("main [data-word] > [lang=ar]:visible").evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).color))]);
  expect(colours).toEqual([ink]);
});
