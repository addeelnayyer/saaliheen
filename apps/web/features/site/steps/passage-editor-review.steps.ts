// Reviewing Passages in the Passage editor (#86): the toolbar with the Ayah
// translation switch (Off · Urdu · English), the Ayah layout switch (Ayah by
// Ayah · Flowing) and the Expand all / Collapse all icon buttons, each
// Passage heading's chevron, and Collapsed Passages.
//
// The toolbar is the page's one element of role toolbar. A Passage is open
// when its Ayahs' Arabic is shown in its region and its chevron is labelled
// "Collapse Passage <range>"; collapsed when none of its Ayahs' Arabic or Ayah
// translations is shown and its chevron is labelled "Expand Passage <range>".
// Arabic, end-of-Ayah markers and Ayah translations come from the sources
// (../support, ./reader), never typed.

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahTranslation, blockStorage, PHONE, type Language } from "../support";
import { ADMIN_EMAIL } from "../admin-settings";
import { testSignIn } from "./admin.steps";
import { Given, Then, When, precedes, type Reading, type ShareLayout } from "./fixtures";
import {
  act,
  choose,
  chosen,
  collapse,
  dropPlaces,
  editorSwitch,
  neonPassage,
  passage,
  passages,
  shownRanges,
  shownText,
  surahOf,
  switchChoice,
  type SwitchName,
} from "./passage-editor.steps";
import { ayahText, type Script } from "./reader";
import { arabicPattern, LAYOUT_NAME, loose, numberPattern, whole } from "./share-page.steps";

const toolbar = (page: Page) => page.getByRole("toolbar");
const SCRIPTS: Script[] = ["uthmani", "indopak"];
const LANGUAGES: Language[] = ["en", "ur"];

/** The Ayahs (`s:a`) of the Passage written `range` (83–88, or 98) in the open Surah. */
function ayahsIn(reading: Reading, range: string): string[] {
  const [from, till = from] = range.split("–").map(Number);
  return Array.from({ length: till - from + 1 }, (_, i) => `${surahOf(reading)}:${from + i}`);
}

/** Tap or click `control` once the page offers it, failing with `what` when it doesn't. */
async function press(reading: Reading, control: Locator, what: string) {
  await expect(control, `${what} is offered`).toBeVisible();
  await act(reading, control);
}

const box = async (l: Locator, what: string) => {
  await expect(l, `${what} is shown`).toBeVisible();
  const b = await l.boundingBox();
  if (!b) throw new Error(`${what} is not laid out`);
  return b;
};

// ------------------------------------------------------------------ the toolbar

Then("the editor's toolbar is above its first Passage", async ({ reader }) => {
  const bar = toolbar(reader.page);
  const first = passages(reader.page).first();
  await expect(bar, "the editor has a toolbar").toBeVisible();
  expect(await precedes(bar, first), "the toolbar comes before the first Passage").toBe(true);
  expect((await box(bar, "the toolbar")).y + (await box(bar, "the toolbar")).height).toBeLessThanOrEqual((await box(first, "the first Passage")).y + 1);
});

Then(
  /^the toolbar's (Ayah translation|Ayah layout) switch offers "([^"]+)", with (.+) chosen$/,
  async ({ reader }, name: SwitchName, list: string, picked: string) => {
    const group = editorSwitch(toolbar(reader.page), name);
    await expect(group, `the toolbar holds the ${name} switch`).toBeVisible();
    const names = list.split(",").map((s) => s.trim());
    await expect(group.getByRole("radio").or(group.getByRole("button")), `${name} offers ${list}`).toHaveCount(names.length);
    for (const choice of names) {
      const control = switchChoice(reader.page, name, choice);
      await expect(control, `${name}: ${choice}`).toBeVisible();
      expect(await chosen(control), `${name}: ${choice} chosen`).toBe(String(choice === picked));
    }
  },
);

Then("the toolbar holds {string}, with a tooltip and no text", async ({ reader }, name: string) => {
  const button = toolbar(reader.page).getByRole("button", { name, exact: true });
  await expect(button, `the toolbar holds "${name}"`).toBeVisible();
  const tooltip = (await button.getAttribute("title")) ?? "";
  const gist = name.split(" ").slice(0, 2).join(" ").toLowerCase();
  expect(tooltip.toLowerCase(), `"${name}"'s tooltip`).toContain(gist);
  const text = await button.evaluate((e) => (e as HTMLElement).innerText.trim());
  expect(text, `"${name}" shows no words, only an icon`).not.toMatch(/[A-Za-z؀-ۿ]/);
});

Then(/^"(Expand all Passages|Collapse all Passages)" is (disabled|enabled)$/, async ({ reader }, name: string, state: string) => {
  const button = toolbar(reader.page).getByRole("button", { name, exact: true });
  if (state === "disabled") await expect(button).toBeDisabled();
  else await expect(button).toBeEnabled();
});

Then("the page has only the toolbar's Ayah translation switch", async ({ reader }) => {
  await expect(editorSwitch(reader.page, "Ayah translation"), "Ayah translation switches on the page").toHaveCount(1);
  await expect(editorSwitch(toolbar(reader.page), "Ayah translation"), "in the toolbar").toHaveCount(1);
});

/** The region of the Passage that holds Ayah `s:a`. */
async function regionHolding(page: Page, reading: Reading, ayah: string) {
  expect(Number(ayah.split(":")[0]), `${ayah} is in the open Surah`).toBe(surahOf(reading));
  const range = (await shownRanges(page)).find((r) => ayahsIn(reading, r).includes(ayah));
  if (!range) throw new Error(`no Passage holds ${ayah}`);
  return passage(page, range);
}

When("I scroll down to Ayah {word}", async ({ reader, reading }, ayah: string) => {
  const region = await regionHolding(reader.page, reading, ayah);
  await region.evaluate((r) => r.scrollIntoView({ block: "end" }));
  await expect.poll(() => reader.page.evaluate(() => window.scrollY), { message: "the page has scrolled" }).toBeGreaterThan(0);
});

Then("the toolbar is at the top of the window", async ({ reader }) => {
  const bar = toolbar(reader.page);
  await expect(bar).toBeInViewport({ ratio: 1 });
  await expect.poll(async () => Math.round((await box(bar, "the toolbar")).y), { message: "the toolbar's top" }).toBeLessThanOrEqual(1);
  expect((await box(bar, "the toolbar")).y, "the toolbar's top").toBeGreaterThanOrEqual(-1);
});

Then("Ayah {word} is scrolled out of sight", async ({ reader, reading }, ayah: string) => {
  const region = await regionHolding(reader.page, reading, ayah);
  await expect(region).not.toBeInViewport();
});

Then("the toolbar's two switches share one row", async ({ reader }) => {
  const bar = toolbar(reader.page);
  const [t, l] = [await box(editorSwitch(bar, "Ayah translation"), "Ayah translation"), await box(editorSwitch(bar, "Ayah layout"), "Ayah layout")];
  expect(t.y < l.y + l.height && l.y < t.y + t.height, `the switches overlap in height (${t.y}–${t.y + t.height}, ${l.y}–${l.y + l.height})`).toBe(true);
});

Then("the toolbar's icon buttons are on the row below, at its end", async ({ reader }) => {
  const bar = toolbar(reader.page);
  const all = await box(bar, "the toolbar");
  const switches = [await box(editorSwitch(bar, "Ayah translation"), "Ayah translation"), await box(editorSwitch(bar, "Ayah layout"), "Ayah layout")];
  const bottom = Math.max(...switches.map((s) => s.y + s.height));
  for (const name of ["Expand all Passages", "Collapse all Passages"]) {
    const b = await box(bar.getByRole("button", { name, exact: true }), name);
    expect(b.y, `"${name}" is below the switches`).toBeGreaterThanOrEqual(bottom - 1);
    expect(b.x + b.width, `"${name}" is at the end of its row`).toBeGreaterThan(all.x + all.width / 2);
  }
});

Then("the toolbar fits the phone's width", async ({ reader }) => {
  const b = await box(toolbar(reader.page), "the toolbar");
  expect(b.x, "the toolbar's left").toBeGreaterThanOrEqual(-0.5);
  expect(b.x + b.width, "the toolbar's right").toBeLessThanOrEqual(PHONE.width + 0.5);
  expect(await reader.page.evaluate(() => document.documentElement.scrollWidth), "the page doesn't scroll sideways").toBeLessThanOrEqual(PHONE.width);
});

// --------------------------------------------------------------- the switches

When("I turn the Ayah translation Off", async ({ reader, reading }) => {
  await choose(reading, reader.page, "Ayah translation", "Off");
});

When("I choose the {layout} Ayah layout", async ({ reader, reading }, layout: ShareLayout) => {
  await choose(reading, reader.page, "Ayah layout", LAYOUT_NAME[layout]);
});

Then(/^the Ayah translation switch shows (Off|Urdu|English) chosen$/, async ({ reader }, name: string) => {
  for (const other of ["Off", "Urdu", "English"]) {
    await expect.poll(() => chosen(switchChoice(reader.page, "Ayah translation", other)), { message: `Ayah translation: ${other}` }).toBe(String(other === name));
  }
});

Then("the Ayah layout switch shows {layout} chosen", async ({ reader }, layout: ShareLayout) => {
  for (const [key, other] of Object.entries(LAYOUT_NAME)) {
    await expect.poll(() => chosen(switchChoice(reader.page, "Ayah layout", other)), { message: `Ayah layout: ${other}` }).toBe(String(key === layout));
  }
});

Given("I am signed in as the Admin in a browser whose storage is unavailable", async ({ reader }) => {
  const context = await reader.newContext();
  await blockStorage(context);
  const page = await context.newPage();
  await testSignIn(page, ADMIN_EMAIL, "GitHub");
  reader.page = page;
});

// ------------------------------------------------------------------ the Ayahs

/** Ayah `ayah` shows its Arabic in one of `scripts` and neither Ayah translation. */
async function onlyArabic(page: Page, reading: Reading, ayah: string, scripts: Script[]) {
  expect(Number(ayah.split(":")[0]), `${ayah} is in the open Surah`).toBe(surahOf(reading));
  const texts = scripts.map((s) => collapse(ayahText(ayah, s)));
  await expect
    .poll(async () => {
      const shown = await shownText(page);
      return texts.some((t) => shown.includes(t));
    }, { message: `${ayah}'s Arabic is shown` })
    .toBe(true);
  const shown = await shownText(page);
  for (const lang of LANGUAGES) {
    expect(shown.includes(collapse(ayahTranslation(ayah, lang))), `${ayah}'s ${lang} Ayah translation is not shown`).toBe(false);
  }
}

// {script} and {language} are parameter types: their transformers turn "Indo-Pak" into "indopak" and "Urdu" into "ur".
Then("Ayah {word} shows its {script} text and no Ayah translation", async ({ reader, reading }, ayah: string, script: Script) => {
  await onlyArabic(reader.page, reading, ayah, [script]);
});

Then("Ayah {word} shows its Arabic and no Ayah translation", async ({ reader, reading }, ayah: string) => {
  await onlyArabic(reader.page, reading, ayah, SCRIPTS);
});

/** A Passage's Ayahs' Arabic running together in `script`, each with its end-of-Ayah marker, as one element's whole text. */
const flowingArabic = (region: Locator, ayahs: string[], script: Script) =>
  region.getByText(whole(ayahs.map((a) => arabicPattern(a, script)).join("\\s+"))).first();

/** A Passage's Ayah translations as one paragraph, each after its Ayah's number. */
const flowingTranslation = (region: Locator, ayahs: string[], lang: Language) =>
  region.getByText(whole(ayahs.map((a) => `${numberPattern(Number(a.split(":")[1]))}\\s*${loose(ayahTranslation(a, lang))}`).join("\\s+"))).first();

/** Passage `range` shows its Ayahs Flowing in one of `scripts`, then its Ayah translations in `lang` as one paragraph, or none when `lang` is null. */
async function shownFlowing(page: Page, reading: Reading, range: string, scripts: Script[], lang: Language | null) {
  const region = passage(page, range);
  const ayahs = ayahsIn(reading, range);
  const arabic = scripts.map((s) => flowingArabic(region, ayahs, s)).reduce((a, b) => a.or(b));
  await expect(arabic, `${range}'s Arabic runs together, each Ayah ending with its end-of-Ayah marker`).toBeVisible();
  if (!lang) {
    const text = collapse(await region.innerText());
    for (const ayah of ayahs)
      for (const l of LANGUAGES) expect(text.includes(collapse(ayahTranslation(ayah, l))), `${ayah}'s ${l} Ayah translation is not shown`).toBe(false);
    return;
  }
  const paragraph = flowingTranslation(region, ayahs, lang);
  await expect(paragraph, `${range}'s ${lang} Ayah translations as one paragraph, each after its Ayah's number`).toBeVisible();
  expect(await precedes(arabic.first(), paragraph), "the Arabic before the translation paragraph").toBe(true);
  for (const ayah of ayahs) {
    const number = paragraph.getByText(whole(numberPattern(Number(ayah.split(":")[1])))).first();
    await expect(number, `Ayah ${ayah}'s number is marked in the paragraph`).toBeVisible();
    const look = await number.evaluate((el, p) => {
      const s = getComputedStyle(el);
      return {
        raised: el.tagName === "SUP" || s.verticalAlign === "super" || s.verticalAlign === "top" || s.verticalAlign === "text-top",
        smaller: parseFloat(s.fontSize) < parseFloat(getComputedStyle(p as Element).fontSize),
      };
    }, await paragraph.elementHandle());
    expect(look, `Ayah ${ayah}'s number is a small superscript, as on the Share page`).toEqual({ raised: true, smaller: true });
  }
}

const NUMBERED = "Ayah translations as one paragraph with each Ayah's number marked";

Then(`{word} shows its Ayahs Flowing in {script}, then its {language} ${NUMBERED}`, async ({ reader, reading }, range: string, script: Script, lang: Language) => {
  await shownFlowing(reader.page, reading, range, [script], lang);
});

Then(`{word} shows its Ayahs Flowing, then its {language} ${NUMBERED}`, async ({ reader, reading }, range: string, lang: Language) => {
  await shownFlowing(reader.page, reading, range, SCRIPTS, lang);
});

Then("{word} shows its Ayahs Flowing in {script}, with no Ayah translation", async ({ reader, reading }, range: string, script: Script) => {
  await shownFlowing(reader.page, reading, range, [script], null);
});

Then("no ✂︎ New Passage control is offered", async ({ reader }) => {
  await expect(passages(reader.page).first()).toBeVisible();
  await expect(reader.page.getByRole("button", { name: /New Passage from Ayah \d+$/ })).toHaveCount(0);
});

Then("no Passage heading is draggable", async ({ reader }) => {
  await expect(passages(reader.page).first()).toBeVisible();
  const draggable = await passages(reader.page).evaluateAll((regions) =>
    regions.filter((r) => r.querySelector('[draggable="true"]')).map((r) => r.getAttribute("aria-label")),
  );
  expect(draggable, "Passages with a draggable heading").toEqual([]);
});

Then("no drop place is shown", async ({ reader }) => {
  // A drag shows its drop places once it has begun (a moment after it starts); give it that moment.
  await reader.page.waitForTimeout(400);
  expect(await dropPlaces(reader.page), "drop places shown").toEqual([]);
});

When("I let go of it where it can't be dropped", async ({ reader }) => {
  await reader.page.mouse.move(4, 4, { steps: 8 });
  await reader.page.mouse.up();
});

// ------------------------------------------------------------ Collapsed Passages

const chevron = (region: Locator, state: "Collapse" | "Expand", range: string) =>
  region.getByRole("button", { name: `${state} Passage ${range}`, exact: true });
const GLYPH = { Collapse: "▾", Expand: "▸" } as const;

/** "open", "collapsed", or what is wrong, from what Passage `range` shows. */
async function stateOf(page: Page, reading: Reading, range: string): Promise<string> {
  const region = passage(page, range);
  if (!(await region.isVisible())) return `Passage ${range} is not shown`;
  const [collapseCount, expandCount] = [await chevron(region, "Collapse", range).count(), await chevron(region, "Expand", range).count()];
  const text = collapse(await region.innerText());
  const ayahs = ayahsIn(reading, range);
  const arabicShown = ayahs.filter((a) => SCRIPTS.some((s) => text.includes(collapse(ayahText(a, s)))));
  const translationsShown = ayahs.filter((a) => LANGUAGES.some((l) => text.includes(collapse(ayahTranslation(a, l)))));
  if (collapseCount === 1 && expandCount === 0 && arabicShown.length > 0) return "open";
  if (expandCount === 1 && collapseCount === 0 && arabicShown.length === 0 && translationsShown.length === 0) return "collapsed";
  return `Passage ${range}: chevrons "Collapse" ×${collapseCount}, "Expand" ×${expandCount}; Arabic shown for [${arabicShown}]; Ayah translations shown for [${translationsShown}]`;
}

const expectState = (page: Page, reading: Reading, range: string, state: string) =>
  expect.poll(() => stateOf(page, reading, range), { message: `Passage ${range} is ${state}` }).toBe(state);

Then(/^Passage (\S+) is (collapsed|open)$/, async ({ reader, reading }, range: string, state: string) => {
  await expectState(reader.page, reading, range, state);
});

Then(/^every Passage is (collapsed|open)$/, async ({ reader, reading }, state: string) => {
  const ranges = await shownRanges(reader.page);
  expect(ranges.length, "the editor shows Passages").toBeGreaterThan(0);
  for (const range of ranges) await expectState(reader.page, reading, range, state);
});

Then(/^every Passage but (\S+) is (collapsed|open)$/, async ({ reader, reading }, but: string, state: string) => {
  const ranges = await shownRanges(reader.page);
  expect(ranges, `the editor shows ${but}`).toContain(but);
  for (const range of ranges) await expectState(reader.page, reading, range, range === but ? (state === "open" ? "collapsed" : "open") : state);
});

Then("every Passage heading starts with a chevron labelled {string}", async ({ reader }, pattern: string) => {
  const ranges = await shownRanges(reader.page);
  expect(ranges.length).toBeGreaterThan(0);
  for (const range of ranges) {
    const name = pattern.replace("<range>", range);
    const heading = passage(reader.page, range).getByRole("heading").first();
    const button = heading.getByRole("button", { name, exact: true });
    await expect(button, `${range}'s Passage heading holds "${name}"`).toBeVisible();
    await expect(button, `"${name}" shows its chevron`).toContainText(GLYPH[name.startsWith("Expand") ? "Expand" : "Collapse"]);
    const title = heading.getByRole("button", { name: `Edit the Passage titles of ${range}`, exact: true });
    expect(await precedes(button, title), `${range}'s chevron comes before its title`).toBe(true);
    expect((await box(button, name)).x, `${range}'s chevron is left of its title`).toBeLessThan((await box(title, `${range}'s title`)).x);
  }
});

Then(/^its chevron is labelled "((?:Collapse|Expand) Passage \S+)"$/, async ({ reader }, name: string) => {
  const [state, , range] = name.split(" ") as ["Collapse" | "Expand", string, string];
  const button = chevron(passage(reader.page, range), state, range);
  await expect(button, `"${name}"`).toBeVisible();
  await expect(button, `"${name}" shows ${GLYPH[state]}`).toContainText(GLYPH[state]);
});

When(/^I (collapse|expand) Passage (\S+)$/, async ({ reader, reading }, way: string, range: string) => {
  const state = way === "collapse" ? "Collapse" : "Expand";
  await press(reading, chevron(passage(reader.page, range), state, range), `"${state} Passage ${range}"`);
});

When(/^I make Passage (\S+) (collapsed|open)$/, async ({ reader, reading }, range: string, state: string) => {
  if (state === "collapsed") await press(reading, chevron(passage(reader.page, range), "Collapse", range), `"Collapse Passage ${range}"`);
  await expectState(reader.page, reading, range, state);
});

When(/^I (collapse|expand) all Passages$/, async ({ reader, reading }, way: string) => {
  const name = way === "collapse" ? "Collapse all Passages" : "Expand all Passages";
  await press(reading, toolbar(reader.page).getByRole("button", { name, exact: true }), `the toolbar's "${name}"`);
});

When("I collapse every Passage by its chevron", async ({ reader, reading }) => {
  for (const range of await shownRanges(reader.page)) await press(reading, chevron(passage(reader.page, range), "Collapse", range), `"Collapse Passage ${range}"`);
});

Then("{word} shows its Passage titles", async ({ reader, reading }, range: string) => {
  const from = neonPassage(reading, range);
  const title = passage(reader.page, range).getByRole("button", { name: `Edit the Passage titles of ${range}`, exact: true });
  await expect(title).toBeVisible();
  await expect(title).toContainText(from.title_en);
  await expect(title).toContainText(from.title_ur);
});

Then("{word} offers no ✂︎", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  await expect(region).toBeVisible();
  await expect(region.getByRole("button", { name: /New Passage from Ayah \d+$/ })).toHaveCount(0);
});

Then("{word} offers Join with above, and ↑ and ↓", async ({ reader }, range: string) => {
  const region = passage(reader.page, range);
  for (const name of ["Join with above", "Start one Ayah earlier", "Start one Ayah later"]) {
    await expect(region.getByRole("button", { name, exact: true }), `${range} offers ${name}`).toBeVisible();
  }
});
