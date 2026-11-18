// Steps for #153 and #171: publishing Allah reference changes from the Passage
// editor (ADR 0043), and readers seeing them with no rebuild. The changes are
// made by ./allah-reference-marking.steps.ts; they are published by the one
// Publish of the Unpublished changes bar (./publishing.steps.ts's "I publish"),
// which carries Passage and Phrase edits with them (#171).
// What readers see is read from the Surah page (./allah-references.steps.ts's
// gold), the Surah parts the page fetches, a Share page's letters and the
// Allah references API. Every Word location is checked against the sources;
// no Arabic is typed. The site tests' Postgres is written only to arrange a
// precondition: a Surah emptied, or another Admin's publish.

import { expect } from "@playwright/test";
import { Pool } from "pg";
import { sourceWords, type Language } from "../support";
import { testDatabase } from "../test-database";
import { GOLDS } from "./allah-references.steps";
import { Given, Then, When } from "./fixtures";
import { bar, publishButton } from "./publishing.steps";
import { frameGold, lettersOnPage } from "./share-page-allah-references.steps";

/** The two tables of Allah references (ADR 0014). */
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";

/** Who "another publish" names as its author. */
const ANOTHER_ADMIN = "another-admin-of-issue-153";

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

/** The Word locations in `list` ("103:2:2, 103:3:3"), each checked against the sources, in Quran order. */
function wordsIn(list: string): string[] {
  const named: string[] = list.match(/\d+:\d+:\d+/g) ?? [];
  const surahs = [...new Set(named.map((l) => Number(l.split(":")[0])))];
  const order = surahs.flatMap((s) => sourceWords(s).map((w) => w.location));
  for (const l of named) expect(order.includes(l), `the sources have a Word ${l}`).toBe(true);
  return order.filter((l) => named.includes(l));
}

// ------------------------------------------------------------ arranging

Given("Surah {int} holds no Allah references and no Allah reference revision", async ({}, surah: number) => {
  await database().query(`delete from "${REFERENCES}" where surah = $1`, [surah]);
  await database().query(`delete from "${REVISIONS}" where surah = $1`, [surah]);
});

/**
 * Another Admin's publish, as one is written (ADR 0014): the Word location
 * added, and a revision of Surah `surah` made on its current version, one
 * version on. Written straight into Postgres, so it refreshes no page.
 */
When("another publish of Surah {int}'s Allah references adds {location}", async ({}, surah: number, location: string) => {
  const [added] = wordsIn(location);
  const client = await database().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(`select coalesce(max(version), 0) as version from "${REVISIONS}" where surah = $1`, [surah]);
    const base = Number(rows[0].version);
    await client.query(`insert into "${REFERENCES}" (id, location, surah) values (gen_random_uuid()::text, $1, $2)`, [added, surah]);
    await client.query(
      `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
       values (gen_random_uuid()::text, $1, $2, now(), $3::jsonb, '[]'::jsonb, $4, $5)`,
      [surah, ANOTHER_ADMIN, JSON.stringify([added]), base, base + 1],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

// ------------------------------------------------------------ publishing

/** The bar's buttons named Publish of any kind: only its one Publish (#171). */
Then("the Unpublished changes bar offers exactly one Publish button, and none for Allah references alone", async ({ reader }) => {
  await expect(publishButton(reader.page), "the Unpublished changes bar's Publish").toBeVisible();
  await expect(bar(reader.page).getByRole("button", { name: /publish/i }), "the Unpublished changes bar's Publish buttons").toHaveCount(1);
  await expect(reader.page.getByRole("button", { name: /publish\b.*\ballah/i }), "no Publish button for Allah references on the page").toHaveCount(0);
});

Then("I see that the publish was refused because someone published first", async ({ reader }) => {
  const alert = reader.page.getByRole("alert").filter({ hasText: "Someone published first" });
  await expect(alert.first(), 'an alert says "Someone published first"').toBeVisible({ timeout: 30_000 });
  await expect(reader.page.getByText(/^(Allah references )?[Pp]ublished\b/), "no confirmation").toHaveCount(0);
});

// ------------------------------------------------------------ what readers get

Then(
  "the Allah references API answers Surah {int}'s Word locations as exactly {string}, at version {int}",
  async ({ reader }, surah: number, list: string, version: number) => {
    const res = await reader.page.request.get(new URL(`/api/v1/allah-references/${surah}`, reader.baseURL).toString());
    expect(res.status(), `GET /api/v1/allah-references/${surah}`).toBe(200);
    expect(await res.json(), `the Allah references API's answer for Surah ${surah}`).toEqual({ surah, version, locations: wordsIn(list) });
  },
);

Then(
  "Surah {int}'s parts in {language} mark exactly {string} as Allah references",
  async ({ reader }, surah: number, lang: Language, list: string) => {
    const marked: string[] = [];
    for (let n = 1; ; n++) {
      const res = await reader.page.request.get(new URL(`/parts/${lang}/${surah}/${n}.json`, reader.baseURL).toString());
      if (res.status() === 404 && n > 1) break;
      expect(res.status(), `/parts/${lang}/${surah}/${n}.json`).toBe(200);
      const ayahs = (await res.json()) as { words: { location: string; allahReference?: boolean }[] }[];
      marked.push(...ayahs.flatMap((a) => a.words).filter((w) => w.allahReference === true).map((w) => w.location));
    }
    expect(marked, `the Words Surah ${surah}'s parts in ${lang} mark as Allah references`).toEqual(wordsIn(list));
  },
);

Then("the Arabic of exactly the Words at {string} is gold on the Share page", async ({ reader: { page } }, list: string) => {
  const words = wordsIn(list);
  const gold = await frameGold(page);
  await expect
    .poll(
      async () => {
        const letters = await lettersOnPage(page);
        const listed = words.map((location) => ({ location, colours: [...new Set(letters.filter((l) => l.location === location).map((l) => l.colour))] }));
        const others = letters.filter((l) => GOLDS.includes(l.colour) && !(l.location && words.includes(l.location))).map((l) => l.location);
        return { listed, others };
      },
      { message: `the Arabic of ${words.join(", ")}, and no other, drawn in gold on the Share page` },
    )
    .toEqual({ listed: words.map((location) => ({ location, colours: [gold] })), others: [] });
});
