# Iltifat live only in Neon, loaded once by a data migration

The Iltifat come from outside Saaliheen, like the QUL sources: M. A. S. Abdel Haleem's list of 326 turns of person (BSOAS 55/3, 1992), with a range of Ayahs and a short English reason for each written for Saaliheen. Under [0011](0011-all-data-in-neon-behind-the-versioned-api.md) the QUL sources stay in the repo and are imported before every deploy, because nobody edits them. The Iltifat are different: Admins mark their Words, correct their reasons and ranges, and set their Disputed tag in the Iltifat editor. So they are treated as Saaliheen's own data from the first day. A data migration loads the catalogue once into every database, and from then on Neon is the only place they are kept or changed, each save kept as a revision naming its Admin.

## Consequences

- The catalogue in the data migration is a starting point frozen in the repo, not a source to re-import: changing it does nothing to a database that has already run the migration. A correction is made in the Iltifat editor, or by a new data migration.
- Neon's backups are the only record of Admins' Marked Words and corrected reasons, as for Passages under [0011](0011-all-data-in-neon-behind-the-versioned-api.md).
- Every database, including local and test ones, has the same Iltifat after `db:migrate`, so tests and the website never read a JSON file for them.

## Considered Options

- Keep the catalogue as a committed source and import it before each deploy, like QUL: rejected, because every import would either overwrite the Admins' edits or need rules for merging them.
- Keep it as static JSON read by the website: rejected by [0011](0011-all-data-in-neon-behind-the-versioned-api.md), and it would put a rebuild behind every Marked Word.
