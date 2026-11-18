Amends [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md) and [0040](0040-pages-that-read-themes-render-on-request-and-are-the-error-page-for-a-second.md).

# Pages read each Surah's Passages and Phrases from Neon under its own cache tag

Passages, Passage titles and Phrases live in Neon (#171, ADR 0011), in `passage` and `phrase`, each Surah's version in `passage_revision` and each Surah file's content hash in `surah_content_hash`. Every page and file that shows them reads them through one server-side module, `apps/web/src/passages/` (`passages.ts` reads, `cached.ts` keeps each read in Next's data cache keyed by the deployment, as the Themes' are), never the Passages or Phrases file and never what the generated Surah files still hold:

- One read per Surah, its Passages, Phrases and version, cached under the Surah's own tag, `passages:<n>`. A Surah is its generated file with Neon's Passages, Phrases and Phrase colours put in its place (`served-surah.ts`'s `withPassagesAndPhrases`), so the Surah page, its opening (the Surah bar's Passages), its parts, its Share pages (which runs may be shared, the edit strip's Passages, the Link preview), its `/data/v1` file and each Theme page's Passage groups all draw the same Passages. A page that reads a Surah's Passages carries its tag: a Theme page carries the tag of every Surah its Ayahs are in.
- The manifest names each Surah file by the hash Neon stores for it (ADR 0020's hash column, written by the Passage load and by each Publish), read once and cached under every Surah's tag, rather than hashing the 114 files. A Surah with no stored hash, which the load never leaves, is hashed as served.
- These pages render on request as ADR 0040 says; when Neon cannot answer and the page is not in the cache, the Share pages are the error page with Retry too, and their Link preview has no picture. A Surah part fails and its page's Retry asks again.
- After a Publish commits, `refreshSurahPassages(surah, origin)` (`refresh.ts`) expires the Surah's tag, which every page above carries, and once the answer has gone asks for the Surah's page and every Surah part in Urdu and English. The deploy's warm-up (`scripts/warm-up.ts`) asks for every Surah's, through the same list of addresses (`addresses.ts`).

## Consequences

- One tag per Surah keeps a Publish from making the other 113 Surahs' pages again; the manifest and the Theme pages pay for that with up to 115 tags each.
- A Theme page's first render reads each of its Surahs' Passages, one cached read per Surah.
- The manifest is only as right as the stored hashes: whatever changes a Surah file's bytes (a Publish, or a Theme change once Themes are published) must store its new hash.

## Considered Options

- One `passages` tag for every Surah: a Publish would make every Surah page, part and Share page again.
- Hashing the served files for the manifest, as ADR 0040 did: every manifest render would read all 114 Surahs' Passages and hash 114 files.
