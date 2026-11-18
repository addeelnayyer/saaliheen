// Loading a Language's Tafsir (#233, ADR 0054): the entries read from QUL's
// file (./qul.ts) replace every row of that Language, in one transaction, so
// a rerun of the same file leaves the rows exactly as they were and a file
// that lost an entry loses its row. It can be run at any time: the Tafsir is
// never edited in Saaliheen (ADR 0053), so there is nothing a load overwrites.

import type { Pool } from "pg";
import type { Language } from "@saaliheen/passages";
import type { TafsirEntry } from "./qul.ts";

/** Serialises concurrent loads into one database. */
const LOCK = "select pg_advisory_xact_lock(hashtext('tafsir_load'))";

/** Replace every `language` row with `entries`. */
export async function loadTafsir(pool: Pool, language: Language, entries: readonly TafsirEntry[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(LOCK);
    await client.query(`delete from tafsir_entry where language = $1`, [language]);
    await client.query(
      `insert into tafsir_entry (language, surah, first_ayah, last_ayah, text)
        select $1, * from unnest($2::int[], $3::int[], $4::int[], $5::text[])`,
      [language, entries.map((e) => e.surah), entries.map((e) => e.firstAyah), entries.map((e) => e.lastAyah), entries.map((e) => e.text)],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
