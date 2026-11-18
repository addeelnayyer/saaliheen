Superseded by [0021](0021-a-publish-writes-passage-revisions-in-one-neon-transaction.md) and [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md).

# A Publish is one commit of the Passages and Phrases files, made with the Git Data API and a non-forced move of main

A Publish from the Passage editor (#100) may change the Passages file, the Phrases file or both ([0018](0018-phrase-edits-replay-with-passage-edits-as-one-list.md)), and the two must land together: a join's Phrases and a split's refusal only make sense against each other. So a Publish is one commit holding every file it changes, and only those: Phrase edits alone change only `apps/web/data/phrases.json`, Passage edits alone only `apps/web/data/passages.json`. GitHub's contents API commits one file at a time, so the GitHub boundary commits through the Git Data API instead, as the GitHub App: read `main`'s head and its commit, check each changed file there is still at the blob SHA the editor opened on, create the blobs and a tree on the head's tree, create the commit whose one parent is that head, and move `refs/heads/main` to it with `force: false`. GitHub answers 422 when `main` moved meanwhile; that, like a changed file, is a clash ("Someone published first"), answered with `main`'s latest Passages and Phrases. A Publish is refused as a clash when either file moved since the editor opened, since its edits were checked against both.

Before committing, the server replays the edits on `main`'s Passages and Phrases and checks the whole new Phrases file by the dataset's own Phrase rules over every Surah's Words. The admin area renders on demand, without the generated dataset, so the builder also writes `data/generated/word-counts.json` (each Ayah's Word count, Surah by Surah), which the reader bundles for that check. The Phrases file is written as the repo writes it: one Phrase a line, in Quran order, with a final newline. Missing Phrases never block a Publish.

## Consequences

- This is the publish path of [0006](0006-admin-edits-to-passages-are-commits.md), which [0011](0011-all-data-in-neon-behind-the-versioned-api.md) keeps for Passages and Phrases only until they move into Neon; it amends how the one commit is made, not 0006's rules. When they move, the commit becomes one transaction writing rows, and `word-counts.json` goes with the static dataset.
- `word-counts.json` is new static generated data, so it is among what 0011 moves. The server cannot derive the counts from what it already bundles: the served build holds only the Surah index (`surahs.json`, Ayah counts but no Word counts), and the Surah files are read only while pages are prerendered and kept out of the admin area's output trace. Tracing all 114 Surah files into the admin area to count Words was rejected for the size it adds to every admin request's bundle, against a 16 KB list.

## Considered Options

- Two contents-API commits, one per file: rejected because the first could land and the second clash, leaving `main` with Phrases its Passages don't fit.
- Moving `main` with `force: true`, or without checking the bases: rejected because it could silently drop another Admin's commit.
- Keeping the contents API for a one-file Publish: rejected to keep one commit path, whose clash rule is the same for one file or two.
