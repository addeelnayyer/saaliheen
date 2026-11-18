// An Account's Known words (#252, ADR 0057): the Roots and particles its
// reader has marked or unmarked, that follow them to every device, kept in the
// Account database's "known_word" table as one row per Root or particle
// (scripts/content/known-word.ts), removed with the Account. A device brings
// its Known words and they merge with the Account's by the one rule of
// @saaliheen/known-words: for each Root or particle the newer markedAt wins,
// and a tie goes to the unmark. The same merge serves a single mark, a device
// that marked offline syncing later, and a device's whole list on first sign-in.

import { entryOf, isKnownWordEntry, mergeKnownWords, type KnownWordEntry } from "@saaliheen/known-words";
import type { PoolClient } from "pg";
import { accountDatabase } from "./database.ts";

/**
 * The Known words a PATCH body brings, `{ "knownWords": [...] }`, or undefined
 * when it is not a JSON object with a list there, or any entry is not a Known
 * words entry.
 */
export function knownWordsBrought(body: unknown): KnownWordEntry[] | undefined {
  const list = (body as { knownWords?: unknown } | null)?.knownWords;
  return Array.isArray(list) && list.every(isKnownWordEntry) ? list.map(entryOf) : undefined;
}

/** The Account `userId`'s Known words, unmarks included, oldest marked first. */
async function readFrom(db: Pick<PoolClient, "query">, userId: string): Promise<KnownWordEntry[]> {
  const { rows } = await db.query<{ kind: KnownWordEntry["kind"]; text: string; known: boolean; marked_at: string }>(
    `select kind, text, known, marked_at from known_word where "userId" = $1`,
    [userId],
  );
  return mergeKnownWords(rows.map(({ kind, text, known, marked_at }) => ({ kind, text, known, markedAt: Number(marked_at) })));
}

/** The Account `userId`'s Known words, unmarks included, oldest marked first. */
export const readKnownWords = (userId: string) => readFrom(accountDatabase(), userId);

/**
 * Merge `brought` into the Account `userId`'s Known words and answer them,
 * oldest marked first. Only the entries the merge changed are written. One
 * Account's Known words are merged one bringing at a time, so two devices
 * bringing them at once both count. Bringing none changes nothing.
 */
export async function bringKnownWords(userId: string, brought: KnownWordEntry[]): Promise<KnownWordEntry[]> {
  if (brought.length === 0) return readKnownWords(userId);
  const client = await accountDatabase().connect();
  let broken: Error | undefined;
  try {
    await client.query("begin");
    await client.query(`select pg_advisory_xact_lock(hashtext('known_word'), hashtext($1))`, [userId]);
    const stored = await readFrom(client, userId);
    const merged = mergeKnownWords(stored, brought);
    const unchanged = new Set(stored.map(rowKey));
    const changed = merged.filter((entry) => !unchanged.has(rowKey(entry)));
    if (changed.length > 0) {
      await client.query(
        `insert into known_word ("userId", kind, text, known, marked_at)
           select $1, * from unnest($2::text[], $3::text[], $4::boolean[], $5::bigint[])
         on conflict ("userId", kind, text) do update set known = excluded.known, marked_at = excluded.marked_at`,
        [userId, changed.map((e) => e.kind), changed.map((e) => e.text), changed.map((e) => e.known), changed.map((e) => e.markedAt)],
      );
    }
    await client.query("commit");
    return merged;
  } catch (error) {
    // A connection that cannot roll back is not given back to the pool.
    await client.query("rollback").catch((rollbackError: Error) => (broken = rollbackError));
    throw error;
  } finally {
    client.release(broken);
  }
}

/** An entry as a row holds it: which Root or particle, whether known and when. */
const rowKey = ({ kind, text, known, markedAt }: KnownWordEntry) => JSON.stringify([kind, text, known, markedAt]);
