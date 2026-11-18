// The Tafsir's table (#233, ADR 0053, ADR 0054): one row per Tafsir entry, in
// each Language. Only made here: the English rows are loaded by `pnpm
// db:load-tafsir`, at any time, and the Urdu rows put in by the owner, so the
// Tafsir is not Saaliheen's own content and is not in the content audit.

import type { PoolClient } from "pg";

/**
 * "tafsir_entry": its `language` ("en" or "ur"), `surah`, `first_ayah` and
 * `last_ayah`, and its `text` as published, with its bold and italic markup.
 * An entry never crosses a Surah, so its Ayahs are one Surah's; no two
 * entries of one Language share an Ayah (btree_gist lets the exclusion
 * compare the Language and Surah).
 */
export async function createTafsirEntryTable(client: PoolClient) {
  await client.query(`create extension if not exists btree_gist`);
  await client.query(`
    create table tafsir_entry (
      language text not null check (language in ('en', 'ur')),
      surah integer not null check (surah between 1 and 114),
      first_ayah integer not null check (first_ayah >= 1),
      last_ayah integer not null,
      text text not null check (btrim(text) <> ''),
      primary key (language, surah, first_ayah),
      check (last_ayah >= first_ayah),
      exclude using gist (language with =, surah with =, int4range(first_ayah, last_ayah, '[]') with &&)
    )`);
}
