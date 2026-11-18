// Quran Chat's index (#77, ADR 0056): one row per source Quran Chat answers
// from, each Ayah translation and each Tafsir entry in each Language, with its
// embedding. Only made here: `pnpm db:migrate`, `pnpm db:load-tafsir` and
// `pnpm db:index-quran-chat` fill it from the sources
// (../../src/quran-chat/sources.ts), so it is rebuilt, not Saaliheen's own
// content, and not in the content audit.

import type { PoolClient } from "pg";

/**
 * "quran_chat_source": its `kind` ("ayah-translation" or "tafsir-entry"),
 * `language`, `surah`, `first_ayah` and `last_ayah` (one Ayah for a
 * translation, every Ayah of its Tafsir entry), the `text` embedded, the
 * `model` that embedded it and its `embedding`: text-embedding-3-small's 1536
 * dimensions as half-precision floats (pgvector's halfvec), half the size of
 * full ones at no cost to finding the nearest. It is searched by cosine
 * distance over every row, with no approximate index: some 25,000 rows are
 * read in milliseconds, and the nearest found are always the nearest.
 */
export async function createQuranChatSourceTable(client: PoolClient) {
  await client.query(`create extension if not exists vector`);
  await client.query(`
    create table quran_chat_source (
      kind text not null check (kind in ('ayah-translation', 'tafsir-entry')),
      language text not null check (language in ('en', 'ur')),
      surah smallint not null check (surah between 1 and 114),
      first_ayah smallint not null check (first_ayah >= 1),
      last_ayah smallint not null,
      text text not null,
      model text not null,
      embedding halfvec(1536) not null,
      primary key (kind, language, surah, first_ayah),
      check (last_ayah >= first_ayah)
    )`);
}
