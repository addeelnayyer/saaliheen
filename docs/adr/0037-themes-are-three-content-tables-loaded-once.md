Amended by [0041](0041-the-theme-load-carries-its-input-pages-are-warmed-by-a-script-and-pnpm-dev-runs-its-own-postgres.md): the load reads its own frozen input, `apps/web/scripts/content/0008-load-themes-file.json`, once the Themes file is deleted.
Amended by [0039](0039-theme-categories-and-themes-keep-the-themes-files-order.md): `theme_category` and `theme` keep the Themes file's order in a `position` column.

# Themes are three content tables, loaded once from the Themes file

Themes move into Neon ([0011](0011-all-data-in-neon-behind-the-versioned-api.md), [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)) as three tables made by a content migration ([0015](0015-content-tables-and-recorded-content-migrations.md)), named and shaped after the Themes file ([0012](0012-themes-imported-once-from-quran-says.md)) so the load is a copy:

- **`theme_category`**: `slug` (primary key), `name_en`, `name_ur`.
- **`theme`**: `slug` (primary key), `category` (references `theme_category`), `name_en`, `name_ur`, `description`.
- **`ayah_theme`**: `surah`, `ayah`, `position` (the Theme's place in the Ayah's tagged order, from 1) and `theme` (references `theme`); primary key `(surah, ayah, position)`, and an Ayah names a Theme once, `unique (surah, ayah, theme)`.

A second content migration, `loadThemes(client, input?)` in `apps/web/scripts/content/themes.ts`, registered as `run: loadThemes`, loads the Themes file's categories, Themes and every Ayah's Themes. It takes over the checks `pnpm dataset` made: it refuses the whole load, naming the Ayah (and the Theme), when an Ayah of the Quran's 6,236 has no Theme or names a Theme the input does not hold, and since it runs inside its migration's transaction, a refused load writes no row and is not recorded as run.

## Consequences

- Every slug column is `collate "C"`: slugs sort by their bytes, the same on Neon, the tests' `postgres:17` and `pnpm dev`'s Postgres whatever their locale, where a locale's collation would skip the hyphens.
- Other columns a later slice needs, such as an order for the Themes list or a version an Admin's edit raises, come with their own content migration.
- The load's tests compare the tables with the Themes file as last committed before its deletion (`git show 5127e94:apps/web/data/themes.json`), so they outlive the file.

## Considered Options

- One JSON row holding the whole Themes file: one read for every page, but nothing could query an Ayah's Themes or a Theme's Ayahs, and an edit would rewrite all of it.
- An array of Theme slugs per Ayah: keeps tagged order without `position`, but no foreign key can hold its slugs to the `theme` table.
