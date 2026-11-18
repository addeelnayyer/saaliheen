// A Surah's Passage revisions, listed to Admins, and undoing one (#174, ADR
// 0049). The list is every revision of the Surah, newest first, each naming
// the Admin's Account or the seed, when it was made, the edits it sent, the
// version it was made on and the one it made, the version it undoes when it
// is an undo, and the Passage and Phrase rows it changed. An undo puts back
// the rows one Admin's revision changed, as ./revision-rules.ts decides,
// checked against the Surah's Tafsir entries and refused when they can't be
// read (#235), and is written as a Publish is (./publish.ts): on the Surah's
// Passage lock, against its current Passage version or refused with the
// latest, in one transaction naming the Admin, as one more revision with its
// own changes and the Surah's new content hash. What a commit makes readers
// see is the caller's: ./refresh.ts.

import type { Pool, PoolClient } from "pg";
import type { Edit } from "../admin/passage-edits.ts";
import { SEED_AUTHOR } from "../allah-references/schema.ts";
import { getSurahNow } from "../dataset/reader.ts";
import { database } from "../database.ts";
import { inTransaction, lockPassages, readSurah, tafsirToCheck, writeMarks, type PublishedSurah } from "./publish.ts";
import { undone, type RevisionChanges } from "./revision-rules.ts";

/** Who made a revision: the seed the load wrote, or an Admin's Account. */
type RevisionAuthor = { kind: "seed" } | { kind: "admin"; email: string; name: string };

/** One Passage revision as the list answers it. */
export interface PassageRevision {
  version: number;
  base: number;
  createdAt: string;
  author: RevisionAuthor;
  /** The Passage and Phrase edits its Publish sent, in order; none for an undo or the seed. */
  edits: Edit[];
  /** The version it turned back, when it is an undo. */
  undoes: number | null;
  /** The rows it changed; null when they were not recorded, as for the seed. */
  changes: RevisionChanges | null;
}

/** A Surah's Passage revisions, newest first, and the Passage version they bring it to. */
export interface SurahPassageRevisions {
  version: number;
  revisions: PassageRevision[];
}

/** A revision's row, with its Admin's Account when it names one. */
interface RevisionRow {
  version: number;
  base: number;
  createdAt: Date;
  author: string;
  edits: Edit[];
  undoes: number | null;
  changes: RevisionChanges | null;
  email: string | null;
  name: string | null;
}

/** Who `row` names as its author. */
const authorOf = (row: RevisionRow): RevisionAuthor =>
  row.author === SEED_AUTHOR ? { kind: "seed" } : { kind: "admin", email: row.email ?? row.author, name: row.name ?? "" };

const revisionOf = (row: RevisionRow): PassageRevision => ({
  version: Number(row.version),
  base: Number(row.base),
  createdAt: new Date(row.createdAt).toISOString(),
  author: authorOf(row),
  edits: row.edits,
  undoes: row.undoes === null ? null : Number(row.undoes),
  changes: row.changes,
});

const SELECT_REVISIONS = `select r.version, r.base, r.created_at as "createdAt", r.author, r.edits, r.undoes, r.changes, u.email, u.name
  from passage_revision r left join "user" u on u.id = r.author
  where r.surah = $1`;

/** Surah `surah`'s Passage revisions, newest first. */
export async function listPassageRevisions(surah: number, pool: Pool = database()): Promise<SurahPassageRevisions> {
  const { rows } = await pool.query<RevisionRow>(`${SELECT_REVISIONS} order by r.version desc`, [surah]);
  const revisions = rows.map(revisionOf);
  return { version: revisions[0]?.version ?? 0, revisions };
}

/**
 * How an undo ended: the Surah after it; the latest when its base is no
 * longer the Surah's version, or when a later revision clashes with it, and
 * why; no such revision; or why it was refused.
 */
export type PassageUndoOutcome =
  | { kind: "undone"; surah: PublishedSurah }
  | { kind: "stale"; latest: PublishedSurah }
  | { kind: "clash"; error: string; latest: PublishedSurah }
  | { kind: "missing" }
  | { kind: "refused"; error: string };

const SEED_UNDO_ERROR = "the seed's revision cannot be undone: only an Admin's Publish or undo can";
const UNRECORDED_ERROR = "this revision's changed rows were not recorded, so it cannot be undone";
const NOTHING_ERROR = "nothing to undo: this revision changed no Passage or Phrase";

/** Within a transaction holding Surah `surah`'s lock: its revision at `version`, or undefined when it has none. */
async function revisionAt(client: PoolClient, surah: number, version: number): Promise<PassageRevision | undefined> {
  const { rows } = await client.query<RevisionRow>(`${SELECT_REVISIONS} and r.version = $2`, [surah, version]);
  return rows[0] && revisionOf(rows[0]);
}

/** Why `revision` can't be undone at all; undefined when it can be tried. */
function refusalOf({ author, changes }: PassageRevision): string | undefined {
  if (author.kind === "seed") return SEED_UNDO_ERROR;
  if (!changes) return UNRECORDED_ERROR;
  return changes.passages.length + changes.phrases.length ? undefined : NOTHING_ERROR;
}

/** Within `client`'s transaction: take Surah `surah`'s Passage lock, then write the undo of `version` by `author` if `base` is still its version and nothing clashes. */
async function undoWithin(client: PoolClient, surah: number, version: number, base: number, author: string): Promise<PassageUndoOutcome> {
  await lockPassages(client, surah);
  const now = await readSurah(client, surah);
  if (now.version !== base) return { kind: "stale", latest: now };
  const revision = await revisionAt(client, surah, version);
  if (!revision) return { kind: "missing" };
  const error = refusalOf(revision);
  if (error) return { kind: "refused", error };
  const tafsir = await tafsirToCheck(client, surah, "undone");
  if ("refusal" in tafsir) return { kind: "refused", error: tafsir.refusal };
  const loaded = (await getSurahNow(surah))!;
  const after = undone(loaded, now, revision.changes!, tafsir);
  if ("clash" in after) return { kind: "clash", error: after.clash, latest: now };
  await writeMarks(client, loaded, now, after, { edits: [], undoes: version }, author);
  return { kind: "undone", surah: await readSurah(client, surah) };
}

/**
 * Undo Surah `surah`'s Passage revision at `version` as the Admin `author`
 * (their Account id), against the Passage version `base` they saw: the rows
 * put back and the revision recording it in one transaction, or nothing.
 * Throws when the database refuses a write, having written nothing.
 */
export function undoPassageRevision(surah: number, version: number, base: number, author: string, pool: Pool = database()): Promise<PassageUndoOutcome> {
  return inTransaction(pool, author, "undone", (client) => undoWithin(client, surah, version, base, author));
}
