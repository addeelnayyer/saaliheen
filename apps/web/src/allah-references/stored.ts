// A Surah's Allah references as the Account database holds them now (#147):
// read alike by the cached data module (for-surah.ts), the seed (seed.ts) and
// the public endpoint's fresh read (fresh.ts, #150).

import type { Pool, PoolClient } from "pg";
import { REFERENCES, REVISIONS } from "./schema.ts";

/** A Surah's Allah references: their Word locations, and the version they are at (0 before any revision). */
export interface SurahAllahReferences {
  locations: string[];
  version: number;
}

/** Surah `surah`'s Allah references as stored now, their Word locations in Quran order: by Ayah, then Word, as numbers (ADR 0028). */
export async function readStored(db: Pool | PoolClient, surah: number): Promise<SurahAllahReferences> {
  const { rows } = await db.query<{ locations: string[] | null; version: number }>(
    `select (select array_agg(location order by split_part(location, ':', 2)::int, split_part(location, ':', 3)::int) from "${REFERENCES}" where surah = $1) as locations,
            (select coalesce(max(version), 0) from "${REVISIONS}" where surah = $1) as version`,
    [surah],
  );
  return { locations: rows[0].locations ?? [], version: Number(rows[0].version) };
}
