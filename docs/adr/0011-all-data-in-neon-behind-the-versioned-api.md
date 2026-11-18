# All of Saaliheen's data lives in Neon behind the versioned API

Saaliheen now has two clients, the website and the mobile app, and its own data keeps growing: Passages and Passage titles, Phrases, Themes, Recitation timings, and soon Quran Chat's sources. Keeping that data as JSON files in the repo means two ways to reach it (static files for one kind, `/api/v1` for reader data, [0008](0008-reader-data-in-neon-behind-a-nextjs-api.md)), a full rebuild before any Admin edit reaches readers ([0006](0006-admin-edits-to-passages-are-commits.md)), and a build that grows with every new kind of data. So every kind of data moves into Neon Postgres, the same database as reader data, and both clients reach it through the versioned API. The website's pages read it on the server through one data layer, and the mobile app reads it over `/api/v1`. This supersedes [0001](0001-static-quran-dataset.md) and [0006](0006-admin-edits-to-passages-are-commits.md), and the part of [0008](0008-reader-data-in-neon-behind-a-nextjs-api.md) that kept the Quran dataset and Passages static.

The QUL sources and `roots.json` stay in the repo, unedited, as the record of where the Quran text came from. An import script reads them, keeps [0002](0002-script-specific-quran-text.md)'s and [0003](0003-qul-owns-word-analysis.md)'s checks (matching Word locations in both Scripts; QUL owns Roots, Lemmas and counts), and loads the result into Neon. Like `pnpm db:migrate`, the import runs before each production deploy, and loading the same sources twice leaves the same rows. Nothing calls Quran.com or QUL while the site is running.

Saaliheen's own data — Passages, Phrases and Themes — is held only in Neon from then on. An Admin's publish writes rows in one transaction, with the same rules as before: Passages cover each Ayah of a Surah exactly once, Phrases never overlap ([0009](0009-phrases-are-hand-marked-and-never-overlap.md)), and a publish made against an older version is refused. Every publish is kept as a revision naming its Admin, so the history and undo that git gave us are kept too.

Pages stay fast by caching: a page is served from the cache and revalidated when a publish or an import changes the data it shows, so readers no longer wait for a deploy. The API stays versioned, and the manifest of content hashes ([0008](0008-reader-data-in-neon-behind-a-nextjs-api.md)) is computed from the rows, so installed apps still know which offline Surahs are stale ([0005](0005-surahs-open-in-parts-inside-the-app.md) and offline reading are unchanged for readers).

## Consequences

- The website depends on Neon being up for anything not already cached, and Neon needs backups of Saaliheen's own data, which until now git held.
- Admin edits reach readers when the cache is revalidated, not after a rebuild. A Scholar reviews them in the Admin area's revision history instead of in commits.
- The move happens one kind of data at a time, each behind the existing API shapes so neither client notices. Until a kind has moved, its JSON file and 0001's rules still apply to it.
- The dataset tests become import tests: they load the committed sources into a test database and check the rows, not the generated JSON.

## Considered Options

- Keep the static dataset ([0001](0001-static-quran-dataset.md), [0008](0008-reader-data-in-neon-behind-a-nextjs-api.md)): fastest and cheapest to serve, but it leaves two ways to reach data and a rebuild behind every Admin edit. It also means a new kind of data (Themes) gets a third shape before it gets an editor.
- Move only Saaliheen's own data and keep the Quran text static: the Quran text never changes, but Theme pages, Phrases and Quran Chat all join it with Saaliheen's own data. Splitting the two across files and a database would bring back the two access paths this decision removes.
- A separate data service or a second database for Quran data: rejected for the same reasons [0008](0008-reader-data-in-neon-behind-a-nextjs-api.md) kept one Next.js app and one Neon database.
