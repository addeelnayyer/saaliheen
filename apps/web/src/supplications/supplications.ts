// The Supplications and their Speakers, read from Neon (#199, ADR 0027): the
// server-side module the Supplications page and /api/v1/supplications call,
// never the curated file the data migration loaded them from
// (scripts/content/supplications.ts).

import type { Pool } from "pg";
import { database } from "../database.ts";
import type { Opening, SupplicationKind } from "./kinds.ts";
import type { SupplicationSpan } from "./spans.ts";

export { OPENINGS, SUPPLICATION_KINDS, type Opening, type SupplicationKind } from "./kinds.ts";
export type { SupplicationSpan } from "./spans.ts";

/** A Supplication, or one of the Other words to Allah. */
export interface Supplication {
  id: number;
  surah: number;
  /** Its run of Ayahs, from `ayahFrom` to `ayahTo`, within the Surah. */
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  /** Never empty. */
  openings: Opening[];
  kind: SupplicationKind;
  /** Raised by each save. */
  version: number;
  /** Its spans (ADR 0063), in reading order by "from"; [] when it has none. */
  spans: SupplicationSpan[];
}

/** A Supplication as its `supplication` row holds it: all but its spans. */
export type SupplicationRow = Omit<Supplication, "spans">;

/** Whether `entry` is a Supplication rather than one of the Other words to Allah. */
export const isSupplication = (entry: Pick<Supplication, "kind">) => entry.kind === "supplication";

/** Who says a Supplication, named in both Languages, with its Prophet mark. */
export interface Speaker {
  /** A slug. */
  id: string;
  nameEn: string;
  nameUr: string;
  includesProphet: boolean;
  /** Raised by each save. */
  version: number;
}

/** Every Supplication, Other words to Allah included, and every Speaker: what /api/v1/supplications answers. */
export interface Supplications {
  supplications: Supplication[];
  speakers: Speaker[];
}

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

/** The columns of a `supplication` row, as a Supplication. */
export const COLUMNS = `id, surah, ayah_from as "ayahFrom", ayah_to as "ayahTo", speaker_id as "speakerId", openings, kind, version`;

/** The columns of a `supplication_speaker` row, as a Speaker. */
export const SPEAKER_COLUMNS = `id, name_en as "nameEn", name_ur as "nameUr", includes_prophet as "includesProphet", version`;

/** Every Speaker, by id. */
export async function everySpeaker(db: Database = database()): Promise<Speaker[]> {
  return (await db.query<Speaker>(`select ${SPEAKER_COLUMNS} from supplication_speaker order by id`)).rows;
}

/** The spans of the Supplications with ids `ids`, each in reading order, by Supplication id; one with none is left out. */
export async function spansById(db: Database, ids: readonly number[]): Promise<Map<number, SupplicationSpan[]>> {
  const { rows } = await db.query<{ id: number } & SupplicationSpan>(
    `select p.supplication_id as id,
            s.surah || ':' || p.from_ayah || ':' || p.from_word as "from",
            s.surah || ':' || p.to_ayah || ':' || p.to_word as "to"
       from supplication_span p join supplication s on s.id = p.supplication_id
      where p.supplication_id = any($1::integer[])
      order by p.supplication_id, p.from_ayah, p.from_word`,
    [ids],
  );
  const byId = new Map<number, SupplicationSpan[]>();
  for (const { id, from, to } of rows) {
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push({ from, to });
  }
  return byId;
}

/** `rows`, each with its spans read from `db`. */
export async function withSpans(db: Database, rows: readonly SupplicationRow[]): Promise<Supplication[]> {
  const byId = await spansById(db, rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, spans: byId.get(r.id) ?? [] }));
}

/** Every Supplication in Quran order (by Surah, then run; the id settles the rest), with its spans, and every Speaker by id. */
export async function everySupplication(db: Database = database()): Promise<Supplications> {
  const [rows, speakers] = await Promise.all([
    db.query<SupplicationRow>(`select ${COLUMNS} from supplication order by surah, ayah_from, ayah_to, id`),
    everySpeaker(db),
  ]);
  return { supplications: await withSpans(db, rows.rows), speakers };
}
