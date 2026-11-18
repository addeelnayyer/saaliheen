// Steps for the Supplication editor (#201, #202). The Supplications are read from
// the run's own Postgres each time a step needs them, never from a cache kept
// across steps, because these scenarios save them. Runs, Speakers and Surah
// names come from the feature (the curated file's); things are found by role,
// label and visible text. Signing in, opening a page, Save, "Saved", an
// alert and the run's fields are the admin area's and the Iltifat editor's
// steps (./admin.steps.ts, ./iltifat-editor.steps.ts); the Opening chips are
// the Supplications page's (./supplications-filters.steps.ts).
//
// The editor's shape these steps expect:
// - /admin/supplications: an <h1> "Supplications"; the Supplications page's
//   filters; each entry an <article> whose <h2> is a link to
//   /admin/supplications/{id} naming its Surah and run.
// - /admin/supplications/{id}: an <h1> naming its kind, Surah and run; its
//   Ayahs, each an element with `data-ayah` (`s:a`) holding its Word cards
//   (since #271), each the element whose id is its Word location and holding
//   its Arabic (lang="ar"), and its Ayah translation (a <p>); a choice
//   "Speaker", checkboxes "Rabbana", "Rabbi" and "Other", a choice "Kind",
//   number fields "First Ayah" and "Last Ayah" and a button "Save"; after a
//   save made against an older version, a section "The latest save" listing
//   its Openings and, since #271, its spans; and, since #202, a button
//   "Delete", then "Delete for good".
// - /admin/supplications/new: the same fields after a choice "Surah", and a
//   button "Add".
// - /admin/supplications/speakers: each Speaker a form named with their
//   English name, holding text fields "English name" and "Urdu name", a
//   button "Save" and a status saying "Saved".

import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { testDatabase } from "../test-database";
import { openingsIn, parseRun } from "../supplications-data";
import { Then, When, type Reading } from "./fixtures";
import { cardAt, listOf } from "./marked-words.steps";

// ---------------------------------------------------------------- the Supplications, read fresh

interface Row {
  id: number;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  openings: string[];
  kind: string;
  version: number;
}

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

async function rowAt(run: string): Promise<Row> {
  const { surah, ayahFrom, ayahTo } = parseRun(run);
  const { rows } = await database().query(
    `select id, surah, ayah_from as "ayahFrom", ayah_to as "ayahTo", speaker_id as "speakerId", openings::text[] as openings, kind, version
       from supplication where surah = $1 and ayah_from = $2 and ayah_to = $3`,
    [surah, ayahFrom, ayahTo],
  );
  expect(rows.length, `one Supplication at ${run} in the database`).toBe(1);
  return { ...rows[0], id: Number(rows[0].id) };
}

// ---------------------------------------------------------------- what a scenario remembers

interface EditorState {
  /** The Supplications as they were when their editor was first opened, by run. */
  opened: Map<string, Row>;
  /** The two tabs of a two-tab scenario. */
  tabs: Page[];
}
const states = new WeakMap<Reading, EditorState>();
const stateOf = (reading: Reading) => {
  let s = states.get(reading);
  if (!s) states.set(reading, (s = { opened: new Map(), tabs: [] }));
  return s;
};
const tab = (reading: Reading, which: string) => stateOf(reading).tabs[which === "first" ? 0 : 1];

// ---------------------------------------------------------------- the editor's parts

const opening = (page: Page, name: string) => page.getByRole("checkbox", { name, exact: true });
const OPENING_NAMES = ["Rabbana", "Rabbi", "Other"];
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

async function expectOpenings(page: Page, written: string) {
  for (const name of OPENING_NAMES) {
    const box = opening(page, name);
    if (openingsIn(written).includes(name)) await expect(box, `the Opening "${name}"`).toBeChecked();
    else await expect(box, `the Opening "${name}"`).not.toBeChecked();
  }
}

// ---------------------------------------------------------------- Admins only

Then("the page shows no Supplication editor", async ({ reader }) => {
  await expect(reader.page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(reader.page.getByRole("combobox", { name: "Speaker", exact: true })).toHaveCount(0);
  await expect(reader.page.locator("main a[href^='/admin/supplications/']")).toHaveCount(0);
});

// ---------------------------------------------------------------- the list, and a Supplication's editor

When(/^I open the editor of the Supplication at (\S+?)( in two tabs)?$/, async ({ reader, reading }, run: string, two?: string) => {
  const row = await rowAt(run);
  if (!stateOf(reading).opened.has(run)) stateOf(reading).opened.set(run, row);
  const res = await reader.page.goto(`/admin/supplications/${row.id}`);
  expect(res?.status(), `the editor of the Supplication at ${run} is found`).toBe(200);
  if (two) {
    const second = await reader.page.context().newPage();
    await second.goto(`/admin/supplications/${row.id}`);
    stateOf(reading).tabs = [reader.page, second];
  }
});

When("I follow the Supplication editor's list's link {string}", async ({ reader, reading }, name: string) => {
  const link = reader.page.getByRole("main").locator("article h2").getByRole("link", { name, exact: true });
  await expect(link, `the list's link "${name}"`).toBeVisible();
  const run = name.split(" ").at(-1)!;
  if (!stateOf(reading).opened.has(run)) stateOf(reading).opened.set(run, await rowAt(run));
  await link.click();
  await expect(reader.page).toHaveURL(/\/admin\/supplications\/\d+$/);
});

Then("the editor is headed {string}", async ({ reader }, title: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText(title);
});

Then(/^the editor shows the Word cards and the Ayah translation of Ayah (\d+:\d+), and no other Ayah$/, async ({ reader }, place: string) => {
  const ayahs = reader.page.locator("[data-ayah]");
  await expect(ayahs, "the editor's Ayahs").toHaveCount(1);
  await expect(ayahs.first()).toHaveAttribute("data-ayah", place);
  const cards = ayahs.first().locator(`[id^="${place}:"]`);
  await expect(cards.first(), "its Word cards").toBeVisible();
  expect(await cards.evaluateAll((els) => els.every((el) => el.querySelector("[lang='ar']")?.textContent)), "each Word card holds its Arabic").toBe(true);
  await expect(ayahs.first().locator("p:not([lang='ar']):visible"), "its Ayah translation").not.toHaveText("");
});

Then(
  /^the editor's Speaker is "(.+)", its Openings are "(.+)", its kind is "(.+)" and its run is First Ayah (\d+) and Last Ayah (\d+)$/,
  async ({ reader }, speaker: string, openings: string, kind: string, from: number, to: number) => {
    const page = reader.page;
    await expect(page.getByRole("combobox", { name: "Speaker", exact: true }).locator("option:checked")).toHaveText(speaker);
    await expectOpenings(page, openings);
    await expect(page.getByRole("combobox", { name: "Kind", exact: true }).locator("option:checked")).toHaveText(kind);
    await expect(page.getByRole("spinbutton", { name: "First Ayah", exact: true })).toHaveValue(String(from));
    await expect(page.getByRole("spinbutton", { name: "Last Ayah", exact: true })).toHaveValue(String(to));
  },
);

// ---------------------------------------------------------------- editing and saving

When(/^I (tick|untick) the editor's Opening "(.+)"$/, async ({ reader }, verb: string, name: string) => {
  await opening(reader.page, name).setChecked(verb === "tick");
});

When(/^in the (first|second) tab I (tick|untick) the editor's Opening "(.+)" and press "(.+)"$/, async ({ reading }, which: string, verb: string, name: string, button: string) => {
  const page = tab(reading, which);
  await opening(page, name).setChecked(verb === "tick");
  await page.getByRole("button", { name: button, exact: true }).click();
});

When(/^in the (first|second) tab I tap the Word cards at (.+) and press "(.+)"$/, async ({ reading }, which: string, locations: string, button: string) => {
  const page = tab(reading, which);
  for (const location of listOf(locations)) await cardAt(page, location).click();
  await page.getByRole("button", { name: button, exact: true }).click();
});

When(/^in the (first|second) tab I press "(.+)"$/, async ({ reading }, which: string, button: string) => {
  await tab(reading, which).getByRole("button", { name: button, exact: true }).click();
});

Then(/^the editor in the (first|second) tab says "(.+)"$/, async ({ reading }, which: string, text: string) => {
  await expect(tab(reading, which).getByRole("status").filter({ hasText: text })).toBeVisible();
});

Then(/^the editor in the (first|second) tab shows the alert "(.+)"$/, async ({ reading }, which: string, text: string) => {
  await expect(tab(reading, which).getByRole("alert").filter({ hasText: text })).toBeVisible();
});

Then(/^the editor in the (first|second) tab shows the latest save with the Openings "(.+)"$/, async ({ reading }, which: string, openings: string) => {
  const latest = tab(reading, which).getByRole("region", { name: "The latest save", exact: true });
  await expect(latest).toBeVisible();
  await expect(latest.locator("dt", { hasText: "Openings" }).locator("+ dd")).toHaveText(openings);
});

Then(/^the editor in the (first|second) tab shows the latest save with the spans "(.+)"$/, async ({ reading }, which: string, spans: string) => {
  const latest = tab(reading, which).getByRole("region", { name: "The latest save", exact: true });
  await expect(latest).toBeVisible();
  await expect(latest.locator("dt", { hasText: "Spans" }).locator("+ dd")).toHaveText(spans);
});

Then(/^the editor's Openings in the (first|second) tab are "(.+)"$/, async ({ reading }, which: string, openings: string) => {
  await expectOpenings(tab(reading, which), openings);
});

// ---------------------------------------------------------------- the database after

Then(/^the Supplication at (\S+) in the database has the Openings "(.+)"$/, async ({}, run: string, openings: string) => {
  await expect.poll(async () => (await rowAt(run)).openings).toEqual(openingsIn(openings));
});

Then(/^the Supplication at (\S+) in the database is as it was when its editor opened$/, async ({ reading }, run: string) => {
  expect(await rowAt(run), `the Supplication at ${run}`).toEqual(stateOf(reading).opened.get(run));
});

// ---------------------------------------------------------------- the Supplications page after

Then("the Supplications page has an entry headed {string} and none headed {string}", async ({ reader }, shown: string, gone: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  const headings = (await reader.page.locator("main article h2").allInnerTexts()).map(squash);
  expect(headings, "the entries' headings").toContain(shown);
  expect(headings, "the entries' headings").not.toContain(gone);
});

// ---------------------------------------------------------------- adding, deleting and the Speakers (#202)

When("I follow the Supplication editor's link {string}", async ({ reader }, name: string) => {
  const link = reader.page.getByRole("main").getByRole("link", { name, exact: true });
  await expect(link, `the Supplication editor's link "${name}"`).toBeVisible();
  await link.click();
  await expect(reader.page.getByRole("heading", { level: 1 })).toHaveText(name);
});

When("I choose {string} as the editor's {string}", async ({ reader }, option: string, name: string) => {
  await reader.page.getByRole("combobox", { name, exact: true }).selectOption({ label: option });
});

Then("the Supplications page has an entry headed {string}", async ({ reader }, shown: string) => {
  await expect(reader.page.getByRole("heading", { level: 1 })).toBeVisible();
  const headings = (await reader.page.locator("main article h2").allInnerTexts()).map(squash);
  expect(headings, "the entries' headings").toContain(shown);
});

/** The Speakers page's form of the Speaker named `name` in English. */
const speakerForm = (page: Page, name: string) => page.getByRole("form", { name, exact: true });

When("I set the Speaker {string}'s {string} to {string}", async ({ reader }, speaker: string, field: string, value: string) => {
  await speakerForm(reader.page, speaker).getByRole("textbox", { name: field, exact: true }).fill(value);
});

When("I press the Speaker {string}'s {string}", async ({ reader }, speaker: string, button: string) => {
  await speakerForm(reader.page, speaker).getByRole("button", { name: button, exact: true }).click();
});

Then("the Speaker {string} says {string}", async ({ reader }, speaker: string, text: string) => {
  await expect(speakerForm(reader.page, speaker).getByRole("status").filter({ hasText: text })).toBeVisible();
});

Then("the Supplications page names a Speaker {string}", async ({ reader }, name: string) => {
  await expect(reader.page.getByRole("main").getByText(name, { exact: true }).first()).toBeVisible();
});
