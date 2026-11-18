// Supplication and Speaker revisions that outlive their rows (#202, #196, ADR
// 0043's consequence): the Supplication editor adds and deletes Supplications
// and Speakers, and every add or delete writes a revision, kept for Scholars
// to review after the row is gone.

import type { PoolClient } from "pg";

/**
 * Drop each revision table's foreign key to its row, so a delete keeps the
 * row's revisions, and let `before` be empty (null) for an add, whose base is
 * 0, and `after` for a delete; never both.
 */
export async function letSupplicationRevisionsOutliveTheirRows(client: PoolClient) {
  for (const [table, key] of [
    ["supplication_revision", "supplication_id"],
    ["supplication_speaker_revision", "speaker_id"],
  ]) {
    await client.query(`
      alter table ${table}
        drop constraint ${table}_${key}_fkey,
        alter column before drop not null,
        alter column after drop not null,
        add check (before is not null or after is not null)`);
  }
}
