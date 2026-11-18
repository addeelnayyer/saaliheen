// The Share page's edit strip (#56), as a sharer and a visitor see it. The
// strip is a group named "Choose Ayahs to share": lists named "Surah", "From
// Ayah" and "To Ayah", and "Share layout" buttons. It shows only to someone who
// arrived from inside the app; the address a sharer sends (the page's path, on
// the production site) never shows it. Allowed Shared Ayahs are worked out here
// from the committed Surah metadata and the Passages file, never typed.

import { expect, type Locator, type Page } from "@playwright/test";
import { ayahTranslation, sourceSurahs, type Language } from "../support";
import { Then, When, type Reading, type SharedAyahs, type ShareLayout } from "./fixtures";
import { filePassages } from "./passages";
import type { Script } from "./reader";
import { noteSharePage, openedIn, shareAddress, type Address } from "./share-page.steps";

// ---------------------------------------------------------------- the strip and its controls

export const EDIT_STRIP = "Choose Ayahs to share";

/** The edit strip: a group (or form, or toolbar) named "Choose Ayahs to share". */
export const editStrip = (page: Page) =>
  page
    .getByRole("group", { name: EDIT_STRIP, exact: true })
    .or(page.getByRole("form", { name: EDIT_STRIP, exact: true }))
    .or(page.getByRole("toolbar", { name: EDIT_STRIP, exact: true }));

type ListName = "Surah" | "From Ayah" | "To Ayah";
const list = (page: Page, name: ListName) => editStrip(page).getByRole("combobox", { name, exact: true });

const LAYOUT_NAME: Record<ShareLayout, string> = { "ayah-by-ayah": "Ayah by Ayah", flowing: "Flowing" };

/** The strip's own Share layout choice: a button or a radio named for the layout, inside a "Share layout" group. */
const layoutChoice = (page: Page, layout: ShareLayout) => {
  const group = editStrip(page)
    .getByRole("group", { name: "Share layout", exact: true })
    .or(editStrip(page).getByRole("radiogroup", { name: "Share layout", exact: true }));
  return group
    .getByRole("button", { name: LAYOUT_NAME[layout], exact: true })
    .or(group.getByRole("radio", { name: LAYOUT_NAME[layout], exact: true }));
};

const isChosen = (l: Locator) =>
  l.evaluate((el) => el.getAttribute("aria-pressed") === "true" || el.getAttribute("aria-checked") === "true" || (el as HTMLInputElement).checked === true);

/** A list's choices a person can pick (enabled, not hidden), as their labels. */
const choices = (l: Locator) =>
  l.evaluate((el) =>
    Array.from((el as HTMLSelectElement).options)
      .filter((o) => !o.disabled && !o.hidden)
      .map((o) => (o.label || o.textContent || "").trim()),
  );

/** The leading number of a choice's label: "255" → 255, "112. Al-Ikhlas" → 112. */
const leadingNumber = (label: string) => Number(label.match(/^\D*?(\d+)/)?.[1] ?? NaN);

/** The number a list shows chosen. */
const chosenNumber = async (l: Locator) =>
  leadingNumber(await l.evaluate((el) => ((el as HTMLSelectElement).selectedOptions[0]?.label ?? "").trim()));

/** Choose, in a list, the choice whose label starts with `n`. */
async function chooseNumber(page: Page, name: ListName, n: number) {
  const l = list(page, name);
  await expect(l, `the edit strip's "${name}" list`).toBeVisible();
  const label = (await choices(l)).find((c) => leadingNumber(c) === n);
  expect(label, `"${name}" offers ${n}`).toBeDefined();
  await l.selectOption({ label: label! });
}

/** What the strip shows chosen now. */
async function stripShows(page: Page): Promise<SharedAyahs> {
  return { surah: await chosenNumber(list(page, "Surah")), from: await chosenNumber(list(page, "From Ayah")), to: await chosenNumber(list(page, "To Ayah")) };
}

// ---------------------------------------------------------------- allowed Shared Ayahs, from the sources

const MAX_SHARED_AYAHS = 10;

/** The to Ayahs allowed from Ayah `from` of `surah`: up to 10 Ayahs within the Surah, and the end of any Passage beginning there. */
function allowedTo(surah: number, from: number): number[] {
  const last = sourceSurahs()[surah - 1].ayahCount;
  const run = Array.from({ length: Math.min(MAX_SHARED_AYAHS, last - from + 1) }, (_, k) => from + k);
  const passages = filePassages()
    .filter((p) => p.surah_no === surah && p.ayah_from === from && p.ayah_till > from + MAX_SHARED_AYAHS - 1)
    .map((p) => p.ayah_till);
  return [...run, ...passages].sort((a, b) => a - b);
}

const isAllowed = ({ surah, from, to }: SharedAyahs) =>
  surah >= 1 && surah <= 114 && from >= 1 && allowedTo(surah, from).includes(to);

/** "255 to 264", or "24 to 33, and 36", as a list of Ayah numbers. */
function parseChoices(text: string): number[] {
  const [run, ...extra] = text.split(/,\s*and\s*|,\s*/);
  const [a, b] = run.split(/\s+to\s+/).map(Number);
  return [...Array.from({ length: b - a + 1 }, (_, k) => a + k), ...extra.map(Number)];
}

// ---------------------------------------------------------------- where the browser is

/** The address of the page on screen, without anything after its path. */
const pathOf = (page: Page) => new URL(page.url()).pathname;

/** The paths that are the Share page of `address`: a run Ayah by Ayah may name its layout or not. */
function pathsOf(address: Address): string[] {
  const bare = shareAddress({ ...address, layout: undefined });
  if (address.from === address.to) return [bare];
  if (address.layout === "flowing") return [`${bare}/flowing`];
  return [bare, `${bare}/ayah-by-ayah`];
}

async function expectOn(reader: { page: Page }, reading: Reading, address: Address) {
  const { page } = reader;
  const paths = pathsOf(address);
  await expect.poll(() => pathOf(page), `the address is the Share page of ${paths[0]}`).toMatch(new RegExp(`^(${paths.join("|")})$`));
  noteSharePage(reading, address);
  await expect(editStrip(page), "the edit strip").toBeVisible();
}

Then(
  "I am on the Share page of {ayahs} in {language} and {script}, with the edit strip",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language, script: Script) => expectOn(reader, reading, { ...shared, lang, script }),
);

Then(
  "I am on the Share page of {ayahs} in {language} and {script}, {layout}, with the edit strip",
  async ({ reader, reading }, shared: SharedAyahs, lang: Language, script: Script, layout: ShareLayout) =>
    expectOn(reader, reading, { ...shared, lang, script, layout }),
);

// ---------------------------------------------------------------- what the strip shows and offers

Then("the edit strip shows Surah {int}, from Ayah {int} to Ayah {int}", async ({ reader }, surah: number, from: number, to: number) => {
  await expect.poll(() => stripShows(reader.page), "the edit strip's Surah, From Ayah and To Ayah").toEqual({ surah, from, to });
});

Then("the edit strip shows {layout} chosen", async ({ reader }, layout: ShareLayout) => {
  const other: ShareLayout = layout === "flowing" ? "ayah-by-ayah" : "flowing";
  await expect.poll(() => isChosen(layoutChoice(reader.page, layout)), `${LAYOUT_NAME[layout]} chosen in the edit strip`).toBe(true);
  expect(await isChosen(layoutChoice(reader.page, other)), `${LAYOUT_NAME[other]} not chosen`).toBe(false);
});

Then("the edit strip offers each of the 114 Surahs in order", async ({ reader }) => {
  const offered = (await choices(list(reader.page, "Surah"))).map(leadingNumber);
  expect(offered).toEqual(sourceSurahs().map((s) => s.number));
});

Then("the edit strip offers to Ayahs {string} and no others", async ({ reader }, text: string) => {
  const { page } = reader;
  const { surah, from } = await stripShows(page);
  const expected = parseChoices(text);
  expect(expected, `"${text}" is what the Surah metadata and the Passages file allow from ${surah}:${from}`).toEqual(allowedTo(surah, from));
  await expect.poll(async () => (await choices(list(page, "To Ayah"))).map(leadingNumber), "the To Ayah choices").toEqual(expected);
});

// ---------------------------------------------------------------- choosing

When("in the edit strip I choose Surah {int}", async ({ reader }, surah: number) => chooseNumber(reader.page, "Surah", surah));
When("in the edit strip I choose from Ayah {int}", async ({ reader }, ayah: number) => chooseNumber(reader.page, "From Ayah", ayah));
When("in the edit strip I choose to Ayah {int}", async ({ reader }, ayah: number) => chooseNumber(reader.page, "To Ayah", ayah));

When("in the edit strip I choose the {layout} Share layout", async ({ reader }, layout: ShareLayout) => {
  const choice = layoutChoice(reader.page, layout);
  await choice.click();
  await expect.poll(() => isChosen(choice), `${LAYOUT_NAME[layout]} chosen`).toBe(true);
});

/** The strip, the address and the page all name the same allowed Shared Ayahs of `surah` (from Ayah `from`, when given). */
async function expectAgreement(page: Page, reading: Reading, surah: number, from?: number) {
  const { lang, script } = openedIn(reading);
  // The strip settles once the address has followed it.
  await expect
    .poll(async () => {
      const shown = await stripShows(page);
      return pathsOf({ ...shown, lang, script }).includes(pathOf(page)) || pathOf(page) === `${shareAddress({ ...shown, lang, script })}/flowing`;
    }, "the address names what the edit strip shows")
    .toBe(true);
  const shown = await stripShows(page);
  expect(shown.surah, "the Surah").toBe(surah);
  if (from !== undefined) expect(shown.from, "the from Ayah").toBe(from);
  expect(isAllowed(shown), `${shown.surah}:${shown.from}–${shown.to} are allowed Shared Ayahs`).toBe(true);
  noteSharePage(reading, { ...shown, lang, script });
  for (const a of [shown.from, shown.to]) {
    await expect(page.getByText(ayahTranslation(`${surah}:${a}`, lang), { exact: false }).first(), `Ayah ${surah}:${a}'s translation shown`).toBeVisible();
  }
}

Then("the edit strip, the address and the page agree on allowed Shared Ayahs of Surah {int}", async ({ reader, reading }, surah: number) =>
  expectAgreement(reader.page, reading, surah),
);

Then(
  "the edit strip, the address and the page agree on allowed Shared Ayahs of Surah {int}, from Ayah {int}",
  async ({ reader, reading }, surah: number, from: number) => expectAgreement(reader.page, reading, surah, from),
);

// ---------------------------------------------------------------- the address a sharer sends

/** The address Share sends, as a path: the page's path, nothing after it (#53: on https://saaliheen.com). */
const sentPath = (page: Page) => pathOf(page);

When("a visitor opens this Share page's address in a fresh browser", async ({ reader, reading }) => {
  const path = sentPath(reader.page);
  const o = openedIn(reading);
  reader.saved = undefined;
  await reader.openFresh(path);
  noteSharePage(reading, o);
});

When("I open this Share page's address again", async ({ reader, reading }) => {
  const path = sentPath(reader.page);
  const o = openedIn(reading);
  const status = (await reader.page.goto(path))?.status();
  noteSharePage(reading, o);
  reading.status = status;
});

/**
 * No edit strip, once the page's scripts have run: the strip is the app's
 * doing, so it is looked for again after the page has gone quiet.
 */
Then("there is no edit strip", async ({ reader }) => {
  const { page } = reader;
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < 3; i++) {
    await expect(editStrip(page), "the edit strip").toHaveCount(0);
    for (const name of ["Surah", "From Ayah", "To Ayah"] as const) {
      await expect(page.getByRole("combobox", { name, exact: true }), `a "${name}" list`).toHaveCount(0);
    }
    await page.waitForTimeout(300);
  }
});

Then("the Share page as served holds no edit strip", async ({ reader, reading }) => {
  const { path } = openedIn(reading);
  const res = await reader.page.request.get(path);
  expect(res.status(), `${path} answers`).toBe(200);
  // The strip's lists are what a reader without scripts would see of it.
  expect(await res.text(), "the served page holds a list to choose from").not.toMatch(/<select\b/i);
});
