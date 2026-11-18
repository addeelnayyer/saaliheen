Follows [0057](0057-known-words-are-kept-by-their-letters-and-merged-per-entry-with-unmarks-kept.md), which keeps Known Roots by their letters for the same reason.

# A Root page is addressed by its letters, not QUL's id

A Root page (#227) is at `/{lang}/roots/{letters}`, the Root's letters with their spaces taken out (`/en/roots/رحم` for ر ح م), and the page reads its Root by those letters. Every `db:migrate` rebuilds the Roots from the sources ([0049](0049-db-migrate-imports-the-quran-from-the-committed-sources-before-the-content-migrations.md), [0050](0050-the-import-loads-the-roots-and-juz-lists-and-the-generated-dataset-is-gone.md)), so QUL's ids are not promised to stay put. A shared or bookmarked link to a Root page, unlike a Root file a Surah page fetches on the spot, is kept for years, and an id that moved would open another Root without any error. The letters name the Root for as long as Morphology does. The Root dialog's own file, `/roots/<id>.json`, keeps its id, because it is only ever fetched by a page built from the same import. So do a large Root page's Spelling parts (#288), `/parts/{lang}/roots/<id>/<Lemma>/<Spelling>/<part>.json`, fetched only by the page that names their Root by its letters.

Letters with no Root show the not-found page. A browser shows the letters in the address bar and percent-encodes them on the wire, and Next.js hands the page its segment still encoded, so the page decodes it; a segment that is not a whole encoding is not found too.

## Considered Options

- QUL's id (`/en/roots/1234`): short and ASCII, but an import that renumbers the Roots moves every shared link without anyone noticing.
- The transliteration (`/en/roots/rhm`): readable anywhere, but QUL's transliterations are not unique and are not what the Root is.
- Letters with their spaces as hyphens (`ر-ح-م`): no clearer than the bare letters, and one more spelling of the same Root to accept or redirect.
