// An Admin's one Publish of a Surah (#171, ADR 0047): its Passage and Phrase
// edits and its Allah reference changes (#153), written in one transaction or
// not at all. Holding the Surah's Passage lock and then its Allah reference
// lock (always in that order, so two Publishes never wait on each other), it
// reads the Surah's rows as Neon holds them, refuses a Publish made on a
// version that is no longer the Surah's as a clash with the latest, replays the
// edits through the editor's own rules (./publish-rules.ts), their Passages
// checked against the Surah's Tafsir entries as Neon holds them (#235) and
// refused, writing nothing, when those cannot be read, and writes only
// the rows that changed, one Passage revision by the Admin with those rows
// (none when no Passage or Phrase edit comes), the Allah references and their
// revision (src/allah-references/publish.ts), and the Surah's new content hash, the
// SHA-256 of the Surah file /data/v1 then serves (ADR 0020). The content
// audit names the Admin's Account as actor (ADR 0038). What a commit makes
// readers see is the caller's: ./refresh.ts.

import type { Pool, PoolClient } from "pg";
import type { Phrase, Surah } from "@saaliheen/dataset/types";
import type { Passage, TafsirRanges } from "@saaliheen/passages";
import type { Edit, Marked } from "../admin/passage-edits.ts";
import { ALLAH_REFERENCE_LOCK, changesRefusal, writeAllahReferences } from "../allah-references/publish.ts";
import { readStored, type SurahAllahReferences } from "../allah-references/stored.ts";
import { setAuditActor } from "../content-audit.ts";
import { getSurahNow } from "../dataset/reader.ts";
import { database } from "../database.ts";
import { publishedMarks, rowChanges, type SurahPublish } from "./publish-rules.ts";
import { storeContentHash } from "./passages.ts";
import { revisionChanges } from "./revision-rules.ts";
import { servedSurahHash } from "./served-surah.ts";
import { readTafsirRanges } from "../tafsir/tafsir.ts";

/** The key of the advisory locks Passage Publishes and undos take, one per Surah, taken before ADR 0043's. */
const PASSAGE_LOCK = 171;

/** A Surah as a Publish answers it: its Passage version, Passages and Phrases in reading order, and its Allah references. */
export interface PublishedSurah extends Marked {
  version: number;
  allahReferences: SurahAllahReferences;
}

/** How a Publish ended: written, and what it wrote; a clash, with the Surah's latest; or refused, and why. */
export type SurahPublishOutcome =
  | { kind: "published"; surah: PublishedSurah; wrote: { passages: boolean; allahReferences: boolean } }
  | { kind: "stale"; latest: PublishedSurah }
  | { kind: "refused"; error: string };

/** Surah `surah`'s Passage version, Passages and Phrases, in reading order, as `client` sees them. */
async function readMarks(client: PoolClient, surah: number): Promise<{ version: number } & Marked> {
  const { rows } = await client.query<{ version: number; passages: Passage[]; phrases: Phrase[] }>(
    `select (select coalesce(max(version), 0)::int from passage_revision where surah = $1) as version,
            coalesce((select json_agg(json_build_object('from', ayah_from, 'till', ayah_till, 'en', title_en, 'ur', title_ur) order by ayah_from)
                      from passage where surah = $1), '[]') as passages,
            coalesce((select json_agg(json_build_object('first', first_word, 'last', last_word)
                      order by split_part(first_word, ':', 2)::int, split_part(first_word, ':', 3)::int)
                      from phrase where surah = $1), '[]') as phrases`,
    [surah],
  );
  return rows[0];
}

/** Surah `surah` as a Publish answers it, read through `client`. */
export async function readSurah(client: PoolClient, surah: number): Promise<PublishedSurah> {
  const marks = await readMarks(client, surah);
  return { ...marks, allahReferences: await readStored(client, surah) };
}

/**
 * Surah `surah` (1..114) as Neon holds it now, read on every call, never
 * cached: the Passage version, Passages and Phrases and the Allah references
 * the Passage editor edits and a Publish is made on.
 */
export async function latestSurah(surah: number, pool: Pool = database()): Promise<PublishedSurah> {
  const client = await pool.connect();
  try {
    return await readSurah(client, surah);
  } finally {
    client.release();
  }
}

/** Whether `publish` was made on versions Surah `now` is no longer at. */
const isStale = (now: PublishedSurah, publish: SurahPublish) =>
  (publish.passages !== undefined && publish.passages.base !== now.version) ||
  (publish.allahReferences !== undefined && publish.allahReferences.base !== now.allahReferences.version);

/** Write the Passage rows that differ from `before` to `after`. */
async function writePassages(client: PoolClient, surah: number, before: Passage[], after: Passage[]) {
  const { deleted, inserted, updated } = rowChanges(before, after, (p) => p.from);
  await client.query(`delete from passage where surah = $1 and ayah_from = any($2::smallint[])`, [surah, deleted.map((p) => p.from)]);
  await client.query(
    `update passage set ayah_till = r.till, title_en = r.en, title_ur = r.ur
     from json_to_recordset($2::json) as r("from" smallint, till smallint, en text, ur text)
     where passage.surah = $1 and passage.ayah_from = r."from"`,
    [surah, JSON.stringify(updated)],
  );
  await client.query(
    `insert into passage (surah, ayah_from, ayah_till, title_en, title_ur)
     select $1, r."from", r.till, r.en, r.ur from json_to_recordset($2::json) as r("from" smallint, till smallint, en text, ur text)`,
    [surah, JSON.stringify(inserted)],
  );
}

/** Write the Phrase rows that differ from `before` to `after`. */
async function writePhrases(client: PoolClient, surah: number, before: Phrase[], after: Phrase[]) {
  const { deleted, inserted, updated } = rowChanges(before, after, (p) => p.first);
  await client.query(`delete from phrase where first_word = any($1::text[])`, [deleted.map((p) => p.first)]);
  await client.query(
    `update phrase set last_word = r.last from json_to_recordset($1::json) as r(first text, last text) where phrase.first_word = r.first`,
    [JSON.stringify(updated)],
  );
  await client.query(`insert into phrase (surah, first_word, last_word) select $1, r.first, r.last from json_to_recordset($2::json) as r(first text, last text)`, [
    surah,
    JSON.stringify(inserted),
  ]);
}

/** Each Ayah's Themes of Surah `surah`, Ayah 1 first, as `client` sees them. */
async function surahThemes(client: PoolClient, surah: number): Promise<string[][]> {
  const { rows } = await client.query<{ ayah: number; theme: string }>(`select ayah, theme from ayah_theme where surah = $1 order by ayah, position`, [surah]);
  const themes: string[][] = [];
  for (const { ayah, theme } of rows) (themes[ayah - 1] ??= []).push(theme);
  return themes;
}

/** Store the content hash of `surah`'s file as /data/v1 serves it with `marks`. */
async function storeMarkedHash(client: PoolClient, surah: Surah, marks: Marked) {
  await storeContentHash(client, surah.number, servedSurahHash(surah, marks.passages, marks.phrases, await surahThemes(client, surah.number)));
}

/** A Passage revision as it is written: the edits it made, none for an undo, and the version an undo undoes. */
export interface RevisionWritten {
  edits: Edit[];
  undoes?: number;
}

/**
 * Write `surah`'s Passages and Phrases from `now` to `after`, the Passage
 * revision `revision` by `author` on `now.version` with the rows it changed
 * (ADR 0049), and its new content hash.
 */
export async function writeMarks(client: PoolClient, surah: Surah, now: { version: number } & Marked, after: Marked, revision: RevisionWritten, author: string) {
  await writePassages(client, surah.number, now.passages, after.passages);
  await writePhrases(client, surah.number, now.phrases, after.phrases);
  await client.query(
    `insert into passage_revision (surah, author, edits, base, version, changes, undoes) values ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7)`,
    [surah.number, author, JSON.stringify(revision.edits), now.version, now.version + 1, JSON.stringify(revisionChanges(now, after)), revision.undoes ?? null],
  );
  await storeMarkedHash(client, surah, after);
}

/**
 * Surah `surah`'s Tafsir entry ranges, read through `client` to check its
 * Passages against; or, when they can't be read, why the Publish or undo is
 * refused, nothing having been `done`.
 */
export async function tafsirToCheck(client: PoolClient, surah: number, done: "published" | "undone"): Promise<TafsirRanges | { refusal: string }> {
  return readTafsirRanges(client, surah).catch((e: Error) => ({
    refusal: `the Tafsir couldn't be read from the database (${e.message}), so the Passages couldn't be checked against its entries and nothing was ${done}: try again`,
  }));
}

/**
 * `publish`'s Passage and Phrase edits replayed on `now`, their Passages
 * checked against Surah `surah`'s Tafsir entries read through `client`: what
 * they leave, none when it carries none, or why they are refused.
 */
async function marksAfter(client: PoolClient, surah: Surah, now: PublishedSurah, publish: SurahPublish): Promise<Marked | { refusal: string } | undefined> {
  const edits = publish.passages?.edits ?? [];
  if (!edits.length) return undefined;
  const tafsir = await tafsirToCheck(client, surah.number, "published");
  return "refusal" in tafsir ? tafsir : publishedMarks(surah, now, edits, tafsir);
}

/** Within `client`'s transaction: wait for Surah `surah`'s Passage lock, so no other Publish or undo writes its Passages until it ends. */
export const lockPassages = (client: PoolClient, surah: number) => client.query("select pg_advisory_xact_lock($1, $2)", [PASSAGE_LOCK, surah]);

/** Within `client`'s transaction: take Surah `surah`'s locks, then write `publish` by `author` if it is made on the latest and keeps every rule. */
async function publishWithin(client: PoolClient, surah: Surah, publish: SurahPublish, author: string): Promise<SurahPublishOutcome> {
  await lockPassages(client, surah.number);
  await client.query("select pg_advisory_xact_lock($1, $2)", [ALLAH_REFERENCE_LOCK, surah.number]);
  const now = await readSurah(client, surah.number);
  if (isStale(now, publish)) return { kind: "stale", latest: now };
  const after = await marksAfter(client, surah, now, publish);
  if (after && "refusal" in after) return { kind: "refused", error: after.refusal };
  if (after) await writeMarks(client, surah, now, after, { edits: publish.passages!.edits }, author);
  if (publish.allahReferences) await writeAllahReferences(client, surah.number, now.allahReferences, publish.allahReferences, author);
  const wrote = { passages: after !== undefined, allahReferences: publish.allahReferences !== undefined };
  return { kind: "published", surah: await readSurah(client, surah.number), wrote };
}

/** `work` in one transaction on `pool` naming `author` as the content audit's actor: committed when it ends as `kept`, else rolled back. */
export async function inTransaction<T extends { kind: string }>(pool: Pool, author: string, kept: T["kind"], work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, author);
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

/** Why `publish`'s Allah reference changes cannot be published to Surah `quran`; undefined when it has none, or each is a Word of it. */
function allahRefusal(quran: Surah, publish: SurahPublish) {
  if (!publish.allahReferences) return undefined;
  const counts = quran.ayahs.map((a) => a.words.length);
  return changesRefusal(quran.number, publish.allahReferences.changes, (n) => (n === quran.number ? counts : undefined));
}

/**
 * Publish `publish` to Surah `surah` (1..114) as the Admin `author` (their
 * Account id): every change and its revisions in one transaction, or none.
 * Throws when the database refuses a write, having written nothing.
 */
export async function publishSurah(surah: number, publish: SurahPublish, author: string, pool: Pool = database()): Promise<SurahPublishOutcome> {
  const quran = (await getSurahNow(surah))!;
  const error = allahRefusal(quran, publish);
  if (error) return { kind: "refused", error };
  return inTransaction(pool, author, "published", (client) => publishWithin(client, quran, publish, author));
}
