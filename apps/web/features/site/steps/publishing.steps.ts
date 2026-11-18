// Publishing Unpublished changes (#45, #171): Publish in the Unpublished
// changes bar writes an Admin's Passage edits to Neon in one transaction,
// with one Passage revision naming the Admin's Account, made on the Surah's
// version the editor opened on (ADR 0011). What a Publish wrote is read
// straight from the run's Postgres (../test-database.ts), which the
// production build reads as DATABASE_URL, and from what a reader of the
// Surah's page gets. Expected Passages come from what Neon holds
// (../passages-in-the-test-database.ts), never typed.

import { expect, type Page } from "@playwright/test";
import { ADMIN_EMAIL, NON_ADMIN_EMAIL } from "../admin-settings";
import { neonPassages, NEON_CHANGE, NEON_VERSION, written } from "../passages-in-the-test-database";
import type { Language } from "../support";
import { testSignIn } from "./admin.steps";
import { Given, Then, When, type Reader } from "./fixtures";
import { act, CONFIRMED, expectTable, expectedRanges, neonDatabase, neonPassage, passageRows, surahOf, versionOf } from "./passage-editor.steps";

// ----------------------------------------------------------- locators, acts

export const bar = (page: Page) => page.getByRole("region", { name: "Unpublished changes", exact: true });
export const publishButton = (page: Page) => bar(page).getByRole("button", { name: "Publish", exact: true });

When("my session ends while the editor is open", async ({ reader }) => {
  await reader.page.context().clearCookies();
});

When("{string}, who is not an Admin, signs in in another tab of this browser", async ({ reader }, email: string) => {
  expect(email).toBe(NON_ADMIN_EMAIL);
  const tab = await reader.page.context().newPage();
  // Through Google: GitHub is refused to anyone not on the Admin allow-list (#67).
  await testSignIn(tab, email, "Google");
  await tab.close();
});

When("I publish", async ({ reader, reading }) => {
  const publish = publishButton(reader.page);
  await expect(publish, "Publish is enabled").toBeEnabled();
  await act(reading, publish);
});

When("the network drops every request the page sends but a GET", async ({ reader }) => {
  await reader.page.route("**/*", (route) => (route.request().method() === "GET" ? route.continue() : route.abort("internetdisconnected")));
});

When("the network is back", async ({ reader }) => {
  await reader.page.unrouteAll({ behavior: "ignoreErrors" });
});

// ------------------------------------------------------ what the page says

Then("I see {string}", async ({ reader }, text: string) => {
  await expect(reader.page.getByText(text), `the page says "${text}"`).toBeVisible({ timeout: 30_000 });
});

/** The alert saying a Publish was refused: visible, and not a confirmation. */
async function expectRefused(page: Page) {
  const alert = page.getByRole("alert").filter({ hasText: /\S/ });
  await expect(alert.first(), "an alert says the Publish didn't go through").toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(CONFIRMED), "no confirmation").toHaveCount(0);
  return alert.first();
}

Then("I see that the publish was refused", async ({ reader }) => {
  await expectRefused(reader.page);
});

Then("I see that the publish was refused, and am asked to try again", async ({ reader }) => {
  const alert = await expectRefused(reader.page);
  await expect(alert, "the alert asks the Admin to try again").toContainText(/try again/i);
});

Then("I see that the publish was refused, saying {string}", async ({ reader }, reason: string) => {
  await expectRefused(reader.page);
  await expect(reader.page.getByRole("alert").filter({ hasText: reason }), "an alert gives the reason").toBeVisible();
});

Then("the confirmation links to nothing", async ({ reader }) => {
  const confirmation = reader.page.getByText(CONFIRMED).first();
  await expect(confirmation, "the page confirms the Publish").toBeVisible();
  await expect(confirmation.locator("xpath=..").getByRole("link"), "no link in the confirmation").toHaveCount(0);
  const hrefs = await reader.page
    .getByRole("link")
    .evaluateAll((links) => links.filter((a) => (a as HTMLElement).checkVisibility()).map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs.filter((h) => /github\.com|\/commit\//.test(h)), "no visible link to a commit").toEqual([]);
});

// ------------------------------------------------------ what Neon holds

/** The Admin's Account id, as the run's database holds it. */
async function adminAccountId(): Promise<string> {
  const { rows } = await neonDatabase().query<{ id: string }>(`select id from "user" where email = $1`, [ADMIN_EMAIL]);
  expect(rows, `the run's database holds the Account of ${ADMIN_EMAIL}`).toHaveLength(1);
  return rows[0].id;
}

interface Revision {
  author: string;
  created_at: Date;
  edits: unknown;
  base: number;
  version: number;
}

/** Surah `surah`'s Passage revisions above its arranged (Surah 18) or loaded (any other) version, in order. */
async function revisionsSinceArranged(surah: number): Promise<Revision[]> {
  await expectTable("passage_revision");
  const { rows } = await neonDatabase().query<Revision>(
    `select author, created_at, edits, base, version from passage_revision where surah = $1 and version > $2 order by version`,
    [surah, surah === NEON_CHANGE.surah ? NEON_VERSION : 1],
  );
  return rows.map((r) => ({ ...r, base: Number(r.base), version: Number(r.version) }));
}

const listOf = (value: unknown): unknown[] => (typeof value === "string" ? JSON.parse(value) : (value as unknown[]));

Then("Neon holds Surah {int}'s Passages as Neon's, at version {int}", async ({ reading }, surah: number, version: number) => {
  const held = await passageRows(surah);
  const neon = (reading.neon ?? neonPassages()).filter((p) => p.surah_no === surah);
  expect(held, `the run's database's Surah ${surah} Passages, titles and all`).toEqual(neon);
  expect(await versionOf(surah), `Surah ${surah}'s Passage version`).toBe(version);
});

Then(
  /^Neon got exactly one Passage revision of Surah (\d+), naming the Admin's Account, made on version (\d+) as version (\d+), holding the edits (.+)$/,
  async ({}, surahText: string, baseText: string, versionText: string, kinds: string) => {
    const surah = Number(surahText);
    const revisions = await revisionsSinceArranged(surah);
    expect(revisions.length, `Passage revisions of Surah ${surah} written since it was arranged`).toBe(1);
    const [r] = revisions;
    const edits = listOf(r.edits) as { kind?: unknown }[];
    expect(
      { author: r.author, base: r.base, version: r.version, kinds: edits.map((e) => e.kind) },
      "the Passage revision: its author, base, version and the kinds of the edits it holds, as the editor sent them",
    ).toEqual({ author: await adminAccountId(), base: Number(baseText), version: Number(versionText), kinds: kinds.split(/, | and /) });
    expect(Math.abs(Date.now() - new Date(r.created_at).getTime()), "made just now").toBeLessThan(120_000);
  },
);

Then("no Passage revision of Surah {int} names the Admin's Account", async ({}, surah: number) => {
  await expectTable("passage_revision");
  const { rows } = await neonDatabase().query<{ version: number }>(`select version from passage_revision where surah = $1 and author = $2`, [
    surah,
    await adminAccountId(),
  ]);
  expect(rows.map((r) => r.version), `Surah ${surah}'s Passage revisions by the Admin`).toEqual([]);
});

Then(/^in Neon (.+)$/, async ({ reading }, claims: string) => {
  const surah = surahOf(reading);
  const held = await passageRows(surah);
  const pairs = claims.split(/, and |, /).map((claim) => {
    const m = claim.match(/^(\S+) (?:has the Passage titles of|those of) (\S+)$/);
    if (!m) throw new Error(`can't read "${claim}" as "<range> has the Passage titles of <range>"`);
    return [m[1], m[2]] as const;
  });
  for (const [range, source] of pairs) {
    const got = held.find((p) => written(p) === range);
    const from = neonPassage(reading, source);
    expect(got, `the run's database holds Surah ${surah}'s ${range}`).toBeDefined();
    expect({ en: got!.title_en, ur: got!.title_ur }, `${range}'s Passage titles`).toEqual({ en: from.title_en, ur: from.title_ur });
  }
});

// ------------------------------------------------- the database refusing

/** The trigger that makes the run's database refuse a Surah's Passage revisions, and its function. */
const REFUSAL = "refuse_passage_revisions_of_issue_171_site";

async function acceptRevisionsAgain() {
  await neonDatabase().query(`drop trigger if exists ${REFUSAL} on passage_revision`);
  await neonDatabase().query(`drop function if exists ${REFUSAL}()`);
}

Given("the run's database refuses every new Passage revision of Surah {int}", async ({ reader }, surah: number) => {
  await expectTable("passage_revision");
  // Dropped first when the scenario ends, before the Surah is put back (which writes a revision).
  reader.cleanups.unshift(acceptRevisionsAgain);
  await neonDatabase().query(
    `create or replace function ${REFUSAL}() returns trigger language plpgsql as $$ begin raise exception 'refused for #171''s site scenario'; end $$`,
  );
  await neonDatabase().query(`drop trigger if exists ${REFUSAL} on passage_revision`);
  await neonDatabase().query(
    `create trigger ${REFUSAL} before insert on passage_revision for each row when (new.surah = ${Number(surah)}) execute function ${REFUSAL}()`,
  );
});

When("the run's database accepts Passage revisions again", async () => {
  await acceptRevisionsAgain();
});

// --------------------------------------------------------- what readers get

/** The Passages Surah `surah`'s parts in `lang` carry, as ranges, fetched as the page fetches them. */
async function partsPassages(reader: Reader, page: Page, lang: Language, surah: number): Promise<string[]> {
  const ranges: string[] = [];
  for (let n = 1; ; n++) {
    const res = await page.request.get(new URL(`/parts/${lang}/${surah}/${n}.json`, reader.baseURL).toString());
    if (res.status() === 404 && n > 1) break;
    expect(res.status(), `/parts/${lang}/${surah}/${n}.json`).toBe(200);
    const ayahs = (await res.json()) as { passage?: { from: number; till: number } }[];
    for (const a of ayahs) if (a.passage) ranges.push(written({ ayah_from: a.passage.from, ayah_till: a.passage.till }));
  }
  return ranges;
}

Then(
  /^a reader opening "([^"]+)" gets its Passages as Neon's(?:, with "([^"]+)" in place of "([^"]+)")?$/,
  async ({ reader, reading }, address: string, by: string | null, replaced: string | null) => {
    const m = address.match(/^\/(en|ur)\/(\d+)$/);
    if (!m) throw new Error(`"${address}" is no Surah page`);
    const [lang, surah] = [m[1] as Language, Number(m[2])];
    expect(surah, "the Surah page is of the Surah the editor published").toBe(surahOf(reading));
    // A reader: a browser of their own, not signed in.
    const context = await reader.newContext();
    const page = await context.newPage();
    const res = await page.goto(address);
    expect(res?.status(), `${address} answers`).toBe(200);
    const res2 = await page.reload();
    expect(res2?.status(), `${address} answers on reload`).toBe(200);
    await expect
      .poll(() => partsPassages(reader, page, lang, surah), { message: `the Passages ${address}'s parts carry`, timeout: 30_000 })
      .toEqual(expectedRanges(reading, by ?? undefined, replaced ?? undefined));
  },
);
