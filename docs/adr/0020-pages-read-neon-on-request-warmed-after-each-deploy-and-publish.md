Amended by [0046](0046-pages-read-each-surahs-passages-from-neon-under-its-own-cache-tag.md) and [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md): the stored content hash is `surah_content_hash`, written by the Passage load and by each Publish that changes a Surah file, and the manifest reads it.
Amended by [0041](0041-the-theme-load-carries-its-input-pages-are-warmed-by-a-script-and-pnpm-dev-runs-its-own-postgres.md): the warm-up is a script run after each deploy, and `pnpm dev` migrates only its own Postgres, never a `DATABASE_URL`.
Amended by [0024](0024-surah-pages-and-parts-take-any-params-so-a-refreshed-tag-renders-them.md): an Iltifat save refreshes every Surah page and part and warms none.
Amended by [0040](0040-pages-that-read-themes-render-on-request-and-are-the-error-page-for-a-second.md): a page rendered on request and then cached draws the error page itself, kept for a second, since Next.js shows no `error.tsx` for it.

# Pages read Neon on request, cached by tag and warmed after each deploy and publish

[0011](0011-all-data-in-neon-behind-the-versioned-api.md) moves every kind of data into Neon: the Quran text, Word meanings, Word counts, Recitation timings and Roots as well as Passages, Phrases and Themes. Today all of it reaches readers as prerendered pages and static files, so the move must not make reading slower. Every page that shows this data (Surah pages and Surah parts, Theme pages and Theme parts, the Root dialog's files, Share pages) is rendered on request through one server-side data layer, cached in Next's data cache under tags as the Iltifat pages are ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md)), and then served from that cache. Builds keep running without a database. To spare readers the first, uncached render, a warm-up requests every Surah and Theme page in both Languages after each deploy, and an Admin's publish revalidates its Surah's tags and requests that Surah's pages again. This amends [0016](0016-iltifat-pages-render-on-request-cached-by-tag.md) from "the Iltifat pages" to every page.

The Quran text is kept in normalized tables: Surahs, Ayahs, Words in both Scripts ([0002](0002-script-specific-quran-text.md)) with their Word meanings, Roots, Lemmas and Spellings ([0003](0003-qul-owns-word-analysis.md)) and Recitation timings, so that Quran Chat, Allah references and Marked Words can query them by Word location. A page's queries are only run on a cache miss. If a cold render still misses the bar below, a per-Surah prebuilt row is added as a cache table; the normalized tables stay the truth.

The QUL sources and `roots.json` are loaded by an import that replaces `pnpm dataset`: it is the builder's transform with its checks (matching Word locations in both Scripts, QUL owning Roots, every Ayah having a Theme), writing rows in one transaction instead of files. It runs with `db:migrate` before each deploy, stores a hash of the sources and does nothing when they are unchanged, so a deploy that touches no source costs nothing. Saaliheen's own data (Themes, Passages, Phrases) is not imported: each is loaded once by a content migration ([0015](0015-content-tables-and-recorded-content-migrations.md)) and its file deleted. `apps/web/data/generated/`, the `prebuild` step and the output trace of the Surah files are removed once the last kind has moved.

`/data/v1` keeps its URLs and JSON shapes for the mobile app. Each is a Route Handler reading the same data layer, sent with long CDN cache headers and revalidated by the same tags. Each Surah's content hash is stored as a column, written by the import and by each publish, so the manifest is one query and not a hash over every Surah per request.

Reading must stay as fast as today. A warmed page answers no slower than the static page it replaces; a cold render of the largest Surah (Al-Baqarah) takes under 500 ms on the server; Neon and the site's functions run in the same region.

## Consequences

- When Neon cannot be reached, a page in the cache is still served. A page never cached shows an error page with a retry. No static copy is kept as a fallback, since that would keep the second way to reach data that 0011 removes.
- `pnpm dev` starts the same `postgres:17` container the tests use, on a fixed port with its data kept between runs, and runs `db:migrate` and the import before Next starts. `DATABASE_URL` can point at a Neon branch instead.
- Dataset tests become import tests against each test run's own Postgres. Playwright and the mobile app's tests read that database through the site instead of the committed generated files.
- Each kind of data moves on its own, behind its existing page and API shapes: Themes, then Passages and Phrases, then the Quran text with its Word meanings and Word counts, then Recitation timings, then Roots.

## Considered Options

- Prerendering pages at build from Neon: no cold render at all, but the build needs a database, the deploy must migrate and import before it builds (so every migration must also suit the deploy still running), and every preview build needs a Neon branch.
- Rendering on request without a warm-up: the first reader of each page after a deploy or publish waits on Neon.
- One prebuilt JSON document per Surah as the only storage: one row per page, but nothing can query a Word location, and Quran Chat would need its own copy.
