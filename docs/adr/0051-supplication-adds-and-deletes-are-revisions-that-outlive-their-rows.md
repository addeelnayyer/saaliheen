Amends [0043](0043-supplication-tables-keep-runs-apart-and-within-their-surah.md): the revision tables no longer reference their rows, as its Consequences foresaw.

# Supplication adds and deletes are revisions that outlive their rows

The Supplication editor adds and deletes Supplications and Speakers (#202, [0027](0027-supplications-load-once-then-live-only-in-neon.md)). Each add and delete writes a revision in the same transaction as the row, as a save does ([0023](0023-an-iltifat-save-writes-the-iltifat-and-its-revision-in-one-transaction.md)): an add's has `base` 0, `version` 1 and no `before`; a delete's has `base` the deleted row's version, `version` one more and no `after`. Scholars review them after the fact, so a deleted row's revisions are kept.

The content migration `0015-let-supplication-revisions-outlive-their-rows` therefore drops `supplication_revision`'s and `supplication_speaker_revision`'s foreign keys to their rows, lets `before` and `after` be null, and checks that one of them is not. A new Speaker's id, the slug of its English name, skips every id a revision names, with `-2`, `-3`…, so a deleted Speaker's revisions never read as a later one's. A Supplication's id is Neon's, never given twice.

A Speaker who still says a Supplication can't be deleted: the delete takes the `supplication` table's lock before the Speaker's, as a Supplication save does, counts that Speaker's Supplications and refuses with 422 when there are any. Two Speakers can't share an English name (in any case) or an Urdu name, so a Speaker picker never offers two alike.

## Considered options

- Keeping the foreign keys and marking rows deleted: every reader of the Supplications would have to skip the marked rows, for a history only Scholars read.
- Deleting a Speaker's Supplications with them: one press would remove many Supplications, each needing its own review.
