// Plans and the questions counted against them (#80, ADR 0058). "plan" holds
// each Plan's Question limits, read on every question, so the owner changes
// them in Neon without a deploy and the next question meets the change; its
// one row is the Free Plan, which every Account is on. "asked_question" is
// one row per question an Account asked Quran Chat, counted against both
// limits and deleted with the Account. Neither is Saaliheen's own content, so
// neither is in the content audit.

import type { PoolClient } from "pg";

/** The Free Plan's Question limits as this migration first sets them. */
export const FREE_PLAN_LIMITS = { daily: 20, monthly: 300 };

/**
 * "plan": its `name` and its `daily_question_limit` and
 * `monthly_question_limit`, with the Free Plan's row. "asked_question": the
 * Account that asked ("userId", as every table tied to an Account names it)
 * and when (`asked_at`), indexed by both, so an Account's questions in a day
 * or a month are counted from the index.
 */
export async function createPlanAndAskedQuestion(client: PoolClient) {
  await client.query(`
    create table plan (
      name text primary key,
      daily_question_limit integer not null check (daily_question_limit >= 0),
      monthly_question_limit integer not null check (monthly_question_limit >= 0)
    )`);
  await client.query(`insert into plan (name, daily_question_limit, monthly_question_limit) values ('free', $1, $2)`, [
    FREE_PLAN_LIMITS.daily,
    FREE_PLAN_LIMITS.monthly,
  ]);
  await client.query(`
    create table asked_question (
      "userId" text not null references "user" (id) on delete cascade,
      asked_at timestamptz not null
    )`);
  await client.query(`create index asked_question_account_asked_at on asked_question ("userId", asked_at)`);
}
