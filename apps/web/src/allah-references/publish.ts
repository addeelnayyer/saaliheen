// An Admin's publish of one Surah's Allah reference changes (#153, ADR 0043):
// the Word locations tapped, in order (ADR 0035), replayed on the Surah's
// Allah references at `base`, the version they were made on. A publish that
// passes writes every Word location it added and removed and one Allah
// reference revision (ADR 0014). Since #171 it is written inside the one
// Publish transaction of src/passages/publish.ts, beside the Surah's Passage
// and Phrase edits, which takes this module's lock and names the Admin as the
// content audit's actor (ADR 0038); a refusal writes nothing. Both
// POST /api/v1/passages/{surah} and POST /api/v1/allah-references/{surah}
// publish through it. An undo (#154) writes its revision through the same
// writeRevision, in a transaction of its own on the same lock.

import type { Pool, PoolClient } from "pg";
import { allahReferencesAfter } from "../admin/allah-reference-edits.ts";
import { setAuditActor } from "../content-audit.ts";
import { isWordLocation, type WordCounts } from "./locations.ts";
import { REFERENCES, REVISIONS } from "./schema.ts";
import type { SurahAllahReferences } from "./stored.ts";

/** What the Passage editor sends: the version the changes were made on, and the Word locations tapped, in order. */
export interface AllahReferencePublish {
  base: number;
  changes: string[];
}

export const STALE_ERROR = "Someone published first: these are the latest Allah references, and your changes were not written.";

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export const isVersion = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === "string");

/** `body` as a publish, or undefined when it is not one: a JSON object of a whole-number `base` and a list of texts, `changes`. */
export function allahReferencePublishOf(body: unknown): AllahReferencePublish | undefined {
  if (!isRecord(body) || !isVersion(body.base) || !isTextList(body.changes)) return undefined;
  return { base: body.base, changes: body.changes };
}

/** Whether `location` is a Word of Surah `surah` in the Quran text. */
const isWordOf = (surah: number, wordCounts: WordCounts) => (location: string) =>
  location.startsWith(`${surah}:`) && isWordLocation(location, wordCounts);

/** Why `changes` cannot be published to Surah `surah`: the changes that are not its Words; undefined when every one is. */
export function changesRefusal(surah: number, changes: string[], wordCounts: WordCounts): string | undefined {
  const isWord = isWordOf(surah, wordCounts);
  const bad = changes.filter((location) => !isWord(location));
  return bad.length ? `not Words of Surah ${surah} in the Quran text, so nothing was published: ${bad.join(", ")}` : undefined;
}

/** The key of the advisory locks Allah reference publishes take, one per Surah (ADR 0043). */
export const ALLAH_REFERENCE_LOCK = 153;

/** The Word locations of `a` that `b` lacks. */
const without = (a: Iterable<string>, b: Set<string>) => [...a].filter((location) => !b.has(location));

/** Write Surah `surah`'s change from `before` to `after` and its revision by `author`, made on version `base`. */
export async function writeRevision(client: PoolClient, surah: number, before: string[], after: Set<string>, author: string, base: number) {
  const added = without(after, new Set(before));
  const removed = without(before, after);
  if (removed.length) await client.query(`delete from "${REFERENCES}" where location = any($1::text[])`, [removed]);
  if (added.length) {
    await client.query(
      `insert into "${REFERENCES}" (id, location, surah) select gen_random_uuid()::text, l, $2 from unnest($1::text[]) as l`,
      [added, surah],
    );
  }
  await client.query(
    `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
     values (gen_random_uuid()::text, $1, $2, now(), $3::jsonb, $4::jsonb, $5, $6)`,
    [surah, author, JSON.stringify(added), JSON.stringify(removed), base, base + 1],
  );
}

/**
 * Within `client`'s transaction, holding the Surah's lock, with `now` its
 * Allah references at `publish.base`: write `publish`'s changes to Surah
 * `surah` and their revision by `author`, at the next version.
 */
export async function writeAllahReferences(client: PoolClient, surah: number, now: SurahAllahReferences, publish: AllahReferencePublish, author: string) {
  await writeRevision(client, surah, now.locations, allahReferencesAfter(now.locations, publish.changes), author, publish.base);
}

/**
 * Run `work` in one transaction that names the Admin `author` as the content
 * audit's actor and holds Surah `surah`'s Allah reference lock: committed when
 * it ends as `kept`, else rolled back, so a refusal writes nothing. An undo
 * (#154) writes this way; a publish writes in the Passage Publish's own
 * transaction (src/passages/publish.ts), which takes the same lock.
 */
export async function inSurahTransaction<T extends { kind: string }>(
  pool: Pool,
  surah: number,
  author: string,
  kept: T["kind"],
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, author);
    await client.query("select pg_advisory_xact_lock($1, $2)", [ALLAH_REFERENCE_LOCK, surah]);
    const outcome = await work(client);
    await client.query(outcome.kind === kept ? "commit" : "rollback");
    return outcome;
  } catch (failure) {
    await client.query("rollback").catch(() => {});
    throw failure;
  } finally {
    client.release();
  }
}
