// The Marked Words' table (#143, ADR 0026, ADR 0015): one row per Word an
// Admin marks on one side of one Iltifat, written in the save's own
// transaction by src/iltifat/save.ts, in place of the rows that Iltifat had.
// A Word is kept as its Ayah and Word within the Iltifat's Surah, so a Marked
// Word can never name another Surah; whether it is a Word of the Quran text
// and within the run is the save's check, since the table holds neither.

import type { PoolClient } from "pg";

/**
 * Each Marked Word: its Iltifat, its Ayah and Word in that Iltifat's Surah,
 * and its side. A Word is marked at most once in one Iltifat, on one side; it
 * may be marked again in another Iltifat.
 */
export async function createIltifatMarkedWordTable(client: PoolClient) {
  await client.query(`
    create table iltifat_marked_word (
      iltifat_id integer not null references iltifat (id),
      ayah integer not null check (ayah >= 1),
      word integer not null check (word >= 1),
      side text not null check (side in ('from', 'to')),
      primary key (iltifat_id, ayah, word)
    )`);
}
