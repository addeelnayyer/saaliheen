# The Supplication tables keep runs apart and within their Surah, and are read under one tag

The Supplications live in Neon ([0027](0027-supplications-load-once-then-live-only-in-neon.md)) in tables made by content migrations ([0015](0015-content-tables-and-recorded-content-migrations.md)): `0009-create-supplication`, `0010-create-supplication-revision` and `0011-load-supplications` in `apps/web/scripts/content/`.

- `supplication_speaker`: `id`, a slug; `name_en` and `name_ur`, never blank; `includes_prophet`; `version`.
- `supplication`: `id` (from 1 in Quran order at the load, then given by Neon), `surah`, `ayah_from`, `ayah_to`, `speaker_id`, `openings` (a non-empty `text[]` within `rabbana`, `rabbi`, `other`), `kind` (`supplication`, or the slug of an Other words to Allah label) and `version`. Quran order is `surah, ayah_from, ayah_to, id`; Speakers are listed by `id`.
- `supplication_revision` and `supplication_speaker_revision`, each shaped as `iltifat_revision` ([0023](0023-an-iltifat-save-writes-the-iltifat-and-its-revision-in-one-transaction.md)) with a foreign key to its row. The load writes none.

Neon itself, not only the editor, refuses a run that leaves its Surah or shares an Ayah with another, so an Admin's save or a hand-run fix cannot break either rule. A check holds `ayah_to` within its Surah's Ayah count, read from QUL's Surah metadata (`data/qul/quran-metadata-surah-name.json`, kept for good by [0011](0011-all-data-in-neon-behind-the-versioned-api.md)) and written into the constraint as an array when the migration runs; unlike the `iltifat` table, which leaves that check to its load's test and its editor. An exclusion constraint keeps runs apart: each run is the integer range `surah × 1000 + ayah_from` to `surah × 1000 + ayah_to`, inclusive, with `&&` under GiST, which works on built-in range types; no Surah has 1000 Ayahs, so two runs overlap only within one Surah.

The page, Explore's Supplications count and `GET /api/v1/supplications` read one cached answer, `cachedEverySupplication` in `apps/web/src/supplications/cached.ts`, under the tag `supplications` and keyed by the deployment, as the Iltifat do ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md), [0017](0017-iltifat-api-answers-every-iltifat-at-once.md)). A save in the Supplication editor refreshes that tag.

## Consequences

- Removing a Supplication that has revisions is refused by the revision's foreign key; the Supplication editor, which removes them ([0027](0027-supplications-load-once-then-live-only-in-neon.md)), must widen that in a migration of its own.
- The four tables take the `content_audit` triggers ([0022](0022-saaliheens-own-data-is-audited-row-by-row.md), [0038](0038-content-audit-rows-name-an-actor-set-per-transaction-and-refuse-change.md)) as 0009 and 0010 make them, as the Theme tables do ([0037](0037-themes-are-three-content-tables-loaded-once.md)), so the load in 0011 is audited as an insert of every row by `migration`, and every change after it by its actor.

## Considered Options

- An exclusion on `(surah with =, int4range(ayah_from, ayah_to, '[]') with &&)`: clearer, but `=` on an integer under GiST needs the `btree_gist` extension, one more thing every database must have.
- A trigger looking up the Surah's length: more code than a check, and nothing to change, since a Surah's Ayah count does not change.
- Reading the counts from `data/generated/surahs.json`: that folder goes once the last kind of data is in Neon ([0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)), and a shipped migration is never edited.
- One revision table for Supplications and Speakers: a foreign key per table needs a table per kind of row, as [0023](0023-an-iltifat-save-writes-the-iltifat-and-its-revision-in-one-transaction.md) argued.
