Superseded by [0011](0011-all-data-in-neon-behind-the-versioned-api.md) and [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md).

# An Admin's edits to Passages are commits to the repo, not rows in a database

Passages and their Passage titles are Saaliheen's own data, so unlike the Quran text they change: an Admin can edit a title, split a Passage, merge it with the next one or move the boundary between two. We keep them as a file in the repo beside the rest of the dataset ([0001](0001-static-quran-dataset.md)), and an Admin's Unpublished changes are published together as one commit to that file, which rebuilds the static site. Edits are rare and a few minutes before readers see one is acceptable, while git gives every edit a history, an author and an undo for free, and lets a Scholar review changes without us building a review tool. Every publish is checked to keep the Passages covering each Ayah of a Surah exactly once; a save that would leave a gap or an overlap is refused. Publishes commit straight to `main` through the site's own GitHub App, with the Admin named as the commit's author, so Admins sign in with GitHub or Google and need no write access of their own. A publish made against an older copy of the file than the one on `main` is refused rather than merged, and the Admin is shown the latest Passages.

## Considered Options

- A hosted database with pages refreshed on edit: rejected because it reverses 0001 (a database, a running backend and backups) to make edits appear in seconds, which nobody needs for titles that change a few times a year. Revisit if there come to be many Admins or edits must show at once.
- Editing only in local development and pushing by hand: rejected because an Admin should not need a developer's machine to fix a title.
