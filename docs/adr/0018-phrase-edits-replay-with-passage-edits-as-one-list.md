Amended by [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md): the list is kept under `saaliheen-unpublished-changes:<surah>:<Passage version>` and replayed on Neon's rows.
Amended by [0035](0035-allah-reference-changes-are-a-list-of-their-own-kept-by-surah-and-version.md): Allah reference changes are kept as a list of their own, not in this one.
Amended by [0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md): once Passages and Phrases are in Neon, the list is kept under the Surah's version instead of the two blob SHAs.

# Phrase edits are kept with Passage edits as one list, replayed on main's Passages and Phrases

An Admin's Phrase edits in the Passage editor (#100) are Unpublished changes like Passage edits ([0006](0006-admin-edits-to-passages-are-commits.md)), and the two depend on each other: a Phrase must end in the Passage it starts in, and a Passage edit may not put a boundary inside a Phrase ([0009](0009-phrases-are-hand-marked-and-never-overlap.md)). So both kinds are kept in one ordered list of edits — `mark`, `unmark` and `moveEnd` beside `retitle`, `split`, `join` and `moveStart` — each naming what it changes by Word location or first Ayah, never by place in a list. The editor and Publish replay that list on `main`'s Passages and Phrases through the same pure rules, so each edit is checked against the Passages and Phrases its predecessors left, Undo steps back one edit of either kind, and the server recomputes the result rather than trusting the browser's. A Phrase is named by its first Word, which no other Phrase can share. The list is kept in the Admin's browser under the Surah and the blob SHAs of both files it was made on, so a change to either file on `main` sets the old list aside.

## Consequences

- The storage name now holds both SHAs, so a list kept before #100 under the Passages file's SHA alone is no longer read: an Admin with Unpublished changes from before then makes them again. Admins are few and such a list is short-lived, so no migration reads the old name.
- Like [0006](0006-admin-edits-to-passages-are-commits.md), this holds only until Passages and Phrases move into Neon ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)); the one list of edits and its replay on the latest Passages and Phrases can stay, with the base SHAs giving way to the rows' versions.

## Considered Options

- Two lists, one per file, each with its own Undo: rejected because Undo would have to guess which list holds the latest edit, and a Passage edit's refusal depends on Phrase edits made before it.
- Sending the edited Phrases file instead of the edits: rejected because the server could not tell an Admin's edit from a stale copy, and a Passage edit replayed on newer Passages could then cut a Phrase unseen.
