// The one-off seed of Allah references (#147, ADR 0012, ADR 0014): the owner's
// JSON array of Word locations, loaded exactly as given, in one transaction,
// with one seed revision per Surah. It refuses the whole file when any entry is
// not a Word of the Quran text, or when a Surah already holds other Allah
// references (seeded from another file, or published since); a Surah that
// already holds exactly the file's is left as it is, so a second run with the
// same file writes nothing. Its writes are audited as `seed` (ADR 0038).

import type { Pool, PoolClient } from "pg";
import { setAuditActor } from "../content-audit.ts";
import { bySurah, isWordLocation, type WordCounts } from "./locations.ts";
import { REFERENCES, REVISIONS, SEED_AUTHOR } from "./schema.ts";
import { readStored, type SurahAllahReferences as Stored } from "./stored.ts";

/** A file the seed refuses, and why: every entry that is not a Word location, or every Surah it would overwrite. */
export class SeedRefused extends Error {}

/** What a seed did: the Surahs it loaded, and those already holding exactly the file's Allah references. */
export interface Seeded {
  loaded: number[];
  unchanged: number[];
}

/** `value` as a list, or SeedRefused when the file is not a JSON array. */
function asList(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new SeedRefused("the file is not a JSON array of Word locations");
  return value;
}

/** SeedRefused naming every entry of `bad`, the file's entries that are not Words of the Quran text; nothing when there are none. */
function refuseNonWords(bad: unknown[]) {
  if (bad.length === 0) return;
  const named = bad.map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)));
  throw new SeedRefused(`not Words of the Quran text, so nothing was loaded: ${named.join(", ")}`);
}

/** The Word locations a file of Allah references holds, or SeedRefused naming every entry that is not a Word of the Quran text. */
export function fileLocations(text: string, wordCounts: WordCounts): string[] {
  const list = asList(JSON.parse(text));
  refuseNonWords(list.filter((entry) => !isWordLocation(entry, wordCounts)));
  return [...new Set(list as string[])];
}

function sameSet(a: string[], b: string[]) {
  const held = new Set(a);
  return a.length === b.length && b.every((l) => held.has(l));
}

/** Write Surah `surah`'s Allah references `locations` and its seed revision, version 1. */
async function load(client: PoolClient, surah: number, locations: string[]) {
  await client.query(
    `insert into "${REFERENCES}" (id, location, surah) select gen_random_uuid()::text, l, $2 from unnest($1::text[]) as l`,
    [locations, surah],
  );
  await client.query(
    `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
     values (gen_random_uuid()::text, $1, $2, now(), $3::jsonb, '[]'::jsonb, 0, 1)`,
    [surah, SEED_AUTHOR, JSON.stringify(locations)],
  );
}

/** Where a Surah stands against the file: already as it has them, free to load, or holding other Allah references. */
type Standing = "unchanged" | "loaded" | "clash";

/** Whether a Surah has never held Allah references: no revision and no row. */
const isUntouched = (now: Stored) => now.version === 0 && now.locations.length === 0;

/** A Surah that does not already match is loaded when untouched, and clashes otherwise. */
const loadedOrClash = (now: Stored): Standing => (isUntouched(now) ? "loaded" : "clash");

/** Where a Surah holding `now` stands against the file's `locations` for it. */
function standing(now: Stored, locations: string[]): Standing {
  if (sameSet(now.locations, locations)) return "unchanged";
  return loadedOrClash(now);
}

/** SeedRefused naming `clashes`, the Surahs already holding other Allah references; nothing when there are none. */
function refuseClashes(clashes: number[]) {
  if (clashes.length > 0) throw new SeedRefused(`these Surahs already hold other Allah references, so nothing was loaded: ${clashes.join(", ")}`);
}

/** Which Surahs of `groups` to load and which already match; SeedRefused when any Surah holds other Allah references. */
async function plan(client: PoolClient, groups: Map<number, string[]>): Promise<Seeded> {
  const standings: Record<Standing, number[]> = { unchanged: [], loaded: [], clash: [] };
  for (const [surah, locations] of groups) standings[standing(await readStored(client, surah), locations)].push(surah);
  refuseClashes(standings.clash);
  return { loaded: standings.loaded, unchanged: standings.unchanged };
}

/** Within an open transaction, load every Surah of `groups` the plan allows, and say what was done. */
async function seedIn(client: PoolClient, groups: Map<number, string[]>): Promise<Seeded> {
  await client.query(`lock table "${REFERENCES}", "${REVISIONS}" in exclusive mode`);
  const seeded = await plan(client, groups);
  for (const surah of seeded.loaded) await load(client, surah, groups.get(surah)!);
  return seeded;
}

/** Seed `locations` (already checked by fileLocations) into the database, all or nothing. */
export async function seedAllahReferences(pool: Pool, locations: string[]): Promise<Seeded> {
  const groups = bySurah(locations);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, SEED_AUTHOR);
    const seeded = await seedIn(client, groups);
    await client.query("commit");
    return seeded;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
