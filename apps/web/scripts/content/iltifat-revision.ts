// The Iltifat revisions' table (#142, ADR 0023, ADR 0015): one row per save
// an Admin makes of an Iltifat, written in the save's own transaction by
// src/iltifat/save.ts. The catalogue's load writes none, so every revision
// names an Admin. Before and after are the Iltifat as /api/v1/iltifat answers
// it, so a Passage revision can take the same columns later.

import type { PoolClient } from "pg";

/**
 * Who saved (`author`, the Admin's email), when, the version the save was
 * made against (`base`) and the one it made (`version`, one more), and the
 * Iltifat before and after. A version is made once per Iltifat.
 */
export async function createIltifatRevisionTable(client: PoolClient) {
  await client.query(`
    create table iltifat_revision (
      id integer generated always as identity primary key,
      iltifat_id integer not null references iltifat (id),
      author text not null,
      created_at timestamptz not null default now(),
      base integer not null,
      version integer not null,
      before jsonb not null,
      after jsonb not null,
      check (version = base + 1),
      unique (iltifat_id, version)
    )`);
}
