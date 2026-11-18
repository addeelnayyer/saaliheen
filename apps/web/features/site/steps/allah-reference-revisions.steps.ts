// Steps for #154: a Surah's Allah reference revisions in the admin area, and
// undoing a publish there (ADR 0044). The page is found from the Passage
// editor's "Allah reference revisions" link, or at its address,
// /admin/{surah}/allah-references. It lists the revisions as a list named
// "Allah reference revisions", newest first; each says who made it and when
// (a <time> with its dateTime), and lists the Words it added and removed in
// lists named "Added" and "Removed", each Word shown as its Uthmani Arabic
// beside its Word location, and offers "Undo" unless it is the seed's.
// Arabic is read from the sources by Word location. The site tests' Postgres
// is written only through the seed the owner runs; the Admin's publishes
// "from another tab" go through the Allah references API with the Admin's
// own session.

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { sourceWord, sourceWords } from "../support";
import { testDatabase } from "../test-database";
import { Given, Then, When } from "./fixtures";

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..", "..");

/** The address of Surah `surah`'s Allah reference revisions. */
const REVISIONS_PAGE = (surah: number) => `/admin/${surah}/allah-references`;

/** The Word locations in `list`, each checked against the sources, in the order written. */
function wordsIn(list: string | undefined): string[] {
  const named: string[] = list?.match(/\d+:\d+:\d+/g) ?? [];
  for (const l of named) {
    const surah = Number(l.split(":")[0]);
    expect(sourceWords(surah).some((w) => w.location === l), `the sources have a Word ${l}`).toBe(true);
  }
  return named;
}

/** The list of the page's revisions. */
const revisionsList = (page: Page) => page.getByRole("list", { name: "Allah reference revisions", exact: true });

/** The revisions listed, newest first: the list's items that say when they were made. */
const revisionItems = (page: Page) => revisionsList(page).getByRole("listitem").filter({ has: page.locator("time") });

/** The Words listed under `name` ("Added" or "Removed") in `revision`. */
const wordItems = (revision: Locator, name: string) => revision.getByRole("list", { name, exact: true }).getByRole("listitem");

// ------------------------------------------------------------ arranging

Given("the seed has loaded Surah {int}'s Allah references holding {string}", async ({}, surah: number, list: string) => {
  const locations = wordsIn(list);
  for (const l of locations) expect(l.startsWith(`${surah}:`), `${l} is a Word of Surah ${surah}`).toBe(true);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "allah-references-")), "allah-references.json");
  fs.writeFileSync(file, JSON.stringify(locations));
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  try {
    await promisify(execFile)("pnpm", ["run", "--silent", "db:seed-allah-references", file], { cwd: WEB, env, encoding: "utf8" });
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    throw new Error(`the seed did not run: ${stdout}\n${stderr}\n${message}`);
  }
});

/** Publish Surah `surah`'s Allah reference changes `list` through the API with the Admin's own session, against the Surah's version now. */
async function publishFromAnotherTab(page: Page, baseURL: string, surah: number, list: string) {
  const address = new URL(`/api/v1/allah-references/${surah}`, baseURL).toString();
  const now = await page.request.get(address);
  expect(now.status(), `GET ${address}`).toBe(200);
  const { version } = (await now.json()) as { version: number };
  const res = await page.request.post(address, {
    headers: { origin: new URL(baseURL).origin },
    data: { base: version, changes: wordsIn(list) },
  });
  expect(res.status(), `the Admin's publish from another tab: ${(await res.text()).slice(0, 300)}`).toBe(200);
}

Given(
  /^I (?:have published|publish), from another tab, Surah (\d+)'s Allah reference changes "([^"]+)"$/,
  async ({ reader }, surah: string, list: string) => {
    await publishFromAnotherTab(reader.page, reader.baseURL, Number(surah), list);
  },
);

// ------------------------------------------------------------ opening

When("I open the Allah reference revisions from the Passage editor", async ({ reader, reading }) => {
  const link = reader.page.getByRole("link", { name: "Allah reference revisions", exact: true });
  await expect(link, 'the Passage editor links to "Allah reference revisions"').toBeVisible();
  await (reading.viewport === "phone" ? link.tap() : link.click());
  await expect(reader.page, "the Surah's Allah reference revisions are open").toHaveURL((url) => /^\/admin\/\d+\/allah-references$/.test(url.pathname));
});

When("I open the Allah reference revisions of Surah {int} by their address", async ({ reader }, surah: number) => {
  await reader.page.goto(REVISIONS_PAGE(surah));
});

// ------------------------------------------------------------ the list

/** A row of a scenario's table of revisions. */
interface RevisionRow {
  by: string;
  added?: string;
  removed?: string;
}

/** Expect `revision` to list exactly the Words `locations` under `name`, each as its Arabic beside its Word location. */
async function expectWords(revision: Locator, name: string, locations: string[], what: string) {
  const items = wordItems(revision, name);
  await expect(items, `${what}: the Words listed under "${name}"`).toHaveCount(locations.length);
  for (const [i, location] of locations.entries()) {
    const item = items.nth(i);
    await expect(item, `${what}: "${name}" Word ${i + 1} names its Word location`).toContainText(location);
    await expect(item, `${what}: "${name}" Word ${i + 1}, ${location}, is shown as its Arabic`).toContainText(sourceWord(location).uthmani);
  }
}

Then("the Allah reference revisions are listed, newest first, exactly:", async ({ reader: { page } }, table: DataTable) => {
  const rows = table.hashes() as unknown as RevisionRow[];
  const items = revisionItems(page);
  await expect(items, "the revisions listed").toHaveCount(rows.length, { timeout: 30_000 });
  for (const [i, row] of rows.entries()) {
    const revision = items.nth(i);
    const what = `revision ${i + 1} listed`;
    if (row.by === "the seed") await expect(revision, `${what} is the seed's`).toContainText(/\bthe seed\b/i);
    else await expect(revision, `${what} names the Admin`).toContainText(row.by);
    await expectWords(revision, "Added", wordsIn(row.added), what);
    await expectWords(revision, "Removed", wordsIn(row.removed), what);
  }
});

Then("each revision listed says when it was made, the newest first", async ({ reader: { page } }) => {
  const items = revisionItems(page);
  const count = await items.count();
  expect(count, "revisions listed").toBeGreaterThan(0);
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const time = items.nth(i).locator("time").first();
    await expect(time, `revision ${i + 1} shows when it was made`).toBeVisible();
    expect((await time.innerText()).trim(), `revision ${i + 1}'s time, in words`).not.toBe("");
    const at = Date.parse((await time.getAttribute("datetime")) ?? "");
    expect(Number.isFinite(at), `revision ${i + 1}'s time carries a machine-readable dateTime`).toBe(true);
    expect(Math.abs(Date.now() - at), `revision ${i + 1} was made during this run`).toBeLessThan(30 * 60_000);
    times.push(at);
  }
  for (let i = 1; i < times.length; i++) expect(times[i], "newest first").toBeLessThanOrEqual(times[i - 1]);
});

Then("every revision listed offers Undo but the seed's", async ({ reader: { page } }) => {
  const items = revisionItems(page);
  const count = await items.count();
  expect(count, "revisions listed").toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const revision = items.nth(i);
    const isSeed = /\bthe seed\b/i.test(await revision.innerText());
    await expect(revision.getByRole("button", { name: "Undo", exact: true }), `revision ${i + 1}${isSeed ? ", the seed's," : ""} ${isSeed ? "offers no" : "offers"} Undo`).toHaveCount(isSeed ? 0 : 1);
  }
});

Then("I do not see any Allah reference revision", async ({ reader: { page } }) => {
  await expect(revisionsList(page), "no list of Allah reference revisions").toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo", exact: true }), "no Undo").toHaveCount(0);
});

// ------------------------------------------------------------ undoing

/** Undo the `n`th revision listed (0 the newest), confirming it if the page asks. */
async function undoListed(reader: { page: Page }, viewport: string, n: number) {
  const page = reader.page;
  const button = revisionItems(page).nth(n).getByRole("button", { name: "Undo", exact: true });
  await expect(button, `revision ${n + 1} listed offers Undo`).toBeEnabled();
  page.once("dialog", (dialog) => void dialog.accept());
  await (viewport === "phone" ? button.tap() : button.click());
  // An undo the page asks the Admin to confirm is confirmed.
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: /^Undo\b/ }).first();
  const asked = await confirm.waitFor({ state: "visible", timeout: 1_000 }).then(() => true, () => false);
  if (asked) await (viewport === "phone" ? confirm.tap() : confirm.click());
}

When("I undo the newest revision listed", async ({ reader, reading }) => {
  await undoListed(reader, reading.viewport, 0);
});

Then("I see that the publish was undone", async ({ reader: { page } }) => {
  await expect(page.getByText(/\bundone\b/i).first(), "the page says the publish was undone").toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Someone published first"), "no refusal").toHaveCount(0);
});

Then("I see that the undo was refused because someone published first", async ({ reader: { page } }) => {
  const alert = page.getByRole("alert").filter({ hasText: "Someone published first" });
  await expect(alert.first(), 'an alert says "Someone published first"').toBeVisible({ timeout: 30_000 });
});
