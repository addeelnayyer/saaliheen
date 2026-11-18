// The Iltifat, read from Neon (#138, ADR 0012): the server-side module the
// Iltifat pages call, never the catalogue the data migration loaded them from
// (scripts/content/iltifat.ts). Each Iltifat comes as one shape, so later
// reads (by id, cited at an Ayah) and a save can share it.

import type { Pool } from "pg";
import { database } from "../database.ts";
import { isMarked, type MarkedWord, type Side } from "./marked-words.ts";

/** The four Iltifat directions, in the order the overview lists them, by their slugs. */
export const ILTIFAT_DIRECTIONS = ["he-to-we", "we-to-he", "he-to-you", "you-to-he"] as const;
export type IltifatDirection = (typeof ILTIFAT_DIRECTIONS)[number];

/** Whether `slug` names an Iltifat direction: a direction page's guard on its address. */
export const isIltifatDirection = (slug: string): slug is IltifatDirection => (ILTIFAT_DIRECTIONS as readonly string[]).includes(slug);

type Person = "first" | "second" | "third";

/** Each Iltifat direction as the persons it turns from and to: "He" is the third, "We" the first, "You" the second. */
const PERSONS: Record<IltifatDirection, readonly [from: Person, to: Person]> = {
  "he-to-we": ["third", "first"],
  "we-to-he": ["first", "third"],
  "he-to-you": ["third", "second"],
  "you-to-he": ["second", "third"],
};

/** One Iltifat. */
export interface Iltifat {
  id: number;
  direction: IltifatDirection;
  surah: number;
  /** Its run of Ayahs, from `ayahFrom` to `ayahTo`, within the Surah. */
  ayahFrom: number;
  ayahTo: number;
  /** The Ayah Abdel Haleem cites, within the run. */
  citedAyah: number;
  /** What the turn does, in English whatever the reader's Language. */
  reason: string;
  disputed: boolean;
  /** Its section of Abdel Haleem's list. */
  section: string;
  /** Raised by each save. */
  version: number;
  /** Its Marked Words (#143), in reading order; none until an Admin marks them. */
  markedWords: MarkedWord[];
}

/** Whether `iltifat` is marked: both its sides hold a Word, so its Iltifat page tints them. */
export const isMarkedIltifat = (iltifat: Pick<Iltifat, "markedWords">): boolean => isMarked(iltifat.markedWords);

/** How many Iltifat an Iltifat direction has: those counted, and the Disputed ones apart. */
export interface IltifatCount {
  direction: IltifatDirection;
  counted: number;
  disputed: number;
}

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

interface PersonsRow {
  from_person: Person;
  to_person: Person;
}
export interface IltifatRow extends PersonsRow {
  id: number;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  cited_ayah: number;
  reason: string;
  disputed: boolean;
  section: string;
  version: number;
}

export const COLUMNS = "id, from_person, to_person, surah, ayah_from, ayah_to, cited_ayah, reason, disputed, section, version";
/** Quran order: by Surah, then run, then cited Ayah; the id settles the rest. */
const QURAN_ORDER = "surah, ayah_from, ayah_to, cited_ayah, id";

const directionOf = (row: PersonsRow) =>
  ILTIFAT_DIRECTIONS.find((d) => PERSONS[d][0] === row.from_person && PERSONS[d][1] === row.to_person);

function iltifatOf(row: IltifatRow, direction: IltifatDirection, markedWords: MarkedWord[]): Iltifat {
  return {
    id: row.id,
    direction,
    surah: row.surah,
    ayahFrom: row.ayah_from,
    ayahTo: row.ayah_to,
    citedAyah: row.cited_ayah,
    reason: row.reason,
    disputed: row.disputed,
    section: row.section,
    version: row.version,
    markedWords,
  };
}

/** `row` as an Iltifat with `markedWords`, or nothing when its persons make no Iltifat direction. */
export function withDirection(row: IltifatRow, markedWords: MarkedWord[]): Iltifat[] {
  const direction = directionOf(row);
  return direction ? [iltifatOf(row, direction, markedWords)] : [];
}

interface MarkedWordRow {
  iltifat_id: number;
  ayah: number;
  word: number;
  side: Side;
}

/** The Marked Words of the Iltifat `rows`, by Iltifat id, each list in reading order (ADR 0026), its Surah its row's. */
async function markedWordsOfRows(rows: IltifatRow[], db: Database): Promise<Map<number, MarkedWord[]>> {
  const surahOf = new Map(rows.map((row) => [row.id, row.surah]));
  const { rows: marked } = await db.query<MarkedWordRow>(
    `select iltifat_id, ayah, word, side from iltifat_marked_word
      where iltifat_id = any($1::int[])
      order by iltifat_id, ayah, word, side`,
    [[...surahOf.keys()]],
  );
  const byId = new Map<number, MarkedWord[]>();
  for (const { iltifat_id, ayah, word, side } of marked) {
    const words = byId.get(iltifat_id) ?? [];
    words.push({ location: `${surahOf.get(iltifat_id)}:${ayah}:${word}`, side });
    byId.set(iltifat_id, words);
  }
  return byId;
}

/** `rows` as Iltifat, each with its Marked Words, in the rows' order. */
export async function withMarkedWords(rows: IltifatRow[], db: Database): Promise<Iltifat[]> {
  const marked = await markedWordsOfRows(rows, db);
  return rows.flatMap((row) => withDirection(row, marked.get(row.id) ?? []));
}

/** Every Iltifat of `direction`, Disputed ones included, in Quran order. */
export async function iltifatOfDirection(direction: IltifatDirection, db: Database = database()): Promise<Iltifat[]> {
  const [from, to] = PERSONS[direction];
  const { rows } = await db.query<IltifatRow>(
    `select ${COLUMNS} from iltifat where from_person = $1 and to_person = $2 order by ${QURAN_ORDER}`,
    [from, to],
  );
  return withMarkedWords(rows, db);
}

/** Every Iltifat, of every direction, Disputed ones included, in Quran order: what /api/v1/iltifat answers. */
export async function everyIltifat(db: Database = database()): Promise<Iltifat[]> {
  const { rows } = await db.query<IltifatRow>(`select ${COLUMNS} from iltifat order by ${QURAN_ORDER}`);
  return withMarkedWords(rows, db);
}

/** The count of an Iltifat direction no row names. */
const NO_ILTIFAT = { counted: 0, disputed: 0 };

const countOf = (direction: IltifatDirection, { counted, disputed }: typeof NO_ILTIFAT): IltifatCount => ({
  direction,
  counted,
  disputed,
});

/** Each Iltifat direction's count, in the overview's order, with its Disputed Iltifat counted apart. */
export async function iltifatCounts(db: Database = database()): Promise<IltifatCount[]> {
  const { rows } = await db.query<PersonsRow & { counted: number; disputed: number }>(
    `select from_person, to_person,
            (count(*) filter (where not disputed))::int as counted,
            (count(*) filter (where disputed))::int as disputed
       from iltifat group by from_person, to_person`,
  );
  const byDirection = new Map(rows.map((row) => [directionOf(row), row]));
  return ILTIFAT_DIRECTIONS.map((direction) => countOf(direction, byDirection.get(direction) ?? NO_ILTIFAT));
}
