// Steps for #17's Settings drawer, Arabic size and Meaning size, as a user
// drives them on the production build: the drawer is opened with the app
// bar's settings button and its controls are found by role and name. Text
// sizes are the browser's computed text sizes of text found by what it says,
// read from the committed sources (../support).

import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { ayahTranslation, card, clickOutside, expectFocusStayedInside, expectNoWordLocation, focusInside, isModal, sourceSurahs, sourceWord, type Language } from "../support";
import { Given, STRINGS, Then, When, precedes, type Reader, type Reading } from "./fixtures";
import {
  bismillah,
  fontSize,
  inSettings,
  openSettings,
  scriptText,
  settingsButton,
  settingsDrawer,
  stepTo,
  stepper,
  translationSwitch,
  type Script,
  type SizeSetting,
} from "./reader";
import { lemmaRows, rootDialog } from "./roots";
import { translationParagraph } from "./flowing.steps";
import { passagesOf } from "./passages";

/** The preview in the open Settings drawer. */
const preview = (page: Page) => settingsDrawer(page).getByRole("region", { name: STRINGS.preview, exact: true });

/** The preview's Word cards, in reading order (Ayah 1:2's Words). */
const previewCards = (page: Page) => preview(page).locator('[lang="ar"] > div');

/** The Word locations of the preview's Words: Ayah 1:2's, in reading order. */
const PREVIEW_WORDS = ["1:2:1", "1:2:2", "1:2:3", "1:2:4"];

/** A preview Word card, found by its place in Ayah 1:2: it shows no Word location to find it by. */
const previewCard = (page: Page, location: string) => {
  const i = PREVIEW_WORDS.indexOf(location);
  if (i < 0) throw new Error(`the preview has no Word at ${location}`);
  return previewCards(page).nth(i);
};

// ---------------------------------------------------------------- the page around the drawer

Then("the page shows no Script, theme or Ayah translation control", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByRole("group", { name: STRINGS.script })).toHaveCount(0);
  await expect(page.getByRole("group", { name: STRINGS.theme })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: STRINGS.translation })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: STRINGS.translation })).toHaveCount(0);
});

// ---------------------------------------------------------------- opening and closing

When("I open the Settings drawer", async ({ reader }) => {
  await openSettings(reader.page);
});

Then("the Settings drawer is open", async ({ reader }) => {
  await expect(settingsDrawer(reader.page)).toBeVisible();
});

Then("the Settings drawer is closed", async ({ reader }) => {
  await expect(settingsDrawer(reader.page)).toHaveCount(0);
});

Then(
  "the Settings drawer is a modal dialog named {string} with a close button named {string}",
  async ({ reader }, name: string, close: string) => {
    const drawer = reader.page.getByRole("dialog", { name, exact: true });
    await expect(drawer).toBeVisible();
    expect(await isModal(drawer), "aria-modal").toBe(true);
    await expect(drawer.getByRole("button", { name: close, exact: true })).toBeVisible();
  },
);

Then("focus is inside the Settings drawer", async ({ reader }) => {
  await expect.poll(() => focusInside(settingsDrawer(reader.page))).toBe(true);
});

// After "I press Tab 20 times" (roots.steps.ts).
Then("focus stayed inside the Settings drawer after every press", async ({ reader, reading }) => {
  await expect(settingsDrawer(reader.page)).toBeVisible();
  expectFocusStayedInside(reading.focusTrail);
});

When(/^I close the Settings drawer with (its close button|Escape|a click outside)$/, async ({ reader }, how: string) => {
  const page = reader.page;
  const drawer = settingsDrawer(page);
  if (how === "Escape") await page.keyboard.press("Escape");
  else if (how === "its close button") await drawer.getByRole("button", { name: STRINGS.close, exact: true }).click();
  else await clickOutside(drawer);
});

Then("the settings button has focus", async ({ reader }) => {
  await expect(settingsButton(reader.page)).toBeFocused();
});

// ---------------------------------------------------------------- layout

Then(/^the Settings drawer is a (side panel|bottom sheet)$/, async ({ reader }, shape: string) => {
  const drawer = settingsDrawer(reader.page);
  // Let it finish sliding in.
  await drawer.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = (await drawer.boundingBox())!;
  const { width, height } = reader.page.viewportSize()!;
  if (shape === "side panel") {
    expect(box.x + box.width, "flush with the right edge").toBeCloseTo(width, 0);
    expect(box.y, "from the top").toBeCloseTo(0, 0);
    expect(box.height, "full height").toBeCloseTo(height, 0);
    expect(box.width, "leaves the page in view").toBeLessThan(width / 2);
  } else {
    expect(box.y + box.height, "flush with the bottom edge").toBeCloseTo(height, 0);
    expect(box.x, "from the left edge").toBeCloseTo(0, 0);
    expect(box.width, "full width").toBeCloseTo(width, 0);
    expect(box.y, "below the top of the screen").toBeGreaterThan(0);
  }
});

Then(
  "the Settings drawer shows, in order, the preview, Arabic size, Meaning size, Reset sizes, the Script, the Ayah translation switch and the theme",
  async ({ reader }) => {
    const page = reader.page;
    const drawer = settingsDrawer(page);
    const parts: [string, Locator][] = [
      ["the preview", preview(page)],
      ["Arabic size", stepper(page, "Arabic size").group],
      ["Meaning size", stepper(page, "Meaning size").group],
      ["Reset sizes", drawer.getByRole("button", { name: STRINGS.resetSizes, exact: true })],
      ["the Script", drawer.getByRole("group", { name: STRINGS.script, exact: true })],
      ["the Ayah translation switch", translationSwitch(page)],
      ["the theme", drawer.getByRole("group", { name: STRINGS.theme, exact: true })],
    ];
    for (const [what, part] of parts) await expect(part, what).toHaveCount(1);
    for (let i = 1; i < parts.length; i++) {
      expect(await precedes(parts[i - 1][1], parts[i][1]), `${parts[i - 1][0]} before ${parts[i][0]}`).toBe(true);
    }
    // The preview stays put while the controls under it scroll.
    const top = (await preview(page).boundingBox())!.y;
    await drawer.getByRole("group", { name: STRINGS.theme, exact: true }).scrollIntoViewIfNeeded();
    expect((await preview(page).boundingBox())!.y, "the preview after scrolling the controls").toBeCloseTo(top, 0);
  },
);

// ---------------------------------------------------------------- sizes

const SETTING = /(Arabic size|Meaning size)/.source;

When(new RegExp(`^I set ${SETTING} to (\\d+)%$`), async ({ reader }, setting: SizeSetting, percent: string) => {
  await inSettings(reader.page, () => stepTo(reader.page, setting, Number(percent)));
});

When("I reset the sizes", async ({ reader }) => {
  await inSettings(reader.page, () =>
    settingsDrawer(reader.page).getByRole("button", { name: STRINGS.resetSizes, exact: true }).click(),
  );
});

Then(/^Arabic size shows (\d+%) and Meaning size shows (\d+%)$/, async ({ reader }, arabic: string, meaning: string) => {
  await inSettings(reader.page, async () => {
    await expect(stepper(reader.page, "Arabic size").value).toHaveText(arabic);
    await expect(stepper(reader.page, "Meaning size").value).toHaveText(meaning);
  });
});

Then(
  new RegExp(`^${SETTING}'s (Smaller|Larger) button is disabled and its (Smaller|Larger) button is not$`),
  async ({ reader }, setting: SizeSetting, disabled: string, enabled: string) => {
    await inSettings(reader.page, async () => {
      const s = stepper(reader.page, setting);
      const button = (name: string) => (name === "Smaller" ? s.smaller : s.larger);
      await expect(button(disabled)).toBeDisabled();
      await expect(button(enabled)).toBeEnabled();
    });
  },
);

Then(
  "the page's root element carries data-arabic-size {string} and data-meaning-size {string}",
  async ({ reader }, arabic: string, meaning: string) => {
    await expect(reader.page.locator("html")).toHaveAttribute("data-arabic-size", arabic);
    await expect(reader.page.locator("html")).toHaveAttribute("data-meaning-size", meaning);
  },
);

/** The script a page shows, from <html>. */
const scriptOf = async (page: Page): Promise<Script> =>
  (await page.locator("html").getAttribute("data-script")) === "indopak" ? "indopak" : "uthmani";

/** A text on the page named as the feature files name it, found by what it says. */
async function namedText({ page, language: lang }: Reader, name: string): Promise<Locator> {
  const script = await scriptOf(page);
  let m: RegExpMatchArray | null;
  if ((m = name.match(/^the Arabic on the (preview's )?Word card at (\d+:\d+:\d+)$/))) {
    const where = m[1] ? previewCard(page, m[2]) : card(page, m[2]);
    return where.getByText(scriptText(m[2], script), { exact: true });
  }
  if ((m = name.match(/^the Word meaning on the (preview's )?Word card at (\d+:\d+:\d+)$/))) {
    const where = m[1] ? previewCard(page, m[2]) : card(page, m[2]);
    return where.getByText(sourceWord(m[2]).meaning[lang], { exact: true });
  }
  if (name === "the Bismillah") return page.getByText(bismillah(script), { exact: true });
  if ((m = name.match(/^the Ayah translation of (\d+:\d+)$/))) return page.getByText(ayahTranslation(m[1], lang), { exact: true });
  if ((m = name.match(/^the Ayah translation paragraph of (\d+):(\d+)–(\d+)$/))) {
    const [s, from, till] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const p = passagesOf(s).find((p) => p.ayah_from === from && p.ayah_till === till);
    if (!p) throw new Error(`no Passage ${m[1]}:${m[2]}–${m[3]} in the Passages file`);
    return translationParagraph(page, p, lang);
  }
  if ((m = name.match(/^the Arabic of the Word at (\d+:\d+:\d+)$/))) return card(page, m[1]).getByText(scriptText(m[1], script), { exact: true });
  if (name === "the preview's Ayah translation") return preview(page).getByText(ayahTranslation("1:2", lang), { exact: true });
  if ((m = name.match(/^the (Lemma|meaning) in Lemma row (\d+) of the Root dialog$/))) {
    const row = lemmaRows(rootDialog(page)).nth(Number(m[2]) - 1);
    return row.locator(`[lang="${m[1] === "Lemma" ? "ar" : lang}"]`);
  }
  if ((m = name.match(/^the Arabic name on the index card of Surah (\d+)$/))) {
    return page.getByText(sourceSurahs()[Number(m[1]) - 1].nameArabic, { exact: true }).first();
  }
  throw new Error(`no text named "${name}"`);
}

async function sizeOf(reader: Reader, name: string) {
  const text = await namedText(reader, name);
  await expect(text, name).toBeVisible();
  return fontSize(text);
}

const noted = (reading: Reading, name: string) => {
  const size = reading.sizes?.[name];
  if (size === undefined) throw new Error(`the size of ${name} was not noted`);
  return size;
};

When("I note the text sizes of:", async ({ reader, reading }, table: DataTable) => {
  reading.sizes ??= {};
  for (const [name] of table.raw()) reading.sizes[name] = await sizeOf(reader, name);
});

Then("these texts are {int}% of their noted size:", async ({ reader, reading }, percent: number, table: DataTable) => {
  for (const [name] of table.raw()) {
    const expected = (noted(reading, name) * percent) / 100;
    await expect.poll(() => sizeOf(reader, name), name).toBeCloseTo(expected, 1);
  }
});

Then("these texts keep their noted size:", async ({ reader, reading }, table: DataTable) => {
  for (const [name] of table.raw()) {
    expect(await sizeOf(reader, name), name).toBeCloseTo(noted(reading, name), 1);
  }
});

Then("no Word card's Arabic overflows its card", async ({ reader }) => {
  const overflowing = await reader.page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[id]")).filter((el) => /^\d+:\d+:\d+$/.test(el.id));
    const out: string[] = [];
    for (const c of cards) {
      const box = c.getBoundingClientRect();
      // Its Arabic, and every other line it shows.
      for (const text of Array.from(c.children as HTMLCollectionOf<HTMLElement>).filter((el) => el.checkVisibility())) {
        const r = text.getBoundingClientRect();
        if (text.scrollWidth > text.clientWidth + 1 || r.left < box.left - 1 || r.right > box.right + 1) {
          out.push(`${c.id}: "${text.textContent}"`);
        }
      }
    }
    return { count: cards.length, out };
  });
  expect(overflowing.count, "Word cards on the page").toBeGreaterThan(0);
  expect(overflowing.out).toEqual([]);
});

// ---------------------------------------------------------------- the preview

Then(
  "the preview shows Ayah 1:2's Word cards in their {script} text with their {language} Word meanings",
  async ({ reader }, script: Script, lang: Language) => {
    const page = reader.page;
    for (const location of PREVIEW_WORDS) {
      const c = previewCard(page, location);
      await expect(c.getByText(scriptText(location, script), { exact: true }), `${location} ${script} text`).toBeVisible();
      await expect(c.getByText(sourceWord(location).meaning[lang], { exact: true }), `${location} ${lang} meaning`).toBeVisible();
    }
    // Only the page's Words are deep-link targets.
    await expect(preview(page).locator("[id]")).toHaveCount(0);
  },
);

Then("no preview Word card shows its Word location, on screen or to a screen reader", async ({ reader }) => {
  await expect(previewCards(reader.page)).toHaveCount(PREVIEW_WORDS.length);
  for (const location of PREVIEW_WORDS) await expectNoWordLocation(previewCard(reader.page, location), location);
});

Then("the preview shows the {language} Ayah translation of 1:2", async ({ reader }, lang: Language) => {
  await expect(preview(reader.page).getByText(ayahTranslation("1:2", lang), { exact: true })).toBeVisible();
});

// ---------------------------------------------------------------- stored sizes

Given(
  "the saved Arabic size and Meaning size were since changed to {string}",
  async ({ reader }, value: string) => {
    // The earlier visit stepped each size up once, to 115%; whatever names the
    // site stores them under, those are the values that read "115".
    const origins = reader.saved?.origins ?? [];
    const stored = origins.flatMap((o) => o.localStorage).filter((e) => e.value === "115");
    expect(stored.length, "stored sizes at 115%").toBe(2);
    for (const entry of stored) entry.value = value;
  },
);
