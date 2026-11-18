// What each Passage revision changed (#174, ADR 0049): the rows it wrote,
// kept on the revision so the Admin area can list them and an undo can put
// them back. Each Publish from here on writes its own; this migration adds the
// columns and fills them in for the revisions made before it, from the content
// audit (ADR 0022, 0038): a Publish's Passage and Phrase rows were audited in
// the transaction that wrote its revision, so their audit rows carry the
// revision's own `created_at` (both are the transaction's `now()`) and its
// Surah. The seed's revisions are left without changes: the load made every
// row, and the seed is never undone. So is a revision no audit row matches:
// its changes were not recorded, and it is refused as such, not as changing
// nothing.

import type { PoolClient } from "pg";

/** A `passage` row's audited JSON as a Passage, `{ from, till, en, ur }`; null for none. */
const PASSAGE_OF = (row: string) =>
  `case when ${row} is null then null else jsonb_build_object('from', (${row} ->> 'ayah_from')::int, 'till', (${row} ->> 'ayah_till')::int, 'en', ${row} ->> 'title_en', 'ur', ${row} ->> 'title_ur') end`;

/** A `phrase` row's audited JSON as a Phrase, `{ first, last }`; null for none. */
const PHRASE_OF = (row: string) => `case when ${row} is null then null else jsonb_build_object('first', ${row} ->> 'first_word', 'last', ${row} ->> 'last_word') end`;

/** The audit rows of `table` written with revision `r`: in its transaction, in its Surah. */
const AUDITED_WITH = (table: string) => `from content_audit a
  where a.table_name = '${table}' and a.changed_at = r.created_at and (coalesce(a.after, a.before) ->> 'surah')::int = r.surah`;

/**
 * Add `changes`, the rows a revision changed as `{ passages, phrases }`, each
 * `{ before, after }`, and `undoes`, the version an undo turned back, to
 * `passage_revision`; then fill in `changes` for every revision but the seed's.
 */
export async function recordPassageRevisionChanges(client: PoolClient): Promise<void> {
  await client.query(`alter table passage_revision add column changes jsonb, add column undoes integer, add check (undoes between 1 and base)`);
  await client.query(`
    update passage_revision r set changes = jsonb_build_object(
      'passages', coalesce((select jsonb_agg(jsonb_build_object('before', ${PASSAGE_OF("a.before")}, 'after', ${PASSAGE_OF("a.after")})
                                    order by (coalesce(a.before, a.after) ->> 'ayah_from')::int)
                            ${AUDITED_WITH("passage")}), '[]'::jsonb),
      'phrases', coalesce((select jsonb_agg(jsonb_build_object('before', ${PHRASE_OF("a.before")}, 'after', ${PHRASE_OF("a.after")})
                                   order by split_part(coalesce(a.before, a.after) ->> 'first_word', ':', 2)::int,
                                            split_part(coalesce(a.before, a.after) ->> 'first_word', ':', 3)::int)
                           ${AUDITED_WITH("phrase")}), '[]'::jsonb))
    where r.author <> 'seed'
      and (exists (select 1 ${AUDITED_WITH("passage")}) or exists (select 1 ${AUDITED_WITH("phrase")}))`);
}
