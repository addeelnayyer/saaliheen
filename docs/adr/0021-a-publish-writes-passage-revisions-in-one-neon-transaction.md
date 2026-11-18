Fulfilled by [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md), which also gives the editor one Publish for Passages, Phrases and Allah references.

# A publish writes Passages, Phrases and a Passage revision in one Neon transaction

When Passages and Phrases move into Neon ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)), a publish from the Passage editor stops being a commit ([0019](0019-a-publish-is-one-git-data-api-commit-moved-without-force.md)) and becomes one transaction. Passages and Phrases share one version per Surah, as Allah references have theirs ([0014](0014-allah-reference-tables.md)). Each publish writes the Surah's new Passages, Passage titles and Phrases and one Passage revision: the Admin, the time, the replayed list of edits ([0018](0018-phrase-edits-replay-with-passage-edits-as-one-list.md)), the base version it was made against and the version it made, one more than its base. A publish whose base is not the Surah's current version is refused as a clash ("Someone published first") and answered with the latest Passages and Phrases. The server replays the edits on the rows and checks them by the same rules as before, so the editor and Publish keep one list of edits; the Unpublished changes are kept under the Surah and its version instead of two blob SHAs.

A publish that also changes the Surah's Allah references ([0012](0012-allah-references-are-hand-marked-word-locations.md)) writes both kinds in the same transaction, one revision of each, and clashes if either version has moved, just as 0019 refused a publish when either file had. The Allah reference tables are left as they are.

The Passages and Phrases are loaded once by a content migration, which writes one revision per Surah as the seed (author `seed`, base 0, version 1). After it, `passages.json`, `phrases.json` and the GitHub boundary are deleted. This supersedes [0006](0006-admin-edits-to-passages-are-commits.md)'s commits and [0019](0019-a-publish-is-one-git-data-api-commit-moved-without-force.md), and replaces the base SHAs of [0018](0018-phrase-edits-replay-with-passage-edits-as-one-list.md) with the rows' versions.

## Consequences

- A Scholar reviews Passage revisions in the database until the Admin area shows their history; that history and its undo are a separate piece of work, as for Allah references.
- A publish reaches readers by revalidating the Surah's tags and warming its pages ([0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)), with no rebuild.

## Considered Options

- One revision table for every kind of a Surah's data: a single version per Surah, but it would change the Allah reference tables already shipped and make an Allah reference publish clash with an unrelated Passage edit.
- Separate versions for Passages and Phrases: rejected, because their edits are one list and depend on each other ([0018](0018-phrase-edits-replay-with-passage-edits-as-one-list.md)).
