// Question limits (#80, ADR 0058): every Account is on the Free Plan, the only
// Plan for now, whose daily and monthly Question limits are read from its row
// of "plan" on every question, so a change in Neon applies to the next one.
// Every question an Account asks is a row of "asked_question", counted against
// both limits by calendar day and month in UTC, whatever Conversation, device
// or credential it was asked from. A question past either limit is refused
// and not counted.

import type { Pool, PoolClient } from "pg";
import { limitReached, type Limit, type LimitName, type QuestionLimits } from "@saaliheen/quran-chat";

/** The Plan every Account is on: the Free Plan, the only one for now. */
const FREE_PLAN = { name: "free", shown: "Free" };

/** The UTC day and month `now` is in, each as when it starts and when the next starts. */
function periods(now: Date) {
  const [year, month, day] = [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
  return {
    daily: { from: new Date(Date.UTC(year, month, day)), to: new Date(Date.UTC(year, month, day + 1)) },
    monthly: { from: new Date(Date.UTC(year, month, 1)), to: new Date(Date.UTC(year, month + 1, 1)) },
  };
}

/** Account `accountId`'s Question limits at `now`. */
export async function questionLimits(db: Pool | PoolClient, accountId: string, now: Date): Promise<QuestionLimits> {
  const { daily, monthly } = periods(now);
  const { rows } = await db.query<{ daily_limit: number; monthly_limit: number; daily_asked: number; monthly_asked: number }>(
    `select p.daily_question_limit as daily_limit, p.monthly_question_limit as monthly_limit,
            count(q.asked_at) filter (where q.asked_at >= $3 and q.asked_at < $4)::int as daily_asked,
            count(q.asked_at)::int as monthly_asked
       from plan p
       left join asked_question q on q."userId" = $2 and q.asked_at >= $5 and q.asked_at < $6
      where p.name = $1
      group by p.name`,
    [FREE_PLAN.name, accountId, daily.from, daily.to, monthly.from, monthly.to],
  );
  const row = rows[0];
  if (!row) throw new Error(`Question limits: no "${FREE_PLAN.name}" row in "plan": run \`pnpm db:migrate\``);
  const limit = (allowed: number, asked: number, resetsAt: Date): Limit => ({
    limit: allowed,
    asked,
    left: Math.max(0, allowed - asked),
    resetsAt: resetsAt.toISOString(),
  });
  return {
    plan: FREE_PLAN.shown,
    daily: limit(row.daily_limit, row.daily_asked, daily.to),
    monthly: limit(row.monthly_limit, row.monthly_asked, monthly.to),
  };
}

/** Why a question was refused: the limit it reached, and when that resets. */
export interface Refusal {
  limit: LimitName;
  resetsAt: string;
}

/**
 * Count a question Account `accountId` asks at `now`, unless it is past a
 * limit: then the refusal, and it is not counted. One Account's questions are
 * counted one at a time, so two asked at once cannot both take the last one left.
 */
export async function countQuestion(pool: Pool, accountId: string, now: Date): Promise<Refusal | undefined> {
  const client = await pool.connect();
  let broken: Error | undefined;
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext('asked_question'), hashtext($1))`, [accountId]);
    const limits = await questionLimits(client, accountId, now);
    const reached = limitReached(limits);
    if (reached) {
      await client.query("rollback");
      return { limit: reached, resetsAt: limits[reached].resetsAt };
    }
    await client.query(`insert into asked_question ("userId", asked_at) values ($1, $2)`, [accountId, now]);
    await client.query("commit");
    return undefined;
  } catch (error) {
    // A connection that cannot roll back is not given back to the pool.
    await client.query("rollback").catch((rollbackError: Error) => (broken = rollbackError));
    throw error;
  } finally {
    client.release(broken);
  }
}
