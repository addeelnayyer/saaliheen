// The Supplication revisions' tables (#199, ADR 0027, ADR 0023, ADR 0015): one
// row per save an Admin makes of a Supplication or a Speaker in the
// Supplication editor (a later issue), written in the save's own transaction.
// The curated file's load writes none, so every revision names an Admin.
// Before and after are the Supplication or Speaker as /api/v1/supplications
// answers it.

import type { PoolClient } from "pg";
import { auditTable } from "./content-audit.ts";

/**
 * Who saved (`author`, the Admin's email), when, the version the save was made
 * against (`base`) and the one it made (`version`, one more), and the
 * Supplication or Speaker before and after. A version is made once per
 * Supplication or Speaker. Shaped as iltifat_revision is; the Supplication
 * editor, which adds and removes Supplications, may widen it. Both tables are
 * each audited in `content_audit` (ADR 0038), from their creation.
 */
export async function createSupplicationRevisionTables(client: PoolClient) {
  for (const [table, key, keyType, parent] of [
    ["supplication_revision", "supplication_id", "integer", "supplication"],
    ["supplication_speaker_revision", "speaker_id", "text", "supplication_speaker"],
  ]) {
    await client.query(`
      create table ${table} (
        id integer generated always as identity primary key,
        ${key} ${keyType} not null references ${parent} (id),
        author text not null,
        created_at timestamptz not null default now(),
        base integer not null,
        version integer not null,
        before jsonb not null,
        after jsonb not null,
        check (version = base + 1),
        unique (${key}, version)
      )`);
    await auditTable(client, table);
  }
}
