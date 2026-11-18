// An Admin's add, save or delete of one Speaker in the Supplication editor
// (#202, #196, ADR 0027): its names in both Languages and its Prophet mark,
// against the version it was made from but for an add, checked, then written
// with its Speaker revision in one transaction. An add's revision has no
// before and a delete's no after, and outlives the Speaker. A refusal changes
// no row. POST /api/v1/supplications/speakers and PUT and DELETE
// /api/v1/supplications/speakers/{id} answer with what this returns.

import type { Pool, PoolClient } from "pg";
import { inAdminSave, type SavingAdmin } from "../content-audit.ts";
import { database } from "../database.ts";
import { baseOf, isRecord } from "./save.ts";
import { SPEAKER_COLUMNS, type Speaker } from "./supplications.ts";

/** What the Supplication editor sends to add a Speaker. */
export interface SpeakerFields {
  nameEn: string;
  nameUr: string;
  includesProphet: boolean;
}

/** What the Supplication editor sends to save a Speaker: its fields and `base`, the version it was made against. */
export interface SpeakerSave extends SpeakerFields {
  base: number;
}

/** How a Speaker's add, save or delete ended; a delete that passes holds the Speaker deleted. */
export type SpeakerOutcome =
  | { kind: "saved"; speaker: Speaker }
  | { kind: "not-found" }
  | { kind: "stale"; speaker: Speaker }
  | { kind: "refused"; error: string };

export const SPEAKER_STALE_ERROR = "This Speaker has been saved since you opened it. The latest is shown beside your choices.";

/** `body` as a Speaker's add, or undefined when it is not one: a JSON object with both names as text and the Prophet mark as true or false. */
export function speakerFieldsOf(body: unknown): SpeakerFields | undefined {
  if (!isRecord(body) || typeof body.nameEn !== "string" || typeof body.nameUr !== "string" || typeof body.includesProphet !== "boolean") return undefined;
  return { nameEn: body.nameEn, nameUr: body.nameUr, includesProphet: body.includesProphet };
}

/** `body` as a Speaker's save, or undefined when it is not one: an add's fields and a whole number `base`. */
export function speakerSaveOf(body: unknown): SpeakerSave | undefined {
  const fields = speakerFieldsOf(body);
  const base = baseOf(body);
  return fields && base !== undefined ? { ...fields, base } : undefined;
}

/** `fields` with its names trimmed, as they are checked and written. */
const trimmed = ({ nameEn, nameUr, includesProphet }: SpeakerFields): SpeakerFields => ({ nameEn: nameEn.trim(), nameUr: nameUr.trim(), includesProphet });

/** Why `fields` of Speaker `id` (null for an add) are refused: a blank name, or a name another Speaker has. */
async function refusal(client: PoolClient, id: string | null, { nameEn, nameUr }: SpeakerFields): Promise<string | undefined> {
  if (nameEn === "") return "A Speaker needs a name in English.";
  if (nameUr === "") return "A Speaker needs a name in Urdu.";
  const { rows } = await client.query<{ name: string }>(
    `select case when lower(name_en) = lower($2) then name_en else name_ur end as name from supplication_speaker
      where id is distinct from $1 and (lower(name_en) = lower($2) or name_ur = $3) order by id limit 1`,
    [id, nameEn, nameUr],
  );
  return rows[0] && `Another Speaker is named "${rows[0].name}".`;
}

/** A slug of `name`: "Allah’s believing servants" is "allahs-believing-servants". */
const slugOf = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "speaker";

/** A new Speaker's id: the slug of its English name, with "-2", "-3"… when a Speaker, now or once, has it. */
async function newId(client: PoolClient, nameEn: string): Promise<string> {
  const slug = slugOf(nameEn);
  const { rows } = await client.query<{ id: string }>(
    `select id from supplication_speaker where id like $1 || '%' union select speaker_id from supplication_speaker_revision where speaker_id like $1 || '%'`,
    [slug],
  );
  const taken = new Set(rows.map((r) => r.id));
  let id = slug;
  for (let n = 2; taken.has(id); n++) id = `${slug}-${n}`;
  return id;
}

/** The Speaker revision by `author` of Speaker `id` from version `base`, `before` and `after` (null for none). */
async function revise(client: PoolClient, id: string, author: string, base: number, before: Speaker | null, after: Speaker | null) {
  await client.query(
    `insert into supplication_speaker_revision (speaker_id, author, base, version, before, after) values ($1, $2, $3, $4, $5, $6)`,
    [id, author, base, base + 1, before && JSON.stringify(before), after && JSON.stringify(after)],
  );
}

/** One Speaker save at a time, so that two can't each find a name free, nor both save one version; readers aren't held up. */
const oneSaveAtATime = (client: PoolClient) => client.query(`lock table supplication_speaker in share row exclusive mode`);

/** Within `client`'s transaction: Speaker `id`, found at version `base`, or why not. */
async function found(client: PoolClient, id: string, base: number): Promise<{ kind: "found"; speaker: Speaker } | Extract<SpeakerOutcome, { kind: "not-found" | "stale" }>> {
  await oneSaveAtATime(client);
  const { rows } = await client.query<Speaker>(`select ${SPEAKER_COLUMNS} from supplication_speaker where id = $1`, [id]);
  const speaker = rows[0];
  if (!speaker) return { kind: "not-found" };
  return { kind: speaker.version === base ? "found" : "stale", speaker };
}

async function addWithin(client: PoolClient, add: SpeakerFields, author: string): Promise<SpeakerOutcome> {
  await oneSaveAtATime(client);
  const error = await refusal(client, null, add);
  if (error) return { kind: "refused", error };
  const { rows } = await client.query<Speaker>(
    `insert into supplication_speaker (id, name_en, name_ur, includes_prophet) values ($1, $2, $3, $4) returning ${SPEAKER_COLUMNS}`,
    [await newId(client, add.nameEn), add.nameEn, add.nameUr, add.includesProphet],
  );
  await revise(client, rows[0].id, author, 0, null, rows[0]);
  return { kind: "saved", speaker: rows[0] };
}

async function saveWithin(client: PoolClient, id: string, save: SpeakerSave, author: string): Promise<SpeakerOutcome> {
  const opened = await found(client, id, save.base);
  if (opened.kind !== "found") return opened;
  const fields = trimmed(save);
  const error = await refusal(client, id, fields);
  if (error) return { kind: "refused", error };
  const { rows } = await client.query<Speaker>(
    `update supplication_speaker set name_en = $3, name_ur = $4, includes_prophet = $5, version = version + 1
      where id = $1 and version = $2 returning ${SPEAKER_COLUMNS}`,
    [id, save.base, fields.nameEn, fields.nameUr, fields.includesProphet],
  );
  await revise(client, id, author, save.base, opened.speaker, rows[0]);
  return { kind: "saved", speaker: rows[0] };
}

async function deleteWithin(client: PoolClient, id: string, base: number, author: string): Promise<SpeakerOutcome> {
  // Held before the Speaker, as a Supplication's save holds it, so that no Supplication can name the Speaker meanwhile.
  await client.query(`lock table supplication in share row exclusive mode`);
  const opened = await found(client, id, base);
  if (opened.kind !== "found") return opened;
  const { rows } = await client.query<{ says: number }>(`select count(*)::int as says from supplication where speaker_id = $1`, [id]);
  const { says } = rows[0];
  const name = opened.speaker.nameEn;
  if (says === 1) return { kind: "refused", error: `${name} still says 1 Supplication. Give it another Speaker before deleting ${name}.` };
  if (says > 1) return { kind: "refused", error: `${name} still says ${says} Supplications. Give each of them another Speaker before deleting ${name}.` };
  await client.query(`delete from supplication_speaker where id = $1`, [id]);
  await revise(client, id, author, base, opened.speaker, null);
  return { kind: "saved", speaker: opened.speaker };
}

/** Add a Speaker as `admin`, at version 1, with its Speaker revision, in one transaction, audited under the Admin's Account id. */
export async function addSpeaker(add: SpeakerFields, admin: SavingAdmin, pool: Pool = database()): Promise<SpeakerOutcome> {
  return inAdminSave(pool, admin, (client) => addWithin(client, trimmed(add), admin.email));
}

/** Save `save` of Speaker `id` as `admin`: the row and its Speaker revision in one transaction, or neither. */
export async function saveSpeaker(id: string, save: SpeakerSave, admin: SavingAdmin, pool: Pool = database()): Promise<SpeakerOutcome> {
  return inAdminSave(pool, admin, (client) => saveWithin(client, id, save, admin.email));
}

/** Delete Speaker `id` as `admin`, against version `base`, if it says no Supplication, writing its Speaker revision in the same transaction. */
export async function deleteSpeaker(id: string, base: number, admin: SavingAdmin, pool: Pool = database()): Promise<SpeakerOutcome> {
  return inAdminSave(pool, admin, (client) => deleteWithin(client, id, base, admin.email));
}
