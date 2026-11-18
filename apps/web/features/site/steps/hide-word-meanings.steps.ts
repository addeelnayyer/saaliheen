// Steps for #256: Hide Word meanings. The switch is found as the Allah
// reference colour switch's steps find theirs (./allah-reference-colour-switch.steps.ts);
// a Word card's meaning is its Word meaning from the QUL sources, never typed,
// and it is shown when a reader can see it.

import { expect, type Locator, type Page } from "@playwright/test";
import { card, sourceWord, sourceWords, STRINGS, type Language } from "../support";
import { Given, Then, When, type Reading } from "./fixtures";
import { drawerSwitch as settingsSwitch } from "./allah-reference-colour-switch.steps";
import { controlAfter, inSettings, settingsPanel } from "./reader";

// ---------------------------------------------------------------- the switch

const hideSwitch = (page: Page) => settingsSwitch(page, STRINGS.hideWordMeanings);
const allahSwitch = (page: Page) => settingsSwitch(page, STRINGS.allahReferenceColour);

When(/^I turn Hide Word meanings (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, async () => {
    const toggle = hideSwitch(reader.page);
    // Turning it on starts from off, and off from on.
    await expect(toggle).toBeChecked({ checked: state === "off" });
    await toggle.click();
    await expect(toggle).toBeChecked({ checked: state === "on" });
  });
});

Then(/^the Hide Word meanings switch is (on|off)$/, async ({ reader }, state: string) => {
  await inSettings(reader.page, () => expect(hideSwitch(reader.page)).toBeChecked({ checked: state === "on" }));
});

Then("the Hide Word meanings switch comes straight after the Known words colour switch", async ({ reader }) => {
  const page = reader.page;
  await inSettings(page, async () => {
    const hide = hideSwitch(page);
    const known = settingsSwitch(page, STRINGS.knownWordsColour);
    await expect(hide).toHaveCount(1);
    await expect(known).toHaveCount(1);
    const after = await controlAfter(page, known);
    expect(after, "the control after the Known words colour switch").toBe(STRINGS.hideWordMeanings);
  });
});

/** The Hide Word meanings switch's note that it applies to Study, by its text. */
const studyNote = (page: Page) => settingsPanel(page).getByText(STRINGS.hideWordMeaningsNote, { exact: true });

Then(/^the Hide Word meanings switch is greyed out, with a note that it applies to Study$/, async ({ reader }) => {
  const page = reader.page;
  await inSettings(page, async () => {
    const toggle = hideSwitch(page);
    await expect(toggle).toBeDisabled();
    await expect(studyNote(page)).toBeVisible();
    // Greyed out: drawn fainter than the Allah reference colour switch beside it.
    const opacity = (l: Locator) => l.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await opacity(toggle)).toBeLessThan(await opacity(allahSwitch(page)));
  });
});

Then(/^the Hide Word meanings switch can be used, with no note$/, async ({ reader }) => {
  const page = reader.page;
  await inSettings(page, async () => {
    await expect(hideSwitch(page)).toBeEnabled();
    await expect(studyNote(page)).toBeHidden();
  });
});

// ---------------------------------------------------------------- Word meanings

/** A Word card's Word meaning: its text in the page's Language (its Arabic and Root tag are lang="ar"). */
const MEANING = ":scope > span:is([lang=ur], [lang=en])";

/** The meaning text of every Word card of Surah `surah` a reader can see, by Word location. */
const shownMeanings = (page: Page, surah: number) =>
  page.evaluate(
    ([locations, selector]) =>
      Object.fromEntries(
        locations.map((location) => {
          const meaning = document.getElementById(location)?.querySelector(selector);
          const shown = meaning && getComputedStyle(meaning).visibility === "visible" && meaning.getBoundingClientRect().height > 0;
          return [location, shown ? meaning.textContent : null];
        }),
      ),
    [sourceWords(surah).map((w) => w.location), MEANING] as const,
  );

/** Expect Surah `surah`'s Word cards to show their `lang` Word meanings exactly where `shown` says. */
async function expectMeanings(page: Page, surah: number, lang: Language, shown: (location: string) => boolean) {
  const expected = Object.fromEntries(sourceWords(surah).map((w) => [w.location, shown(w.location) ? w.meaning[lang] || STRINGS.noMeaning : null]));
  await expect.poll(() => shownMeanings(page, surah)).toEqual(expected);
}

Then("every Word card of Surah {int} shows its {language} Word meaning", ({ reader }, surah: number, lang: Language) =>
  expectMeanings(reader.page, surah, lang, () => true),
);

Then("no Word card of Surah {int} shows its Word meaning", ({ reader }, surah: number) => expectMeanings(reader.page, surah, "en", () => false));

Then(
  /^only the Word cards? at (\S+(?:, \S+)*) of Surah (\d+) shows? (?:its|their) (Urdu|English) Word meanings?$/,
  // The (Urdu|English) group is the {language} parameter type's, so it arrives as "ur" or "en".
  ({ reader }, list: string, n: string, lang: Language) => {
    const shown = new Set(list.split(", "));
    return expectMeanings(reader.page, Number(n), lang, (location) => shown.has(location));
  },
);

// ---------------------------------------------------------------- tapping a Word card
// A tap is recitation.steps.ts's "I tap the Word card at …, away from its Root tag".

When(/^I press (Enter|Space) on the Word card at (\S+)$/, async ({ reader }, key: string, location: string) => {
  const target = card(reader.page, location);
  await target.focus();
  await expect(target).toBeFocused();
  await reader.page.keyboard.press(key);
});

// ---------------------------------------------------------------- where the Word cards are

/** Each Word card's place and size, by Word location. */
type Boxes = Record<string, { x: number; y: number; width: number; height: number }>;
const boxesOf = new WeakMap<Reading, Boxes>();

const boxes = (page: Page, surah: number): Promise<Boxes> =>
  page.evaluate(
    (locations) =>
      Object.fromEntries(
        locations.map((location) => {
          const r = document.getElementById(location)!.getBoundingClientRect();
          return [location, { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }];
        }),
      ),
    sourceWords(surah).map((w) => w.location),
  );

Given("I note where every Word card of Surah {int} is and how big it is", async ({ reader, reading }, surah: number) => {
  boxesOf.set(reading, await boxes(reader.page, surah));
});

Then("every Word card of Surah {int} is where it was and as big as it was", async ({ reader, reading }, surah: number) => {
  const noted = boxesOf.get(reading);
  expect(noted, "the Word cards noted earlier in the scenario").toBeDefined();
  expect(await boxes(reader.page, surah)).toEqual(noted);
});

// ---------------------------------------------------------------- Root tags

/** The text of every Root tag a reader can see on Surah `surah`'s Word cards, by Word location. */
const shownRootTags = (page: Page, surah: number) =>
  page.evaluate(
    (locations) =>
      Object.fromEntries(
        locations.flatMap((location) => {
          const tag = document.getElementById(location)?.querySelector("button[lang=ar]");
          const shown = tag && getComputedStyle(tag).visibility === "visible" && tag.getBoundingClientRect().height > 0;
          return shown ? [[location, tag.textContent]] : [];
        }),
      ),
    sourceWords(surah).map((w) => w.location),
  );

const rootTagsOf = new WeakMap<Reading, { surah: number; tags: Record<string, string | null> }>();

Given("I note every Root tag shown on Surah {int}", async ({ reader, reading }, surah: number) => {
  const tags = await shownRootTags(reader.page, surah);
  expect(Object.keys(tags).length, `Root tags shown on Surah ${surah}`).toBeGreaterThan(0);
  rootTagsOf.set(reading, { surah, tags });
});

Then("every noted Root tag is still shown", async ({ reader, reading }) => {
  const noted = rootTagsOf.get(reading);
  expect(noted, "the Root tags noted earlier in the scenario").toBeDefined();
  expect(await shownRootTags(reader.page, noted!.surah)).toEqual(noted!.tags);
});

// ---------------------------------------------------------------- the first frame

/**
 * Record, for every Word card on the page, whether its Word meaning was shown
 * in the first animation frame in which the card exists (just before the
 * browser paints it). Installed before any of the page's scripts on every load.
 */
const watched = new WeakSet<Page>();
async function watchFirstFrames(page: Page) {
  if (watched.has(page)) return;
  watched.add(page);
  await page.addInitScript((selector) => {
    const w = window as unknown as { __meaningFirstFrames?: Record<string, boolean> };
    const seen: Record<string, boolean> = (w.__meaningFirstFrames = {});
    const look = () => {
      document.querySelectorAll("main section[id] [id]").forEach((card) => {
        if (!/^\d+:\d+:\d+$/.test(card.id) || card.id in seen) return;
        const meaning = card.querySelector(selector);
        if (meaning) seen[card.id] = getComputedStyle(meaning).visibility === "visible";
      });
      if (document.readyState !== "complete") requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, MEANING);
}

When("I reload the page, watching the first frame each Word card is drawn in", async ({ reader }) => {
  await watchFirstFrames(reader.page);
  await reader.page.reload();
});

Then("no Word card of Surah {int} showed its Word meaning in the first frame it was drawn in", async ({ reader }, surah: number) => {
  const page = reader.page;
  await page.waitForLoadState("load");
  const locations = sourceWords(surah).map((w) => w.location);
  const seen = await page.evaluate(() => (window as unknown as { __meaningFirstFrames?: Record<string, boolean> }).__meaningFirstFrames ?? {});
  expect(Object.fromEntries(locations.map((l) => [l, seen[l]]))).toEqual(Object.fromEntries(locations.map((l) => [l, false])));
});

// ---------------------------------------------------------------- leaving the page

// The browser's own Back: "I go back" (theme-opening.steps.ts) runs history.back()
// in the page, which a full navigation back to the Surah page cuts short.
When("I go back in the browser", async ({ reader }) => {
  await reader.page.goBack();
});

// ---------------------------------------------------------------- the Passage editor

Then("every Word card in the Passage editor shows its Word meaning", async ({ reader }) => {
  const page = reader.page;
  await expect(page.locator("main [role=button][id]").first()).toBeVisible();
  const shown = await page.locator("main [role=button][id]").evaluateAll(
    (cards, selector) =>
      cards
      .filter((card) => /^\d+:\d+:\d+$/.test(card.id))
      .map((card) => {
        const meaning = card.querySelector(selector);
        const visible = meaning && getComputedStyle(meaning).visibility === "visible";
        return { location: card.id, lang: meaning?.getAttribute("lang") as Language, text: visible ? meaning.textContent : null };
      }),
    MEANING,
  );
  expect(shown.length, "Word cards in the Passage editor").toBeGreaterThan(0);
  expect(shown).toEqual(shown.map(({ location, lang }) => ({ location, lang, text: sourceWord(location).meaning[lang] })));
});
