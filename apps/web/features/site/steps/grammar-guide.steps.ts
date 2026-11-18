// #280: the Grammar guide. Its labels are its <dt>s, each "English · Arabic",
// with what it means in the <dd> after it; the expected labels are the
// grammar terms module's (@saaliheen/dataset/grammar), which the Grammar line
// and the Word grammar dialog name too, and the Part of speech colours are the
// tokens, resolved in the browser. Its text is held to 4.5:1 against whatever
// it is drawn on, found by walking up to the first painted background.

import { expect, type Page } from "@playwright/test";
import { ASPECTS, CASES, HARF_KINDS, ISM_KINDS, PARTS_OF_SPEECH, VERB_FORMS, verbFormTerm, type PartOfSpeech, type Term, type VerbForm } from "@saaliheen/dataset/grammar";
import { STRINGS, type Language } from "../support";
import { escape, exploreCard } from "./explore-and-me.steps";
import { resolveColor, Then, When } from "./fixtures";
import { fetchPage, type App } from "./link-preview.steps";
import { contrast } from "./phrase-colours.steps";

const guidePath = (lang: Language) => `/${lang}/grammar/guide`;
const labelOf = ({ en, ar }: Term) => `${en} · ${ar}`;
const verbForms = () => (Object.keys(VERB_FORMS) as unknown as VerbForm[]).map(verbFormTerm);

/** Each Part of speech's colour token. */
const TOKENS: Record<PartOfSpeech, string> = { N: "var(--grammar-ism)", V: "var(--grammar-fil)", P: "var(--grammar-harf)" };

const label = (page: Page, text: string) => page.getByRole("main").locator("dt").filter({ hasText: new RegExp(`^\\s*${escape(text)}\\s*$`) });

/** Every label on the guide, with what it means: the <dd> after it. */
const entries = (page: Page) =>
  page
    .getByRole("main")
    .locator("dt")
    .evaluateAll((dts) => dts.map((dt) => ({ label: (dt.textContent ?? "").trim(), meaning: (dt.nextElementSibling?.textContent ?? "").trim() })));

When("I open the Grammar guide in {language}", async ({ reader, reading }, lang: Language) => {
  reading.status = (await reader.page.goto(guidePath(lang)))?.status();
  reading.lang = lang;
  reading.surah = undefined;
});

Then(
  "the Grammar guide shows {string}, {string} and {string}, each drawn in its own Part of speech colour",
  async ({ page }, ism: string, fil: string, harf: string) => {
    const colours = new Set<string>();
    for (const text of [ism, fil, harf]) {
      const code = (Object.keys(PARTS_OF_SPEECH) as PartOfSpeech[]).find((c) => labelOf(PARTS_OF_SPEECH[c]) === text);
      expect(code, `a Part of speech: ${text}`).toBeDefined();
      const colour = await resolveColor(page, TOKENS[code!]);
      const shown = label(page, text);
      await expect(shown, text).toHaveCount(1);
      await expect(shown).toHaveCSS("color", colour);
      colours.add(colour);
    }
    expect(colours.size).toBe(3);
  },
);

Then("the Grammar guide shows the three Cases {string}, {string} and {string}", async ({ page }, nom: string, acc: string, gen: string) => {
  const cases = [nom, acc, gen];
  expect(cases).toEqual(Object.values(CASES).map(labelOf));
  const shown = (await entries(page)).map((e) => e.label);
  expect(shown.filter((l) => cases.includes(l)), "each once, in order").toEqual(cases);
});

Then("the Grammar guide shows every Verb form from Form I to Form XII, each with its pattern", async ({ page }) => {
  const shown = (await entries(page)).map((e) => e.label);
  for (const form of verbForms()) expect(shown, form.en).toContain(labelOf(form));
});

Then("the Grammar guide shows every label a Grammar line can show, each in English with its Arabic term and what it means", async ({ page }) => {
  // A Grammar line gives an Ism's Case or kind, a Fi'l's Aspect and Verb form, a Harf's kind, or the Part of speech alone.
  const expected = [PARTS_OF_SPEECH, CASES, ASPECTS, ISM_KINDS, HARF_KINDS].flatMap((terms) => Object.values(terms).map(labelOf)).concat(verbForms().map(labelOf));
  const shown = new Map((await entries(page)).map((e) => [e.label, e.meaning]));
  for (const text of expected) {
    expect(shown.has(text), `the guide shows "${text}"`).toBe(true);
    expect(shown.get(text), `what "${text}" means`).not.toBe("");
  }
});

Then("the Grammar guide is written in English", async ({ page }) => {
  // Every piece of text is English, but for the Arabic terms and patterns.
  const langs = await page
    .getByRole("main")
    .evaluate((main) => {
      const out = new Set<string>();
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!(n.textContent ?? "").trim()) continue;
        out.add(n.parentElement?.closest("[lang]")?.getAttribute("lang") ?? "");
      }
      return [...out].sort();
    });
  expect(langs).toEqual(["ar", "en"]);
});

When("I follow the Grammar page's link to the Grammar guide", async ({ page }) => {
  await page.locator("body").locator("a[href]:not(nav a)").getByText(STRINGS.grammarGuide, { exact: true }).click();
});

When("I follow the link to the Grammar guide in Explore's {string} entry", async ({ page }, name: string) => {
  // The list item holding the card, found from the card itself.
  const entry = exploreCard(page, name).locator("xpath=ancestor::li[1]");
  await entry.getByRole("link", { name: STRINGS.grammarGuide }).click();
});

Then("every piece of the Grammar guide's text keeps 4.5:1 on what it is drawn on", async ({ page }) => {
  const pairs = await page.getByRole("main").evaluate((main) => {
    const painted = (el: Element | null): string => {
      for (let e = el; e; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const out = new Map<string, { text: string; ink: string; paper: string }>();
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      if (!(n.textContent ?? "").trim() || !el.checkVisibility()) continue;
      const ink = getComputedStyle(el).color;
      const paper = painted(el);
      out.set(`${ink} on ${paper}`, { text: n.textContent!.trim().slice(0, 40), ink, paper });
    }
    return [...out.values()];
  });
  expect(pairs.length).toBeGreaterThan(1);
  for (const { text, ink, paper } of pairs) expect(contrast(ink, paper), `"${text}": ${ink} on ${paper}`).toBeGreaterThanOrEqual(4.5);
});

When("{app} fetches the Grammar guide in {language}", async ({ reader, reading }, app: App, lang: Language) => {
  await fetchPage(reader.page.request, reading, app, guidePath(lang));
});
