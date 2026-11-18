Amended by [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md): the bar's one Publish sends the Allah reference changes with the Passage and Phrase edits; there is no "Publish Allah references" button.
Amended by [0043](0043-an-allah-reference-publish-is-a-post-of-the-changes-against-their-base.md): "Publish Allah references", a button of its own in the Unpublished changes bar, now sends the Allah reference changes to Neon (#153), so readers and the endpoint see them after it; the bar's Publish still sends only Passages and Phrases.

# Allah reference changes are a list of their own, kept by Surah and version

Marking Allah references (#152) is a Passage editor mode beside Phrases mode, and its edits are Unpublished changes. They are not added to the one list of Passage and Phrase edits ([0018](0018-phrase-edits-replay-with-passage-edits-as-one-list.md)). That list is one because its two kinds depend on each other: a Phrase must sit inside a Passage. An Allah reference depends on neither. It is a Word location, stored in Neon with a version of its own ([0014](0014-allah-reference-tables.md)), and it is published apart from the Passages files' blob SHAs. So the Allah reference changes are a second list. Each tap of a Word card is one entry, its Word location, and it turns that Word into an Allah reference or stops it being one. The list is replayed on the Surah's Allah references at the version it was made on. It is kept in the Admin's browser as `saaliheen-allah-reference-changes:<surah>:<version>`, beside the Passage and Phrase list's `saaliheen-unpublished-changes:<surah>:<passages SHA>:<phrases SHA>`.

- **Version.** The editor reads the Surah's Allah references and version uncached on each request, through the same fresh read as `GET /api/v1/allah-references/{surah}` ([0028](0028-the-allah-references-endpoint-reads-neon-on-each-request-and-says-when-it-cannot.md)). It does not use `forSurah`'s cache. That cache is refreshed only by a publish's tag and a deploy, so it could show an older version than Neon holds, and the changes would then be replayed on Allah references they were not made on. When another publish moves the version, the next load reads under the new name. The old list is set aside, never applied, as 0018 sets aside a list made on older files. When the read fails, the mode cannot be switched on, and the editor says why.
- **Undo** steps back the list of the mode in effect, one entry at a time. While marking Allah references, Undo steps back the latest Allah reference change, and it is disabled when there is none. Otherwise it steps back the latest Passage or Phrase edit, as before. The two lists are never interleaved, so Undo never has to guess which list holds the latest edit, and the Admin always sees the change it takes back.
- **The Unpublished changes bar** counts the two apart. "<n> Unpublished changes" stays the Passage and Phrase edits that Publish sends. "<n> Allah reference changes" appears beside it while any are waiting. Publish does not send them yet (#153), and readers and the endpoint see none of them.
- In the mode, an Allah reference's Arabic is drawn in `--allah` even when the Admin has switched Allah reference colour off for reading: the mode exists to show it.

## Consequences

- #153's Publish sends this list with its base version. The server applies it in one transaction with an Allah reference revision, and refuses it when the base is no longer the current version ([0014](0014-allah-reference-tables.md), [0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md)). After that publish, the list kept under the old version is cleared.
- Lists set aside under older versions stay in the Admin's browser storage until it is cleared. They are short, and Admins are few.
- Tapping the same Word twice is two changes, and they cancel out. The count is the number of taps that Undo can step back, not the number of Words that differ.

## Considered Options

- Adding `allahReference` edits to the Passage and Phrase list: one Undo for everything, but the list's storage name would hold three bases, a new Allah reference version would set aside Passage edits too, and Publish could not send one kind without the other.
- Reading through `forSurah`: one cached read shared with the pages, but its version can lag Neon, so changes made on an old version could be applied to a new one.
- One Undo across both lists, by time: it would take back a change in the mode the Admin is not looking at.
