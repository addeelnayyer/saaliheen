Amended by [0041](0041-the-theme-load-carries-its-input-pages-are-warmed-by-a-script-and-pnpm-dev-runs-its-own-postgres.md): the Theme load carries the Themes file as its own input, and the Themes file, the import and the builder's Themes are deleted.
Amended by [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md): Themes are loaded once by a content migration ([0015](0015-content-tables-and-recorded-content-migrations.md)), not by the idempotent import.

# Themes are Saaliheen's own data, imported once from quran-says

Every Ayah's Themes come from quran-says, Saaliheen's earlier project, which tagged all 6,236 Ayahs with a vocabulary of 263 tags. Rather than read quran-says on every build, a one-off script (`apps/web/scripts/import-themes.ts`, run with `pnpm --dir apps/web import-themes`) reads its two CSV files once and writes `apps/web/data/themes.json`, the Themes file. From then on the Themes file is Saaliheen's own data and quran-says is no longer a source. The file is interim: Themes are a kind of data [0011](0011-all-data-in-neon-behind-the-versioned-api.md) has not moved yet, so until they move into Neon the Themes file is static JSON in the repo, kept under [0001](0001-static-quran-dataset.md)'s rules like the Passages file.

The import cleans the vocabulary up as it goes: Polytheists, Hypocrites, Disbelievers and Believers merge into Polytheism, Hypocrisy, Disbelief and Faith; Neighbours, which no Ayah needs on its own, is dropped; and Heaven is renamed Paradise. That leaves 258 Themes in 13 Theme categories. quran-says has no Urdu names, so the script carries drafted Urdu names for every Theme and Theme category, for a Scholar to check. Rerunning the script on the same quran-says files writes the same Themes file byte for byte.

The Themes file holds `categories` (slug, English and Urdu names), `themes` (slug, names, category and a short English description) and `ayahs` (each Ayah's Theme slugs in tagged order). `pnpm dataset` reads it like the Passages file and refuses to build when an Ayah has no Theme or names one the file does not hold; it gives each Ayah its Themes and each Theme its Ayah count and the Passage groups its Theme page shows. The descriptions are kept for the Themes list (#130) and Link previews (#132) and are not shown yet.

## Consequences

- Until Themes move into Neon, changing a Theme, its Urdu name or an Ayah's Themes is an edit of the Themes file, reviewed like any other commit; after the move it is an Admin publish with a revision, as 0011 sets out.
- The Themes file is one more kind of static JSON data, and it will need moving. Under [0011](0011-all-data-in-neon-behind-the-versioned-api.md) Themes move into Neon behind the versioned API like the rest, loaded once from the Themes file by a content migration ([0015](0015-content-tables-and-recorded-content-migrations.md)) and held only in Neon from then on; the Theme pages then read them through the server-side data layer.
- In this first slice every Theme page is built statically and whole. Opening a long Theme page in parts (#131) reuses the Surah-part mechanism of [0005](0005-surahs-open-in-parts-inside-the-app.md), with a direct load still getting the whole page.
- A Theme page's Arabic is static text and is never selectable ([0004](0004-static-text-is-unselectable.md)); Theme chips are links and name a Theme only, never its description.
- quran-says can change or disappear without affecting Saaliheen; the import script is kept only as the record of how the file was first made.

## Considered Options

- Read quran-says at build time: keeps one copy of the tags, but ties every build to a second repository and leaves the cleanup to be repeated on every build.
- Copy the CSVs as they are: keeps the merged and dropped tags and has no Urdu names, so the cleanup would still be needed in the builder.
