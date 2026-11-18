Amended by [0026](0026-marked-words-are-rows-saved-with-their-iltifat.md): a save also carries the Iltifat's Marked Words, `markedWords`, written in the same transaction as the row and its revision.

# An Iltifat save writes the Iltifat and an Iltifat revision in one transaction

The Iltifat editor (#142) saves one Iltifat at a time through an Admin-only `PUT /api/v1/iltifat/{id}`, the first write to Saaliheen's own content in Neon from the Admin area ([0011](0011-all-data-in-neon-behind-the-versioned-api.md), [0012](0012-iltifat-live-only-in-neon.md)). The request carries the Iltifat's whole editable state, `reason`, `ayahFrom`, `ayahTo` and `disputed`, and `base`, the version it was made against. Its Surah, Iltifat direction and cited Ayah are not editable and are not sent. A request from no Account is answered 401, from an Account that is not an Admin 403, for an id no Iltifat has 404. A save whose `base` is not the row's `version` is refused 409, with the latest Iltifat; a blank reason, or a run that starts before Ayah 1, ends after the Surah's last Ayah, starts after it ends or leaves out the cited Ayah, is refused 422. Each refusal carries `error`, a sentence an Admin can act on, which the editor shows as it is. Every refusal changes no row.

A save that passes writes, in one transaction, the row with `version` one more than its base and one row of a new table, `iltifat_revision`, made by a content migration ([0015](0015-content-tables-and-recorded-content-migrations.md)): `id`, `iltifat_id`, `author` (the Admin's email, as the issue asks, where Allah reference revisions name the Account id), `created_at`, `base`, `version` (`base + 1`), and `before` and `after`, the Iltifat as `/api/v1/iltifat` answers it, as JSON. The update is guarded by `where id = $1 and version = $base`, so two saves against one version cannot both pass. Then it refreshes `iltifatTags(direction)` for the direction it has ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md)); the overview's tag refreshes `/api/v1/iltifat` and the Iltifat chips with it ([0017](0017-iltifat-api-answers-every-iltifat-at-once.md), [0018](0018-iltifat-chips-are-part-of-the-ayah-data.md)). It answers 200 with the saved Iltifat.

## Consequences

- The revision's columns other than `iltifat_id` (who, when, base, version, before, after) are the ones a Passage revision needs ([0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md)), keyed by its Surah, with its replayed edits beside before and after; Passages adopt the shape in a table of their own.
- The catalogue's load is version 1 of every Iltifat and writes no revision, so a revision always names an Admin. Passages differ here: their load writes a seed revision per Surah ([0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md)), which the shape takes as it is, `author` being text and `base` 0.
- `content_audit` ([0022](0022-saaliheens-own-data-is-audited-row-by-row.md)) will see the save's two writes when it is built; the revision stays the Admin-facing record.

## Considered Options

- One revision table for every kind of content (`kind`, `key`, then the same columns): Allah references already have their own table ([0014](0014-allah-reference-tables.md)), and per-kind tables keep foreign keys to the rows they describe.
- Recording only the changed fields: before and after whole make a revision readable, and undoing one later, without replaying the ones before it.
- Refusing a stale save without the latest Iltifat: the editor would need a second request to show what changed.
