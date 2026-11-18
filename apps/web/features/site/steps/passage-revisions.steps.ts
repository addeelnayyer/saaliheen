// Steps for #174: a Surah's Passage revisions in the admin area, and undoing
// one there (ADR 0049). The page is found from the Passage editor's "Passage
// revisions" link, or at its address, /admin/{surah}/passages. It lists the
// revisions as a list named "Passage revisions", newest first; each says
// "Version N", "on version B", who made it and when (a <time> with its
// dateTime), the edits it sent in a list named "Edits" and the rows it
// changed in a list named "Changes", and offers "Undo" when it can be
// undone. Passage titles are not typed: a change is checked by its Ayahs.

import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Then, When } from "./fixtures";
import { act } from "./passage-editor.steps";

/** The address of Surah `surah`'s Passage revisions. */
const REVISIONS_PAGE = (surah: number) => `/admin/${surah}/passages`;

/** The list of the page's revisions. */
const revisionsList = (page: Page) => page.getByRole("list", { name: "Passage revisions", exact: true });

/** The revisions listed, newest first. */
const revisionItems = (page: Page) => revisionsList(page).getByRole("listitem").filter({ has: page.locator("time") });

/** The revision listed as version `version`. */
const revisionAt = (page: Page, version: number) => revisionItems(page).filter({ hasText: new RegExp(`\\bVersion ${version}\\b`) });

/** The lines listed under `name` ("Edits" or "Changes") in `revision`. */
const lineItems = (revision: Locator, name: string) => revision.getByRole("list", { name, exact: true }).getByRole("listitem");

/** A row of a scenario's table of revisions. */
interface RevisionRow {
  version: string;
  on: string;
  by: string;
  edits?: string;
  changes?: string;
}

/** Any Passage's English title, as the list quotes it. */
const TITLE = "“[^”]*”";

/**
 * A change as a scenario writes it, "89–91 → 89–94", "92–94 removed" or
 * "92–94 added", as the pattern its line in the list matches, whatever the
 * Passage's titles.
 */
function changePattern(written: string): RegExp {
  const m = /^(\S+) (?:→ (\S+)|(removed|added))$/.exec(written.trim());
  if (!m) throw new Error(`not a change as written: ${written}`);
  const tail = m[2] ? ` → ${m[2]} ${TITLE}` : ` ${m[3]}`;
  return new RegExp(`^Passage ${m[1]} ${TITLE}${tail}$`);
}

/** Expect `revision` to list exactly `lines` under `name`, each matching its pattern. */
async function expectLines(revision: Locator, name: string, lines: (string | RegExp)[], what: string) {
  const items = lineItems(revision, name);
  await expect(items, `${what}: the lines listed under "${name}"`).toHaveCount(lines.length);
  for (const [i, line] of lines.entries()) await expect(items.nth(i), `${what}: "${name}" line ${i + 1}`).toHaveText(line);
}

const listed = (cell: string | undefined) => (cell ? cell.split(";").map((s) => s.trim()) : []);

// ------------------------------------------------------------ opening

When("I open the Passage revisions from the Passage editor", async ({ reader, reading }) => {
  const link = reader.page.getByRole("link", { name: "Passage revisions", exact: true });
  await expect(link, 'the Passage editor links to "Passage revisions"').toBeVisible();
  await act(reading, link);
  await expect(reader.page, "the Surah's Passage revisions are open").toHaveURL((url) => /^\/admin\/\d+\/passages$/.test(url.pathname));
});

When("I open the Passage revisions of Surah {int} by their address", async ({ reader }, surah: number) => {
  await reader.page.goto(REVISIONS_PAGE(surah));
});

// ------------------------------------------------------------ the list

Then("the Passage revisions are listed, newest first, exactly:", async ({ reader: { page } }, table: DataTable) => {
  const rows = table.hashes() as unknown as RevisionRow[];
  const items = revisionItems(page);
  await expect(items, "the revisions listed").toHaveCount(rows.length, { timeout: 30_000 });
  for (const [i, row] of rows.entries()) {
    const revision = items.nth(i);
    const what = `revision ${i + 1} listed`;
    await expect(revision, `${what} is version ${row.version}`).toContainText(new RegExp(`\\bVersion ${row.version} on version ${row.on}\\b`));
    await expect(revision, `${what} names who made it`).toContainText(`by ${row.by}`);
    if (row.edits) await expectLines(revision, "Edits", listed(row.edits), what);
    else await expect(revision.getByRole("list", { name: "Edits", exact: true }), `${what} lists no edit`).toHaveCount(0);
    if (row.changes) await expectLines(revision, "Changes", listed(row.changes).map(changePattern), what);
    else await expect(revision.getByRole("list", { name: "Changes", exact: true }), `${what} lists no change`).toHaveCount(0);
  }
});

Then("each Passage revision listed says when it was made, the newest first", async ({ reader: { page } }) => {
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
    times.push(at);
  }
  for (let i = 1; i < times.length; i++) expect(times[i], "newest first").toBeLessThanOrEqual(times[i - 1]);
});

Then("only Passage revision {int} offers Undo", async ({ reader: { page } }, version: number) => {
  await expect(revisionsList(page).getByRole("button", { name: "Undo", exact: true }), "one revision offers Undo").toHaveCount(1);
  await expect(revisionAt(page, version).getByRole("button", { name: "Undo", exact: true }), `revision ${version} offers Undo`).toHaveCount(1);
});

Then("I do not see any Passage revision", async ({ reader: { page } }) => {
  await expect(revisionsList(page), "no list of Passage revisions").toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo", exact: true }), "no Undo").toHaveCount(0);
});

// ------------------------------------------------------------ undoing

When("I undo Passage revision {int}", async ({ reader, reading }, version: number) => {
  const button = revisionAt(reader.page, version).getByRole("button", { name: "Undo", exact: true });
  await expect(button, `revision ${version} offers Undo`).toBeEnabled();
  await act(reading, button);
});

Then("I see that Passage revision {int} was undone", async ({ reader: { page } }, version: number) => {
  await expect(page.getByRole("status").filter({ hasText: `Revision ${version} was undone` }), "the page says the revision was undone").toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("alert").filter({ hasText: "refused" }), "no refusal").toHaveCount(0);
});

Then("I see that the undo was refused because {string}", async ({ reader: { page } }, reason: string) => {
  const alert = page.getByRole("alert").filter({ hasText: "The undo was refused" });
  await expect(alert, "an alert says the undo was refused").toBeVisible({ timeout: 30_000 });
  await expect(alert, "and why").toContainText(reason);
});
