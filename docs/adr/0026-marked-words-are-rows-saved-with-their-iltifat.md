# Marked Words are rows of their own, saved with their Iltifat as part of its whole state

An Admin marks an Iltifat's "from" Words and "to" Words in the Iltifat editor (#143). They are kept in a new content table, `iltifat_marked_word`, made by the content migration `0004-create-iltifat-marked-word` ([0015](0015-content-tables-and-recorded-content-migrations.md)): one row per Marked Word, `iltifat_id` (references `iltifat`), `ayah` and `word` (its Word location within the Iltifat's own Surah, each 1 or more) and `side` (`from` or `to`), with the primary key `(iltifat_id, ayah, word)`. The Surah is the Iltifat's, so a row cannot name another Surah. A Word may be marked in any number of Iltifat (17:1:13 in He → We and We → He), but once in each.

Marked Words are part of an Iltifat's whole editable state ([0023](0023-an-iltifat-save-writes-the-iltifat-and-its-revision-in-one-transaction.md)). `PUT /api/v1/iltifat/{id}` requires `markedWords`, a list of `{ "location": "s:a:w", "side": "from" | "to" }`, beside `base`, `reason`, `ayahFrom`, `ayahTo` and `disputed`; a body without it, or with an entry that is not an object of a text `location` and one of the two sides, is not a save (400). A save that passes replaces the Iltifat's rows with exactly those it was sent, in the same transaction as the row's update and its Iltifat revision, whose `before` and `after` carry `markedWords` as the API answers them. Every answer that holds an Iltifat (`GET /api/v1/iltifat`, a save's 200, a 409's latest Iltifat) gives its `markedWords` in reading order, by Ayah then Word, `[]` when it has none.

A save is refused 422 after the run's own checks, changing nothing, naming the first wrong Word in reading order: first a location that is no Word of the Quran text ("There is no Word at 1:2:5." — an Ayah-end marker, Word 0, an Ayah that does not exist, or no `s:a:w` at all, such as `1:5`), then a Word outside the run being saved ("The Marked Word 1:2:2 lies outside the run 1:3–5."), which is also how a change of run that would strand a Marked Word is refused. Whether a location is a Word is read from the dataset's per-Ayah Word counts, which leave out the Ayah-end markers; the table holds neither those nor the run.

Two cases the issue leaves open:

- **The same Word and side sent twice** is kept once: a repeat says nothing new, and refusing it would make an Admin fix what the editor should never send.
- **One Word on both sides of one Iltifat** is refused 422 ("The Word 1:2:2 can't be marked both "from" and "to" in one Iltifat."), checked after the two refusals above: a Word holds one person, so it carries one side of a turn, and the primary key could not hold both.

The Iltifat module (`apps/web/src/iltifat/`) gives every Iltifat its `markedWords`, and `isMarkedIltifat` says whether it is marked — both sides hold a Word — which the Iltifat pages' tints and the editor list's "Not yet marked" filter read.

## Consequences

- An Iltifat page or the editor reads Marked Words with its Iltifat, through the same cached reads and tags ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md), [0017](0017-iltifat-api-answers-every-iltifat-at-once.md)); a save already refreshes them.
- A client that saves an Iltifat must send its Marked Words back, even unchanged: the editor carries them in its form state.

## Considered Options

- A `jsonb` column of Marked Words on `iltifat`: rejected, because rows let Postgres hold each side to `from` or `to`, a Word to one side per Iltifat, and a Marked Word to an Iltifat that exists, and let a later reader find every Iltifat a Word is marked in.
- Storing the Surah on each row: rejected, as it is the Iltifat's and could only disagree with it.
- Leaving `markedWords` out of a save to keep the ones held: rejected, because the save carries the whole editable state, and an omission that kept old Words could not be told from one that meant to clear them.
