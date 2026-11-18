// A Surah's Allah reference revisions, listed to Admins, and undoing one
// (#154, ADR 0044). The list is every revision of the Surah, newest first,
// each naming the Admin's Account or the seed, when it was made, and the Word
// locations it added and removed in Quran order. An undo reverses one Admin's
// revision: every Word location it added stops being an Allah reference and
// every one it removed becomes one again, whatever came between, so a later
// publish's own changes are kept. It is written as a publish is (ADR 0043):
// on the Surah's publish lock, against its current version or refused with the
// latest, in one transaction naming the Admin, as one more revision.

import type { Pool, PoolClient } from "pg";
import { database } from "../database.ts";
import { inSurahTransaction, writeRevision } from "./publish.ts";
import { REVISIONS, SEED_AUTHOR } from "./schema.ts";
import { readStored, type SurahAllahReferences } from "./stored.ts";

/** Who made a revision: the seed the owner ran, or an Admin's Account. */
type RevisionAuthor = { kind: "seed" } | { kind: "admin"; email: string; name: string };

/** One Allah reference revision as the list answers it. */
export interface AllahReferenceRevision {
  version: number;
  base: number;
  createdAt: string;
  author: RevisionAuthor;
  added: string[];
  removed: string[];
}

/** A Surah's Allah reference revisions, newest first, and the version they bring it to (0 before any). */
export interface SurahRevisions {
  version: number;
  revisions: AllahReferenceRevision[];
}

const numbersOf = (location: string) => location.split(":").map(Number);

/** `locations` in Quran order: by Surah, Ayah, then Word, as numbers. */
function inQuranOrder(locations: readonly string[]): string[] {
  return [...locations].sort((a, b) => {
    const [x, y] = [numbersOf(a), numbersOf(b)];
    const at = x.findIndex((n, i) => n !== y[i]);
    return at < 0 ? 0 : x[at] - y[at];
  });
}

/** A revision's row, with its Admin's Account when it names one. */
interface RevisionRow {
  version: number;
  base: number;
  createdAt: Date;
  author: string;
  added: string[];
  removed: string[];
  email: string | null;
  name: string | null;
}

/** Who `row` names as its author. */
const authorOf = (row: RevisionRow): RevisionAuthor =>
  row.author === SEED_AUTHOR ? { kind: "seed" } : { kind: "admin", email: row.email ?? row.author, name: row.name ?? "" };

const revisionOf = (row: RevisionRow): AllahReferenceRevision => ({
  version: Number(row.version),
  base: Number(row.base),
  createdAt: new Date(row.createdAt).toISOString(),
  author: authorOf(row),
  added: inQuranOrder(row.added),
  removed: inQuranOrder(row.removed),
});

const SELECT_REVISIONS = `select r.version, r.base, r."createdAt", r.author, r.added, r.removed, u.email, u.name
  from "${REVISIONS}" r left join "user" u on u.id = r.author
  where r.surah = $1`;

/** Surah `surah`'s Allah reference revisions, newest first. */
export async function listRevisions(surah: number, pool: Pool = database()): Promise<SurahRevisions> {
  const { rows } = await pool.query<RevisionRow>(`${SELECT_REVISIONS} order by r.version desc`, [surah]);
  const revisions = rows.map(revisionOf);
  return { version: revisions[0]?.version ?? 0, revisions };
}

/** How an undo ended: the Surah's Allah references after it, the latest when its base is no longer the Surah's version, no such revision, or why it was refused. */
export type UndoOutcome =
  | { kind: "undone"; references: SurahAllahReferences }
  | { kind: "stale"; latest: SurahAllahReferences }
  | { kind: "missing" }
  | { kind: "refused"; error: string };

const SEED_UNDO_ERROR = "the seed's revision cannot be undone: only an Admin's publish or undo can";
const NOTHING_TO_UNDO_ERROR = "nothing to undo: later revisions already turned back every Word this revision changed";

/** The Word locations `now` holds once `revision`'s changes are turned back. */
function reversed(now: readonly string[], revision: Pick<AllahReferenceRevision, "added" | "removed">): Set<string> {
  const after = new Set(now);
  for (const location of revision.added) after.delete(location);
  for (const location of revision.removed) after.add(location);
  return after;
}

/** Whether `after` holds exactly the Word locations of `now`. */
const unchanged = (now: readonly string[], after: Set<string>) => now.length === after.size && now.every((location) => after.has(location));

/** Within a transaction holding Surah `surah`'s lock: its revision at `version`, or undefined when it has none. */
async function revisionAt(client: PoolClient, surah: number, version: number): Promise<RevisionRow | undefined> {
  const { rows } = await client.query<RevisionRow>(`${SELECT_REVISIONS} and r.version = $2`, [surah, version]);
  return rows[0];
}

/** Within `client`'s transaction, holding Surah `surah`'s lock: the undo written if `base` is still its version. */
async function undoWithin(client: PoolClient, surah: number, version: number, base: number, author: string): Promise<UndoOutcome> {
  const now = await readStored(client, surah);
  if (now.version !== base) return { kind: "stale", latest: now };
  const revision = await revisionAt(client, surah, version);
  if (!revision) return { kind: "missing" };
  if (revision.author === SEED_AUTHOR) return { kind: "refused", error: SEED_UNDO_ERROR };
  const after = reversed(now.locations, revision);
  if (unchanged(now.locations, after)) return { kind: "refused", error: NOTHING_TO_UNDO_ERROR };
  await writeRevision(client, surah, now.locations, after, author, base);
  return { kind: "undone", references: await readStored(client, surah) };
}

/**
 * Undo Surah `surah`'s revision at `version` as the Admin `author` (their
 * Account id), against the version `base` they saw: the reversal and its
 * revision in one transaction, or nothing.
 */
export function undoRevision(surah: number, version: number, base: number, author: string, pool: Pool = database()): Promise<UndoOutcome> {
  return inSurahTransaction(pool, surah, author, "undone", (client) => undoWithin(client, surah, version, base, author));
}
