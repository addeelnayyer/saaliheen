// An Admin's correction, add or delete of one Supplication in the Supplication
// editor (#201, #202, #196, ADR 0027, after ADR 0023's Iltifat save): its
// whole editable state (Surah, run, Speaker, Openings, kind, and its spans,
// #270, ADR 0063), against the
// version it was made from but for an add, checked, then written with its
// Supplication revision in one transaction. An add's revision has no before
// and a delete's no after, and outlives the Supplication. A refusal changes no
// row. PUT and DELETE /api/v1/supplications/{id} and POST /api/v1/supplications
// answer with what this returns.

import type { Pool, PoolClient } from "pg";
import { written } from "@saaliheen/passages";
import { inAdminSave, type SavingAdmin } from "../content-audit.ts";
import { database } from "../database.ts";
import { partsOf, type WordCount } from "../word-locations.ts";
import { distinctSpans, spansOf, spansRefusal, type SupplicationSpan } from "./spans.ts";
import {
  COLUMNS,
  isSupplication,
  OPENINGS,
  SUPPLICATION_KINDS,
  withSpans,
  type Opening,
  type Supplication,
  type SupplicationKind,
  type SupplicationRow,
} from "./supplications.ts";

/** What the Supplication editor sends to add a Supplication: its editable state. */
export interface SupplicationFields {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  /** As sent: a save naming no Opening, or one that is none, is refused. */
  openings: string[];
  /** As sent: a save naming no kind is refused. */
  kind: string;
  /** As sent, each once and in reading order, in place of the spans it had: each is checked. */
  spans: SupplicationSpan[];
}

/** What the Supplication editor sends to save a Supplication: its editable state and `base`, the version it was made against. */
export interface SupplicationSave extends SupplicationFields {
  base: number;
}

/** How a save, add or delete ended; a delete that passes holds the Supplication deleted. */
export type SaveOutcome =
  | { kind: "saved"; supplication: Supplication }
  | { kind: "not-found" }
  | { kind: "stale"; supplication: Supplication }
  | { kind: "refused"; error: string };

export const STALE_ERROR = "This Supplication has been saved since you opened it. The latest is shown beside your choices.";

/** What a save's checks read of the Quran text: each Surah's Ayah count (0 for no Surah), its name, and each Ayah's Word count. */
export interface QuranShape {
  ayahCount: (surah: number) => number;
  surahName: (surah: number) => string;
  wordCount: WordCount;
}

const isText = (v: unknown) => typeof v === "string";
const isTextList = (v: unknown) => Array.isArray(v) && v.every(isText);

/** Each field of an add, with the test its value must pass. */
const FIELDS: Record<keyof SupplicationFields, (value: unknown) => boolean> = {
  surah: Number.isInteger,
  ayahFrom: Number.isInteger,
  ayahTo: Number.isInteger,
  speakerId: isText,
  openings: isTextList,
  kind: isText,
  spans: (v) => spansOf(v) !== undefined,
};

/** Whether `v` is a JSON object, as a request's body must be. */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** `body` as an add, or undefined when it is not one: a JSON object of the seven fields, each of its type. */
export function supplicationFieldsOf(body: unknown): SupplicationFields | undefined {
  if (!isRecord(body) || !Object.entries(FIELDS).every(([field, passes]) => passes(body[field]))) return undefined;
  const { surah, ayahFrom, ayahTo, speakerId, openings, kind } = body as unknown as SupplicationFields;
  return { surah, ayahFrom, ayahTo, speakerId, openings, kind, spans: distinctSpans(spansOf(body.spans)!) };
}

/** `body`'s `base`, or undefined when it is no JSON object with a whole number `base`: what a delete sends. */
export const baseOf = (body: unknown): number | undefined => (isRecord(body) && Number.isInteger(body.base) ? (body.base as number) : undefined);

/** `body` as a save, or undefined when it is not one: an add's seven fields and `base`. */
export function supplicationSaveOf(body: unknown): SupplicationSave | undefined {
  const fields = supplicationFieldsOf(body);
  const base = baseOf(body);
  return fields && base !== undefined ? { ...fields, base } : undefined;
}

/** One check of a save or add against the Quran text: its refusal, or undefined when it passes. */
type Check = (save: SupplicationFields, quran: QuranShape) => string | undefined;

/** The checks that read no row, in the order a refusal names the first that fails. */
const CHECKS: Check[] = [
  ({ surah }, quran) => (quran.ayahCount(surah) === 0 ? `There is no Surah ${surah}: Surahs run from 1 to 114.` : undefined),
  ({ surah, ayahFrom, ayahTo }, quran) => {
    const ayahCount = quran.ayahCount(surah);
    return ayahFrom < 1 || ayahTo > ayahCount ? `The run must lie within Surah ${surah}, Ayahs 1 to ${ayahCount}.` : undefined;
  },
  ({ ayahFrom, ayahTo }) => (ayahFrom > ayahTo ? "The run must start at or before the Ayah it ends at." : undefined),
  ({ openings }) => (openings.length === 0 ? "A Supplication needs at least one Opening." : undefined),
  ({ openings }) => {
    const unknown = openings.find((o) => !(OPENINGS as readonly string[]).includes(o));
    return unknown === undefined ? undefined : `"${unknown}" is no Opening: choose Rabbana, Rabbi or Other.`;
  },
  ({ kind }) =>
    (SUPPLICATION_KINDS as readonly string[]).includes(kind) ? undefined : `"${kind}" is no kind: choose Supplication or one of the Other words to Allah.`,
];

/** The Supplication with id `id`, with its spans, or undefined. */
async function supplicationById(client: PoolClient, id: number): Promise<Supplication | undefined> {
  const { rows } = await client.query<SupplicationRow>(`select ${COLUMNS} from supplication where id = $1`, [id]);
  return (await withSpans(client, rows))[0];
}

/**
 * Why `save` of Supplication `id` (0 for an add) is refused: a check, an
 * unknown Speaker, an Ayah in another Supplication, or, last, a wrong span.
 */
async function refusal(client: PoolClient, id: number, save: SupplicationFields, quran: QuranShape): Promise<string | undefined> {
  const checked = CHECKS.map((check) => check(save, quran)).find((e) => e !== undefined);
  if (checked) return checked;
  const speaker = await client.query(`select 1 from supplication_speaker where id = $1`, [save.speakerId]);
  if (speaker.rowCount === 0) return `No Speaker has the id "${save.speakerId}". Choose one of the Speakers.`;
  const { rows } = await client.query<SupplicationRow>(
    `select ${COLUMNS} from supplication where id <> $1 and surah = $2 and ayah_from <= $4 and ayah_to >= $3
      order by ayah_from limit 1`,
    [id, save.surah, save.ayahFrom, save.ayahTo],
  );
  const other = rows[0];
  if (!other) return spansRefusal(save.spans, save, quran.wordCount);
  const shared = Math.max(other.ayahFrom, save.ayahFrom);
  const named = `${quran.surahName(other.surah)} ${other.surah}:${written({ from: other.ayahFrom, till: other.ayahTo })}`;
  const what = isSupplication(other) ? "the Supplication" : "the Other words to Allah";
  return `Ayah ${save.surah}:${shared} is already in ${what} at ${named}. Take it out of that one first.`;
}

/** `openings` once each, in the order Openings are written. */
const inOrder = (openings: string[]) => OPENINGS.filter((o) => openings.includes(o));

/** The values of `save`'s columns, from `surah` on, as the queries below write them. */
const columnValues = (save: SupplicationFields) => [save.surah, save.ayahFrom, save.ayahTo, save.speakerId, inOrder(save.openings) satisfies Opening[], save.kind as SupplicationKind];

/** In place of the spans Supplication `id` had: `kept`, each once, in reading order. */
async function replaceSpans(client: PoolClient, id: number, kept: SupplicationSpan[]): Promise<void> {
  await client.query(`delete from supplication_span where supplication_id = $1`, [id]);
  if (kept.length > 0) {
    const ends = kept.map(({ from, to }) => [...partsOf(from)!.slice(1), ...partsOf(to)!.slice(1)]);
    await client.query(
      `insert into supplication_span (supplication_id, from_ayah, from_word, to_ayah, to_word)
        select $1, * from unnest($2::integer[], $3::integer[], $4::integer[], $5::integer[])`,
      [id, ...[0, 1, 2, 3].map((i) => ends.map((e) => e[i]))],
    );
  }
}

/** The Supplication revision by `author` of Supplication `id` from version `base`, `before` and `after` (null for none). */
async function revise(client: PoolClient, id: number, author: string, base: number, before: Supplication | null, after: Supplication | null) {
  await client.query(
    `insert into supplication_revision (supplication_id, author, base, version, before, after) values ($1, $2, $3, $4, $5, $6)`,
    [id, author, base, base + 1, before && JSON.stringify(before), after && JSON.stringify(after)],
  );
}

/** One save at a time, so that two saves can't each find the other's Ayahs free, nor both save one version; readers aren't held up. */
const oneSaveAtATime = (client: PoolClient) => client.query(`lock table supplication in share row exclusive mode`);

/** Within `client`'s transaction: Supplication `id`, found at version `base`, or why not. */
async function found(client: PoolClient, id: number, base: number): Promise<{ kind: "found"; supplication: Supplication } | Exclude<SaveOutcome, { kind: "saved" | "refused" }>> {
  await oneSaveAtATime(client);
  const supplication = await supplicationById(client, id);
  if (!supplication) return { kind: "not-found" };
  return { kind: supplication.version === base ? "found" : "stale", supplication };
}

/** Within `client`'s transaction: `save` of Supplication `id` checked, and written if it passes. */
async function saveWithin(client: PoolClient, id: number, save: SupplicationSave, author: string, quran: QuranShape): Promise<SaveOutcome> {
  const opened = await found(client, id, save.base);
  if (opened.kind !== "found") return opened;
  const error = await refusal(client, id, save, quran);
  if (error) return { kind: "refused", error };
  const { rows } = await client.query<SupplicationRow>(
    `update supplication set surah = $3, ayah_from = $4, ayah_to = $5, speaker_id = $6, openings = $7, kind = $8, version = version + 1
      where id = $1 and version = $2 returning ${COLUMNS}`,
    [id, save.base, ...columnValues(save)],
  );
  await replaceSpans(client, id, save.spans);
  const saved = { ...rows[0], spans: save.spans };
  await revise(client, id, author, save.base, opened.supplication, saved);
  return { kind: "saved", supplication: saved };
}

/** Within `client`'s transaction: `add` checked, and written at version 1 if it passes. */
async function addWithin(client: PoolClient, add: SupplicationFields, author: string, quran: QuranShape): Promise<SaveOutcome> {
  await oneSaveAtATime(client);
  const error = await refusal(client, 0, add, quran);
  if (error) return { kind: "refused", error };
  const { rows } = await client.query<SupplicationRow>(
    `insert into supplication (surah, ayah_from, ayah_to, speaker_id, openings, kind) values ($1, $2, $3, $4, $5, $6) returning ${COLUMNS}`,
    columnValues(add),
  );
  await replaceSpans(client, rows[0].id, add.spans);
  const added = { ...rows[0], spans: add.spans };
  await revise(client, added.id, author, 0, null, added);
  return { kind: "saved", supplication: added };
}

/** Within `client`'s transaction: Supplication `id` deleted, its spans with it, if it is still at version `base`. */
async function deleteWithin(client: PoolClient, id: number, base: number, author: string): Promise<SaveOutcome> {
  const opened = await found(client, id, base);
  if (opened.kind !== "found") return opened;
  await client.query(`delete from supplication where id = $1`, [id]);
  await revise(client, id, author, base, opened.supplication, null);
  return { kind: "saved", supplication: opened.supplication };
}

/**
 * Save `save` of Supplication `id` as `admin`: the row and its Supplication
 * revision in one transaction, or neither, audited under the Admin's Account
 * id. `quran` gives the Surah lengths and names its checks read.
 */
export async function saveSupplication(
  id: number,
  save: SupplicationSave,
  admin: SavingAdmin,
  quran: QuranShape,
  pool: Pool = database(),
): Promise<SaveOutcome> {
  return inAdminSave(pool, admin, (client) => saveWithin(client, id, save, admin.email, quran));
}

/** Add `add` as `admin`, at version 1, with its Supplication revision, in one transaction; `quran` as for a save. */
export async function addSupplication(add: SupplicationFields, admin: SavingAdmin, quran: QuranShape, pool: Pool = database()): Promise<SaveOutcome> {
  return inAdminSave(pool, admin, (client) => addWithin(client, add, admin.email, quran));
}

/** Delete Supplication `id` as `admin`, against version `base`, writing its Supplication revision in the same transaction. */
export async function deleteSupplication(id: number, base: number, admin: SavingAdmin, pool: Pool = database()): Promise<SaveOutcome> {
  return inAdminSave(pool, admin, (client) => deleteWithin(client, id, base, admin.email));
}
