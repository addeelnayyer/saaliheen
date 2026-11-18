# Known words are kept by their letters and merged per entry, with unmarks kept

A reader's Known words (#245) live on the device first and follow the Account, as Reading places do. Each entry names what it marks by its Arabic text, not by QUL's ids: a Known Root by its letters (`ر ح م`), a Known particle by its Lemma's text, or by its Spelling's text when Morphology gives it no Lemma, with which of the two it is. The Quran import rebuilds Roots and Lemmas from the sources on every `db:migrate` (0049, 0050), so ids could move a reader's marks onto other Roots without anyone noticing; text can't. An entry that stops matching anything after an import is kept and simply colours nothing.

Each entry is `{ kind, text, known, markedAt }`, stored in Neon as one row per Account and entry, never as one list per Account, so a change on one device can't overwrite another's. That row is `known_word`, keyed by the Account, `kind` and `text` (#252); like `asked_question` (0058) it is an Account table made by a content migration, not Better Auth's schema, which cannot key a row by several columns, and like it, it is a reader's data, not Saaliheen's content, so it is not in the content audit (0038). An unmark is kept as `known: false` with its own `markedAt`, not deleted: as with finishing a Surah (0052), a deleted mark would come back from any device that still held it. Merging, on first sign-in, on each sync and in the mobile app's offline sync, keeps for each entry whichever `markedAt` is newer; a tie goes to the unmark. There are at most a few thousand entries, so a device sends and receives its whole list.

## Considered options

- Storing QUL's Root and Lemma ids: smaller, but an import that renumbers them silently moves marks.
- Marking every rootless Word by its Spelling: hundreds more entries (مِنْ, وَمِنْ, فَمِنْ… each apart), against how a learner thinks.
- One JSON list per Account, newest list wins: a mark made on one device is lost when another syncs.
