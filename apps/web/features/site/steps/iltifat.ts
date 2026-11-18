// The Iltifat as the site tests expect them (#138): read from the run's own
// Postgres, which db:migrate loaded from the catalogue before the build (and
// ../arrange-iltifat.ts then edited as an Admin will), never from the
// catalogue file. The `iltifat` table's columns are the ones
// features/api/iltifat.feature names.

import { expect } from "@playwright/test";
import { Pool } from "pg";
import { testDatabase } from "../test-database";

export type Person = "first" | "second" | "third";

/** An Iltifat direction: its name, its page's slug, its persons, and the words a screen reader says for it. */
export interface Direction {
  name: string;
  slug: string;
  from: Person;
  to: Person;
}
export const DIRECTIONS: Direction[] = [
  { name: "He → We", slug: "he-to-we", from: "third", to: "first" },
  { name: "We → He", slug: "we-to-he", from: "first", to: "third" },
  { name: "He → You", slug: "he-to-you", from: "third", to: "second" },
  { name: "You → He", slug: "you-to-he", from: "second", to: "third" },
];
export function directionNamed(name: string): Direction {
  const d = DIRECTIONS.find((x) => x.name === name);
  if (!d) throw new Error(`no Iltifat direction "${name}"`);
  return d;
}

export interface Iltifat {
  id: string;
  from: Person;
  to: Person;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  cited: number;
  reason: string;
  disputed: boolean;
}

/** The element id that addresses an Iltifat on its direction page: the fragment `#iltifat-<id>`. */
export const fragmentOf = (i: Iltifat) => `iltifat-${i.id}`;
/** "2:23–25", or "2:187" for a run of one Ayah. */
export const runOf = (i: { surah: number; ayahFrom: number; ayahTo: number }) =>
  i.ayahFrom === i.ayahTo ? `${i.surah}:${i.ayahFrom}` : `${i.surah}:${i.ayahFrom}–${i.ayahTo}`;
/** Every Ayah of a run, as `s:a`. */
export const ayahsOfRun = (i: { surah: number; ayahFrom: number; ayahTo: number }) =>
  Array.from({ length: i.ayahTo - i.ayahFrom + 1 }, (_, k) => `${i.surah}:${i.ayahFrom + k}`);

let pool: Pool | undefined;
const database = () =>
  (pool ??= new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 2, idleTimeoutMillis: 1_000, allowExitOnIdle: true }));

let all: Iltifat[] | undefined;
/** Every Iltifat in the run's database. */
export async function everyIltifat(): Promise<Iltifat[]> {
  if (all) return all;
  const db = database();
  const table = await db.query<{ t: string | null }>(`select to_regclass('public.iltifat')::text as t`);
  expect(table.rows[0].t, "db:migrate made the table `iltifat` in the site tests' database").toBe("iltifat");
  const rows = await db.query(`select id, from_person, to_person, surah, ayah_from, ayah_to, cited_ayah, reason, disputed from iltifat`);
  all = rows.rows.map((r) => ({
    id: String(r.id),
    from: r.from_person,
    to: r.to_person,
    surah: Number(r.surah),
    ayahFrom: Number(r.ayah_from),
    ayahTo: Number(r.ayah_to),
    cited: Number(r.cited_ayah),
    reason: r.reason,
    disputed: r.disputed === true,
  }));
  return all;
}

/** Quran order: by Surah, then the run's first and last Ayah, then the cited Ayah, then id. */
const quranOrder = (a: Iltifat, b: Iltifat) =>
  a.surah - b.surah || a.ayahFrom - b.ayahFrom || a.ayahTo - b.ayahTo || a.cited - b.cited || a.id.localeCompare(b.id, "en", { numeric: true });

/** The Iltifat of one direction, in Quran order. */
export async function iltifatOf(direction: Direction): Promise<Iltifat[]> {
  return (await everyIltifat()).filter((i) => i.from === direction.from && i.to === direction.to).sort(quranOrder);
}

/** One direction's entries: its Iltifat grouped by run (same direction, same run), in Quran order. */
export async function entriesOf(direction: Direction): Promise<Iltifat[][]> {
  const entries: Iltifat[][] = [];
  for (const i of await iltifatOf(direction)) {
    const last = entries.at(-1)?.[0];
    if (last && runOf(last) === runOf(i)) entries.at(-1)!.push(i);
    else entries.push([i]);
  }
  return entries;
}

/** The one Iltifat of `direction` at `run` ("2:23–25"). */
export async function iltifatAt(direction: Direction, run: string): Promise<Iltifat> {
  const found = (await iltifatOf(direction)).filter((i) => runOf(i) === run);
  expect(found.length, `one ${direction.name} Iltifat at ${run} in the database`).toBe(1);
  return found[0];
}

/** The one Iltifat of `direction` cited at `ayah` ("35:31"). */
export async function iltifatCitedAt(direction: Direction, ayah: string): Promise<Iltifat> {
  const [s, a] = ayah.split(":").map(Number);
  const found = (await iltifatOf(direction)).filter((i) => i.surah === s && i.cited === a);
  expect(found.length, `one ${direction.name} Iltifat cited at ${ayah} in the database`).toBe(1);
  return found[0];
}
