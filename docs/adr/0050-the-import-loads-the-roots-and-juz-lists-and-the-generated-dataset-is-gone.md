Fulfils [0011](0011-all-data-in-neon-behind-the-versioned-api.md) for the Roots and the Juz lists, the last data written as generated files.
Amends [0049](0049-db-migrate-imports-the-quran-from-the-committed-sources-before-the-content-migrations.md): the import loads the Roots and Juz lists too, a Word names its Root by id alone, and nothing writes a generated file.

# The import loads the Roots and Juz lists, and the generated dataset is gone

The Roots, with their Lemmas, Spellings and meanings ([0003](0003-qul-owns-word-analysis.md)), and each Script's Juz list ([0035](0035-indo-pak-juz-starts-are-saaliheens-own-data-and-juz-are-named-from-the-text.md)) were the last of the builder's output written as files, into `apps/web/data/generated/`, by `pnpm dataset` and the website's `prebuild` (#173). The Quran import now loads them beside the Quran text, and the generated directory, the `dataset` script, `prebuild`, the writer and the build's output tracing of those files are gone. The sources stay committed and unedited, `data/roots.json` among them.

**Tables.** Beside 0049's, the import makes and fills:

- `root (id, letters, transliteration, occurrences, unique_words, hash)`, keyed by QUL's Root id, `hash` the SHA-256 of the Root file /data/v1 serves, which the manifest names it by;
- `lemma (root, position, qul_id, text)`, a Root's Lemmas in the builder's order, most frequent first; a Lemma with no QUL id has no text either, as QUL gives Word locations no Lemma;
- `spelling (root, lemma, position, uthmani, indopak, meaning_ur, meaning_en)`, a Lemma's Spellings in the builder's order, the first one's meaning the Lemma's;
- `spelling_word (location, root, lemma, spelling)`, the Words each Spelling is written as, one row per Word; a Spelling's and a Lemma's counts are counts of these rows;
- `juz (script, number, name, first_ayah, last_ayah)`, 30 for each Script.

`word.root_id` references `root`, and `word.root_letters` is dropped: a Word card's Root tag reads its letters from the Root. A database 0049's import loaded is brought to these tables by the next import, its Words' Root letters dropped once its Roots are loaded.

**Reads.** The Root dialog's `/roots/<id>.json`, `/data/v1/roots/<id>.json` and `/data/v1/juz.json` read these rows through Next's data cache (`src/quran/cached.ts`), keyed by the deployment as 0049's reads are, and tagged `roots` (and `root-<id>`) so that a later change to them has a tag to revalidate. Their routes prerender nothing, so `pnpm build` reads no database: a build with an unreachable `DATABASE_URL` succeeds. A Root id that is not a whole number written plainly (`01.json`, `one.json`) or that no Root has answers 404.

**Report.** The import still prints the builder's report: each Root disagreement between QUL and `roots.json`, with both sides' letters, and the Word-meaning gaps.

**Tests.** The Root scenarios that read the generated files read them as last committed, at 59abfe6, from git: the API parity check fetches each of the 1642 Root files and the Juz file and holds them to those bytes, and the mobile app's Root dialog and Juz tab are served by the site (`apps/mobile/features/served/`).
