// Question limits in Quran Chat (#80): the server's clock, which the browser
// sends in its Test-Now header; questions asked earlier, put in the run's
// Postgres against the Free Plan's limits as its row there holds them; and
// what the page says of the questions left and of a limit reached.

import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { TEST_NOW_HEADER } from "../../../src/test-clock";
import { testDatabase } from "../test-database";
import { signedInAccount } from "./account.steps";
import { Given, Then, When } from "./fixtures";
import type { Language } from "../support";

let pool: Pool | undefined;
/** The run's Postgres, as the site under test reaches it. */
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

const main = (page: Page) => page.getByRole("main");
/** What the page says of the questions left or the limit reached. */
const status = (page: Page) => main(page).getByRole("status");

/** The server's clock as the scenario set it, by page. */
const clocks = new WeakMap<Page, string>();

/** The Free Plan's limits, as its row holds them. */
async function freePlan() {
  const { rows } = await database().query<{ daily: number; monthly: number }>(
    `select daily_question_limit as daily, monthly_question_limit as monthly from plan where name = 'free'`,
  );
  return rows[0];
}

/** Record `count` questions asked, at `at`, by the Account the page is signed in to. */
async function askedEarlier(page: Page, count: number, at: string) {
  const id = (await signedInAccount(page))?.id;
  if (!id) throw new Error("not signed in in this scenario");
  await database().query(`insert into asked_question ("userId", asked_at) select $1, $2::timestamptz from generate_series(1, $3)`, [
    id,
    at,
    count,
  ]);
}

Given("the server's clock reads {string}", async ({ reader }, now: string) => {
  clocks.set(reader.page, now);
  await reader.page.context().setExtraHTTPHeaders({ [TEST_NOW_HEADER]: now });
});

Given("I have {int} question(s) left today", async ({ reader }, left: number) => {
  const now = clocks.get(reader.page);
  if (!now) throw new Error("the server's clock was not set in this scenario");
  const { daily, monthly } = await freePlan();
  expect(monthly, "the month allows more than the day").toBeGreaterThan(daily);
  expect(daily, "the day allows the questions left (an interrupted API contract run may have left the Free Plan changed)").toBeGreaterThanOrEqual(left);
  await askedEarlier(reader.page, daily - left, now);
});

Given("I have asked all of this month's questions, on {string}", async ({ reader }, day: string) => {
  await askedEarlier(reader.page, (await freePlan()).monthly, `${day}T12:00:00Z`);
});

When("I open Quran Chat in {language} again", async ({ reader }, lang: Language) => {
  await reader.page.goto(`/${lang}/quran-chat`);
});

Then("Quran Chat says nothing of the questions left", async ({ reader }) => {
  // The form is busy until the page has read the limits.
  await expect(main(reader.page).locator("form")).toHaveAttribute("aria-busy", "false");
  await expect(status(reader.page)).toHaveCount(0);
});

Then("Quran Chat says {string}", async ({ reader }, text: string) => {
  await expect(status(reader.page)).toHaveText(text);
});

for (const [which, period] of [
  ["daily", "today's"],
  ["monthly", "this month's"],
] as const) {
  Then(`Quran Chat says it has reached ${period} limit, which resets at {string}`, async ({ reader }, resets: string) => {
    const limit = (await freePlan())[which];
    await expect(status(reader.page)).toHaveText(`You have asked all ${limit} of ${period} questions. You can ask again from ${resets}.`);
  });
}

Then("Quran Chat offers no way to ask until then", async ({ reader }) => {
  await expect(main(reader.page).getByRole("textbox", { name: "Your question" })).toBeDisabled();
  await expect(main(reader.page).getByRole("button", { name: "Ask", exact: true })).toBeDisabled();
});
