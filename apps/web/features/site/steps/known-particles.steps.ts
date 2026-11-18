// Steps for #251: Known particles, marked with Memorized? in the Particle
// dialog and on the Known words page's Particles tab, and tinted by Known words
// colour. Marking, the Known words page's rows and its search are the Known
// Roots' steps (./known-roots.steps.ts); the green is read as the Known words
// colour steps read it (./known-words-colour.steps.ts). Every particle, and the
// particle of each Word, comes from the committed sources through ./particles,
// never typed. A particle is written as its kind (Lemma or Spelling) and text.

import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";
import { rows, shownLetters } from "./known-roots.steps";
import { expectGreenWhere, knowWords } from "./known-words-colour.steps";
import { allParticles, particleAt } from "./particles";

/** A particle's kind as a step writes it, and as Known words keep it. */
const kindOf = (kind: string) => kind.toLowerCase() as "lemma" | "spelling";

Given(/^this browser knows the (Lemma|Spelling) particle "([^"]+)"$/, async ({ reader }, kind: string, text: string) => {
  await knowWords(reader.page, [{ kind: kindOf(kind), text }]);
});

// ---------------------------------------------------------------- the Known words page

When("I choose the Known words page's {string} tab", async ({ reader: { page } }, name: string) => {
  const tab = page.getByRole("main").getByRole("tab", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
});

Then("the Known words page lists every particle, most frequent first, each with a Memorized? choice that is off", async ({ reader: { page } }) => {
  const expected = allParticles().map((p) => p.text);
  expect(expected).toHaveLength(352);
  await expect(page.getByRole("main").getByRole("list", { name: "Particles", exact: true })).toBeVisible();
  await expect.poll(() => shownLetters(page)).toEqual(expected);
  const choices = rows(page).getByRole("switch");
  await expect(choices).toHaveCount(352);
  expect(await choices.evaluateAll((els) => els.filter((el) => el.getAttribute("aria-checked") !== "false").length)).toBe(0);
});

// ---------------------------------------------------------------- the green

Then(
  /^the Word cards of Surah (\d+) whose particle is the (Lemma|Spelling) "([^"]+)" are green, and no other Word card is tinted$/,
  async ({ reader }, surah: string, kind: string, text: string) => {
    const known = (location: string) => {
      const particle = particleAt(location);
      return particle?.kind === kindOf(kind) && particle.text === text;
    };
    await expectGreenWhere(reader.page, Number(surah), reader.language, known, `belongs to the ${kind} particle ${text}`);
  },
);
