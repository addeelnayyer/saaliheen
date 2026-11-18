Amends [0037](0037-themes-are-three-content-tables-loaded-once.md).

# Theme categories and Themes keep the Themes file's order in a `position` column

The Themes list shows the 13 Theme categories in a fixed order and each category's Themes in the Themes file's order, as it did when it read the file ([#130](https://github.com/addeelnayyer/quran-word-by-word/issues/130)). [0037](0037-themes-are-three-content-tables-loaded-once.md)'s tables hold no order: a slug sorts them by name instead. So `theme_category` and `theme` each get a `position` column, `smallint unique check (position >= 1)`, and the Theme load writes each row's place in the file, from 1. The Themes list reads both tables `order by position nulls last, slug` (`apps/web/src/themes/themes.ts`).

The columns are added to the content migrations that create and load the tables (`apps/web/scripts/content/themes.ts`), not by a later one, since neither had run on any shared database when #170 added them. A later migration would have to `update` every row the load wrote, and the content audit ([0038](0038-content-audit-rows-name-an-actor-set-per-transaction-and-refuse-change.md)) would record each row twice where its load should be one insert.

## Consequences

- `position` is nullable: a Theme an Admin adds later without one sorts after every placed Theme, by slug, until it is given a place.
- 0037's consequence that an order for the Themes list comes with its own content migration no longer holds for this column.

## Considered Options

- Sorting by slug or English name: the list would no longer match what readers saw, which #170 promises it will.
- A later content migration adding the columns and filling them by `update`: the audit would show an update per row after each insert, and the content-audit test of the load (one insert per row, `after` equal to the row) would fail.
