// An Admin's save of one Iltifat (#142, ADR 0023): its whole editable state
// (reason, run, Disputed, Marked Words) against the version it was made from,
// checked, then written with its Iltifat revision in one transaction (ADR
// 0026): the row, its Marked Words in place of those it had, and the
// revision. A refusal changes no row. PUT /api/v1/iltifat/{id} answers with
// what this returns.

import type { Pool, PoolClient } from "pg";
import { inAdminSave, type SavingAdmin } from "../content-audit.ts";
import { database } from "../database.ts";
import { COLUMNS, withDirection, withMarkedWords, type Iltifat, type IltifatRow } from "./iltifat.ts";
import { partsOf } from "../word-locations.ts";
import { distinctMarkedWords, isRecord, markedWordsOf, markedWordsRefusal, type MarkedWord, type QuranShape } from "./marked-words.ts";

/** What the Iltifat editor sends: the Iltifat's editable state and `base`, the version it was made against. */
export interface IltifatSave {
  base: number;
  reason: string;
  ayahFrom: number;
  ayahTo: number;
  disputed: boolean;
  /** Its Marked Words, each location and side once, in reading order. */
  markedWords: MarkedWord[];
}

/** How a save ended. */
export type SaveOutcome =
  | { kind: "saved"; iltifat: Iltifat }
  | { kind: "not-found" }
  | { kind: "stale"; iltifat: Iltifat }
  | { kind: "refused"; error: string };

export const STALE_ERROR = "This Iltifat has been saved since you opened it. Reload it to see the latest.";

const isText = (v: unknown) => typeof v === "string";
const isFlag = (v: unknown) => typeof v === "boolean";

/** Each field of a save but its Marked Words, with the test its value must pass. */
const FIELDS: Record<Exclude<keyof IltifatSave, "markedWords">, (value: unknown) => boolean> = {
  base: Number.isInteger,
  reason: isText,
  ayahFrom: Number.isInteger,
  ayahTo: Number.isInteger,
  disputed: isFlag,
};

/**
 * `body` as a save, or undefined when it is not one: a JSON object of the six
 * fields, each of its type. Marked Words named twice are kept once.
 */
export function iltifatSaveOf(body: unknown): IltifatSave | undefined {
  if (!isRecord(body)) return undefined;
  const typed = Object.entries(FIELDS).every(([field, passes]) => passes(body[field]));
  const markedWords = markedWordsOf(body.markedWords);
  if (!typed || !markedWords) return undefined;
  const { base, reason, ayahFrom, ayahTo, disputed } = body as unknown as IltifatSave;
  return { base, reason, ayahFrom, ayahTo, disputed, markedWords: distinctMarkedWords(markedWords) };
}

/** One check of a save of `iltifat` against the Quran text: its refusal, or undefined when it passes. */
type Check = (save: IltifatSave, iltifat: Iltifat, quran: QuranShape) => string | undefined;

/** The checks, in the order a refusal names the first that fails. */
const CHECKS: Check[] = [
  (save) => (save.reason.trim() === "" ? "The reason can't be empty." : undefined),
  (save, { surah }, quran) => {
    const ayahCount = quran.ayahCount(surah);
    return save.ayahFrom < 1 || save.ayahTo > ayahCount ? `The run must lie within Surah ${surah}, Ayahs 1 to ${ayahCount}.` : undefined;
  },
  (save) => (save.ayahFrom > save.ayahTo ? "The run must start at or before the Ayah it ends at." : undefined),
  (save, { surah, citedAyah }) =>
    citedAyah < save.ayahFrom || citedAyah > save.ayahTo ? `The run must hold the cited Ayah, ${surah}:${citedAyah}.` : undefined,
  (save, { surah }, quran) => markedWordsRefusal(save.markedWords, { surah, ayahFrom: save.ayahFrom, ayahTo: save.ayahTo }, quran),
];

/** Why `save` of `iltifat` is refused, or undefined when it may be saved. */
const refusalOf = (save: IltifatSave, iltifat: Iltifat, quran: QuranShape): string | undefined =>
  CHECKS.map((check) => check(save, iltifat, quran)).find((error) => error !== undefined);

/** The Iltifat with id `id`, with its Marked Words, locked for the transaction, or undefined. */
async function lockedIltifat(client: PoolClient, id: number): Promise<Iltifat | undefined> {
  const { rows } = await client.query<IltifatRow>(`select ${COLUMNS} from iltifat where id = $1 for update`, [id]);
  return (await withMarkedWords(rows, client))[0];
}

/** Put `words` in place of Iltifat `id`'s Marked Words: each kept as its Ayah and Word, the Surah being the Iltifat's. */
async function replaceMarkedWords(client: PoolClient, id: number, words: MarkedWord[]) {
  await client.query(`delete from iltifat_marked_word where iltifat_id = $1`, [id]);
  if (words.length === 0) return;
  const [ayahs, numbers] = [1, 2].map((part) => words.map((w) => partsOf(w.location)![part]));
  await client.query(
    `insert into iltifat_marked_word (iltifat_id, ayah, word, side)
     select $1, ayah, word, side from unnest($2::int[], $3::int[], $4::text[]) as m(ayah, word, side)`,
    [id, ayahs, numbers, words.map((w) => w.side)],
  );
}

/** Write `save` over `before` and its Iltifat revision by `author`; the Iltifat after. */
async function write(client: PoolClient, before: Iltifat, save: IltifatSave, author: string): Promise<Iltifat> {
  const { rows } = await client.query<IltifatRow>(
    `update iltifat set reason = $3, ayah_from = $4, ayah_to = $5, disputed = $6, version = version + 1
      where id = $1 and version = $2 returning ${COLUMNS}`,
    [before.id, save.base, save.reason.trim(), save.ayahFrom, save.ayahTo, save.disputed],
  );
  await replaceMarkedWords(client, before.id, save.markedWords);
  const after = rows.flatMap((row) => withDirection(row, save.markedWords))[0];
  await client.query(
    `insert into iltifat_revision (iltifat_id, author, base, version, before, after) values ($1, $2, $3, $4, $5, $6)`,
    [before.id, author, save.base, after.version, JSON.stringify(before), JSON.stringify(after)],
  );
  return after;
}

/** Within `client`'s transaction: `save` of Iltifat `id` checked, and written if it passes. */
async function saveWithin(client: PoolClient, id: number, save: IltifatSave, author: string, quran: QuranShape): Promise<SaveOutcome> {
  const before = await lockedIltifat(client, id);
  if (!before) return { kind: "not-found" };
  if (before.version !== save.base) return { kind: "stale", iltifat: before };
  const error = refusalOf(save, before, quran);
  if (error) return { kind: "refused", error };
  return { kind: "saved", iltifat: await write(client, before, save, author) };
}

/**
 * Save `save` of Iltifat `id` as `admin`: the row and its Marked Words and its
 * Iltifat revision in one transaction, or none, audited under the Admin's
 * Account id. `quran` gives the Surah and Ayah lengths its checks read.
 */
export async function saveIltifat(
  id: number,
  save: IltifatSave,
  admin: SavingAdmin,
  quran: QuranShape,
  pool: Pool = database(),
): Promise<SaveOutcome> {
  return inAdminSave(pool, admin, (client) => saveWithin(client, id, save, admin.email, quran));
}
