// An Account's Known words (#252, ADR 0057): "known_word" is one row per
// Account and Root or particle it has marked or unmarked, keyed by its kind
// and its text as @saaliheen/known-words names them, holding whether it is
// known and when it was marked, in milliseconds since the epoch on the device
// that marked it. An unmark is a row with known false, never a deleted row.
// The rows are deleted with the Account. Known words are a reader's, not
// Saaliheen's own content, so they are not in the content audit.

import type { PoolClient } from "pg";

/** "known_word": its Account ("userId"), `kind`, `text`, `known` and `marked_at`, keyed by the first three. */
export async function createKnownWordTable(client: PoolClient) {
  await client.query(`
    create table known_word (
      "userId" text not null references "user" (id) on delete cascade,
      kind text not null check (kind in ('root', 'lemma', 'spelling')),
      text text not null check (text <> ''),
      known boolean not null,
      marked_at bigint not null check (marked_at >= 0),
      primary key ("userId", kind, text)
    )`);
}
