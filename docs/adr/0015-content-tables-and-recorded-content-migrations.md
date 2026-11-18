# Saaliheen's content tables change through recorded, run-once content migrations

`pnpm db:migrate` has two steps. The Account tables keep their path: Better Auth compares its schema with the database and adds what is missing ([0008](0008-reader-data-in-neon-behind-a-nextjs-api.md)). Saaliheen's own content, starting with the Iltifat ([0012](0012-iltifat-live-only-in-neon.md)), goes through **content migrations** instead: an ordered, append-only list in `apps/web/scripts/content/migrations.ts`, each either a table change or a data load. Each runs in its own transaction, under an advisory lock, and that transaction also writes its name into the `content_migration` table (`name` primary key, `ran_at`). A migration already named there is skipped, so running `db:migrate` again changes no row of any table, and data an Admin has edited since a load is never loaded over. A shipped migration is never edited, renamed or removed; a correction is a new one.

The first two create and load the Iltifat. The `iltifat` table has one row per Iltifat: `id` (an integer, the entry's position in the catalogue from 1, and the fragment its Iltifat page uses), `from_person` and `to_person` (`first`, `second` or `third`, as in the catalogue, which together make its Iltifat direction), `surah`, `ayah_from` and `ayah_to` (its run), `cited_ayah` (the `verse` of the catalogue's `verse_url`), `reason`, `disputed`, `section` (Abdel Haleem's section) and `version` (1 when loaded, raised by each save). The catalogue's `reason_basis` and `sources` are not kept. Check constraints hold every row, an Admin's later edit included, to a Surah from 1 to 114, a run that starts at Ayah 1 or later and does not end before it starts, and a cited Ayah within the run. Quran order is `surah, ayah_from, ayah_to, cited_ayah, id`.

## Consequences

- The catalogue is read only by its data migration (`apps/web/scripts/content/iltifat.ts`); the website reads the table through `apps/web/src/iltifat/`.
- Checking that a run ends within its Surah's last Ayah is left to the load's own test and to the editor, since the table holds no Surah lengths.

## Considered Options

- Re-running an idempotent upsert of the catalogue on every `db:migrate`, as [0011](0011-all-data-in-neon-behind-the-versioned-api.md) does for the QUL sources: rejected, because it would overwrite Admins' edits ([0012](0012-iltifat-live-only-in-neon.md)).
- `create table if not exists` for the content tables, with only data loads recorded: rejected, because a later column change would then need its own guard, while a recorded migration needs none.
- A migration tool (drizzle-kit, node-pg-migrate): rejected for now; the runner is about forty lines over `pg`, which the site already uses.
