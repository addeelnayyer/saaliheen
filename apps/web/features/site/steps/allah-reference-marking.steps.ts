// Steps for #152: marking Allah references in the Passage editor. The mode is
// the toolbar's "Allah references" switch, beside "Phrases"
// (./phrases-mode.steps.ts); its count of Allah reference changes is read from
// the Unpublished changes bar, as ./passage-editor.steps.ts reads the count of
// Passage and Phrase changes. Which Words are gold is the seeded list
// (../allah-references.json) with the taps a scenario made, read as
// ./allah-references.steps.ts reads gold; every Word location is checked
// against the sources, and no Arabic is typed.

import { expect, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { sourceWords } from "../support";
import { testDatabase } from "../test-database";
import { seededAllahReferences } from "./allah-references";
import { expectArabicIn, expectNotGold, goldOnPage } from "./allah-references.steps";
import { Then, When } from "./fixtures";
import { act, chosen } from "./passage-editor.steps";
import { bar } from "./publishing.steps";

// ------------------------------------------------------------------ locators

const toolbar = (page: Page) => page.getByRole("toolbar");
/** The toolbar's "Allah references" switch: a switch, or a pressable button, of that name. */
const allahSwitch = (page: Page) =>
  toolbar(page)
    .getByRole("switch", { name: "Allah references", exact: true })
    .or(toolbar(page).getByRole("button", { name: "Allah references", exact: true }));

/** The Word location `location`, checked against the sources. */
function wordOf(location: string): string {
  const surah = Number(location.split(":")[0]);
  if (!sourceWords(surah).some((w) => w.location === location)) throw new Error(`the sources have no Word ${location}`);
  return location;
}

/** The Word locations in `list` ("112:1:1, 112:3:1"), each checked against the sources. */
const listed = (list: string | undefined) =>
  (list ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(wordOf);

// ------------------------------------------------------------------ the mode

async function expectSwitch(control: Locator, state: string) {
  await expect(control, 'the toolbar holds "Allah references"').toBeVisible();
  await expect.poll(() => chosen(control), { message: `"Allah references" is ${state}` }).toBe(String(state === "on"));
}

Then(/^the toolbar holds the "Allah references" switch, (on|off)$/, async ({ reader }, state: string) => {
  await expectSwitch(allahSwitch(reader.page), state);
});

Then(/^the "Allah references" switch is (on|off)$/, async ({ reader }, state: string) => {
  await expectSwitch(allahSwitch(reader.page), state);
});

When(/^I turn marking Allah references (on|off)$/, async ({ reader, reading }, state: string) => {
  const control = allahSwitch(reader.page);
  await expect(control, 'the toolbar holds "Allah references"').toBeVisible();
  if ((await chosen(control)) !== String(state === "on")) await act(reading, control);
  await expectSwitch(control, state);
});

Then('I do not see the "Allah references" switch', async ({ reader }) => {
  await reader.page.waitForLoadState("load");
  await expect(allahSwitch(reader.page)).toHaveCount(0);
  await expect(reader.page.getByText("Allah references", { exact: true })).toHaveCount(0);
});

// ------------------------------------------------------------------- tapping

When("I tap the Word card at {location}", async ({ reader, reading }, location: string) => {
  const card = reader.page.locator(`[id="${wordOf(location)}"]`);
  await expect(card, `the Word card at ${location} is shown`).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await act(reading, card);
});

// ------------------------------------------------------------------ the gold

Then(
  /^the Word cards of Surah (\d+) are gold as the seeded list says(?:, with "([^"]+)" marked)?(?:(?:, with| and) "([^"]+)" unmarked)?$/,
  async ({ reader: { page } }, surahText: string, marked: string | undefined, unmarked: string | undefined) => {
    const surah = Number(surahText);
    const gold = new Set(seededAllahReferences().filter((l) => l.startsWith(`${surah}:`)));
    for (const l of listed(marked)) {
      expect(gold.has(l), `${l} is not in the seeded list, so marking it changes something`).toBe(false);
      gold.add(l);
    }
    for (const l of listed(unmarked)) {
      expect(gold.delete(l), `${l} is in the seeded list, so unmarking it changes something`).toBe(true);
    }
    // In Quran order, the order the page's Word cards are read in.
    const words = sourceWords(surah).map((w) => w.location);
    const others = words.filter((l) => !gold.has(l));
    if (gold.size) await expectArabicIn(page, surah, words.filter((l) => gold.has(l)), await goldOnPage(page));
    await expectNotGold(page, surah, others);
  },
);

// --------------------------------------------------- the Unpublished changes bar

Then(/^there (?:is|are) (no|\d+) Allah reference changes? waiting$/, async ({ reader }, count: string) => {
  const n = count === "no" ? 0 : Number(count);
  await expect(bar(reader.page)).toBeVisible();
  if (n === 0) await expect(bar(reader.page)).not.toContainText(/(^|\D)[1-9]\d* Allah reference changes?/);
  else await expect(bar(reader.page)).toContainText(new RegExp(`(^|\\D)${n} Allah reference change${n === 1 ? "(?!s)" : "s"}`));
});

// ------------------------------------------------------------- another publish

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/**
 * Another Admin's publish, as the database records one (ADR 0014): a
 * revision of Surah `surah`'s Allah references made on its current version,
 * moving it one version on. It adds and removes no Word location, so what
 * readers see of the Surah, here and in every other feature, is unchanged.
 */
When("another publish moves Surah {int}'s Allah references to a new version", async ({}, surah: number) => {
  const client = await database().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ version: number | null }>(
      `select max(version) as version from "allahReferenceRevision" where surah = $1`,
      [surah],
    );
    const base = Number(rows[0]?.version ?? 0);
    await client.query(
      `insert into "allahReferenceRevision" (id, surah, author, "createdAt", added, removed, base, version)
       values (gen_random_uuid()::text, $1, $2, now(), '[]', '[]', $3, $4)`,
      [surah, "another-admin", base, base + 1],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------------- readers

Then("the Allah references API answers Surah {int}'s Word locations in the seeded list", async ({ reader }, surah: number) => {
  const res = await reader.page.request.get(new URL(`/api/v1/allah-references/${surah}`, reader.baseURL).toString());
  expect(res.status(), `GET /api/v1/allah-references/${surah}`).toBe(200);
  const body = (await res.json()) as { surah: number; locations: string[] };
  expect(body.surah).toBe(surah);
  expect([...body.locations].sort()).toEqual(seededAllahReferences().filter((l) => l.startsWith(`${surah}:`)).sort());
});

