Supersedes [0043](0043-an-allah-reference-publish-is-a-post-of-the-changes-against-their-base.md), [0019](0019-a-publish-is-one-git-data-api-commit-moved-without-force.md) and what remained of [0006](0006-admin-edits-to-passages-are-commits.md).
Amends [0035](0035-allah-reference-changes-are-a-list-of-their-own-kept-by-surah-and-version.md): the bar's one Publish sends the Allah reference changes too, and the Passage and Phrase edits are kept by Surah and Passage version.
Fulfils [0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md) and, for Passages and Phrases, [0022](0022-saaliheens-own-data-is-audited-row-by-row.md).

# One Publish writes a Surah's Passages, Phrases and Allah references in one transaction

Passages, Passage titles and Phrases move into Neon (#171, [0011](0011-all-data-in-neon-behind-the-versioned-api.md)), so a Publish from the Passage editor stops being a commit through a GitHub App ([0019](0019-a-publish-is-one-git-data-api-commit-moved-without-force.md)) and becomes one transaction, as [0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md) planned. With both kinds in one database, the reason [0043](0043-an-allah-reference-publish-is-a-post-of-the-changes-against-their-base.md) gave Allah references a Publish button of their own, that a git commit and a Neon write share no transaction, is gone: the bar has one Publish, and it sends the Passage, Phrase and Allah reference changes together.

**Tables.** Content migration `0012-create-passage-tables` ([0015](0015-content-tables-and-recorded-content-migrations.md)) makes four:

- `passage (surah, ayah_from, ayah_till, title_en, title_ur)`, keyed by `(surah, ayah_from)`;
- `phrase (surah, first_word, last_word)`, keyed by `first_word`, Word locations compared byte by byte (`collate "C"`);
- `passage_revision (surah, author, created_at, edits, base, version)`, keyed by `(surah, version)`, with `version = base + 1`: `edits` holds the Publish's Passage and Phrase edits as sent ([0018](0018-phrase-edits-replay-with-passage-edits-as-one-list.md)), `author` the Admin's Account id;
- `surah_content_hash (surah, hash)`, the SHA-256 of the Surah file `/data/v1` serves, the stored hash of [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md), read by the manifest ([0046](0046-pages-read-each-surahs-passages-from-neon-under-its-own-cache-tag.md)).

The first three are audited by `content_audit` ([0038](0038-content-audit-rows-name-an-actor-set-per-transaction-and-refuse-change.md)); the hash is derived, so it is not. Content migration `0013-load-passages-and-phrases-files` loads every Passage, Passage title and Phrase from its own input, `apps/web/scripts/content/0013-load-passages-and-phrases-files.json`, the two files as last committed and never edited ([0041](0041-the-theme-load-carries-its-input-pages-are-warmed-by-a-script-and-pnpm-dev-runs-its-own-postgres.md)), with the dataset build's Passage and Phrase checks, one `seed` Passage revision per Surah (base 0, version 1) and each Surah's content hash. Then `apps/web/data/passages.json` and `phrases.json` are deleted, and the build writes each Surah file's `passages` and `phrases` as empty lists that the server fills from Neon.

**Version and locks.** A Surah's Passage version is its latest Passage revision's `version`. A Publish takes the transaction-scoped advisory lock `pg_advisory_xact_lock(171, <surah>)`, then 0043's `(153, <surah>)`, always in that order, so two Publishes of one Surah queue and never deadlock, and a Publish in another Surah never waits. Holding both, it reads the Surah's rows and both versions.

**The request.** `POST /api/v1/passages/{surah}`, Admin only, body `{ base, edits, allahReferences? }`: `base` the Passage version the edits were made on, `edits` the editor's Passage and Phrase edits in order (empty when only Allah reference changes come), and `allahReferences` 0043's `{ base, changes }` while any wait. The server replays the edits on the Surah's rows by the editor's own rules, strictly: an edit that no longer applies is refused, and so is a result that breaks a Passage rule or a Phrase rule ([0009](0009-phrases-are-hand-marked-and-never-overlap.md)). Missing Phrases never refuse a Publish.

**What it writes.** In one transaction, naming the Admin's Account id as the content audit's actor: only the rows that changed (a join updates the upper Passage and deletes the joined one), one Passage revision with the edits, `base` and `base + 1`, and the Surah's new content hash; and, when Allah reference changes come, the Allah references and their revision as 0043 wrote them. A Publish of Allah reference changes alone writes no Passage revision and no hash, since Allah references are not in the `/data/v1` file.

**The answers.** 200 `{ surah, version, passages, phrases, allahReferences }`, where `allahReferences` is `{ surah, version, locations }`. A refusal writes nothing and answers `{ error }`: 401 from no Account, 403 from an Account that is not an Admin, 404 for no Surah, 400 for a body that is not a Publish or publishes nothing (no edits and no Allah reference changes), 422 for a broken rule (its reason), an edit that no longer applies to the Surah's rows, or an Allah reference change that is no Word of the Surah, 409 when either `base` is no longer the Surah's version, carrying the latest as `latest` in the 200's shape, and 500 when the database refuses a write.

**After the commit.** When Passages or Phrases were written, `refreshSurahPassages` expires the Surah's `passages:<n>` tag (its page, parts, Share pages, `/data/v1` file, the manifest and the Theme pages holding its Ayahs) and, once the answer has gone, warms the Surah's page and every Surah part in Urdu and English ([0046](0046-pages-read-each-surahs-passages-from-neon-under-its-own-cache-tag.md)). When Allah references were written, their `allah-references:<n>` tag is expired as 0043 did.

**The old endpoint.** `POST /api/v1/allah-references/{surah}` stays, with 0043's body and answers, as a thin call of the same Publish with Allah reference changes alone, so it takes both locks in the same order. Undoing an Allah reference revision ([0044](0044-undoing-an-allah-reference-publish-is-a-revision-that-reverses-it.md)) is not a Publish: it keeps its own transaction on `(153, <surah>)` alone and writes its revision as a Publish's Allah reference changes do, so an undo and a Publish of one Surah still queue on that lock and each refuses the other's moved version.

**The editor.** It reads the Surah's rows and both versions from Neon uncached on each request. The Passage and Phrase edits are kept in the browser under `saaliheen-unpublished-changes:<surah>:<Passage version>`, in place of 0018's two file SHAs; the Allah reference changes stay under 0035's `saaliheen-allah-reference-changes:<surah>:<Allah reference version>`. Each list is set aside when its own version moves. After a 409 the editor shows the latest and sets aside the list whose version moved; after a refusal or a failed request it keeps both. Collapsed Passages start again when the Passage version changes.

## Consequences

- Readers see a Publish on their next load, with no commit, rebuild or deploy; the GitHub App, its settings and the site tests' fake of GitHub are gone. Retiring the App and its settings on Vercel is done by hand ([docs/admin-setup.md](../admin-setup.md)).
- A Passage edit and an Allah reference change in one Surah land together or not at all, and a clash on either refuses both.
- Passage history lives only in `passage_revision` and `content_audit`, no longer in git. A Scholar reviews it in the database until the admin area shows it.
- Lists kept under the old storage names (the file SHAs) are no longer read; an Admin with such Unpublished changes makes them again.
- A stored hash is only right while every write that changes a Surah file stores its new one: a later Publish of Themes must do the same.

## Considered Options

- Keeping two Publish buttons, one per kind: the reason for two went with git, and two would let a Passage edit land without the Allah reference change made with it.
- Keeping the Allah reference changes in the Passage and Phrase list, under one storage name: the issue's one list is 0018's list of Passage and Phrase edits, which depend on each other; Allah reference changes have their own version ([0035](0035-allah-reference-changes-are-a-list-of-their-own-kept-by-surah-and-version.md)), and under one name a move of either version would set aside the other's changes too. The Publish still sends both together.
- Retiring `POST /api/v1/allah-references/{surah}`: nothing outside the editor and #153's features calls it, but it costs one call to keep, and removing a shipped `/api/v1` route is a breaking change.
- Writing every row of the Surah on each Publish: simpler, but the content audit would record unchanged rows as changes.
