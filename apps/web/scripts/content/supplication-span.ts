// A Supplication's spans' table (#270, ADR 0063): one row per span of
// consecutive Words its Speaker says to Allah, written in the save's own
// transaction by src/supplications/save.ts, in place of the rows that
// Supplication had. Each end is kept as its Ayah and Word within the
// Supplication's Surah, so a span can never name another Surah; whether its
// ends are Words of the Quran text, within the run, and clear of the
// Supplication's other spans is the save's check. Deleting a Supplication
// deletes its spans; its Supplication revisions keep them. Nothing is loaded:
// spans are marked in the Supplication editor.

import type { PoolClient } from "pg";
import { auditTable } from "./content-audit.ts";

/** "supplication_span": its Supplication, and the Ayah and Word of its first and last Words, keyed by the Supplication and its first Word. */
export async function createSupplicationSpanTable(client: PoolClient) {
  await client.query(`
    create table supplication_span (
      supplication_id integer not null references supplication (id) on delete cascade,
      from_ayah integer not null check (from_ayah >= 1),
      from_word integer not null check (from_word >= 1),
      to_ayah integer not null check (to_ayah >= 1),
      to_word integer not null check (to_word >= 1),
      check ((to_ayah, to_word) >= (from_ayah, from_word)),
      primary key (supplication_id, from_ayah, from_word)
    )`);
  await auditTable(client, "supplication_span");
}
