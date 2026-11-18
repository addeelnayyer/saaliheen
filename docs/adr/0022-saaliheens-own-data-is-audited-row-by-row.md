Fulfilled for Passages, Phrases and Passage revisions by [0047](0047-one-publish-writes-a-surahs-passages-phrases-and-allah-references-in-one-transaction.md): their tables are audited from the Passage load on.
Amended by [0038](0038-content-audit-rows-name-an-actor-set-per-transaction-and-refuse-change.md): the site's role owns the tables, so `content_audit` itself refuses every update, delete and truncate, and `iltifat_marked_word` is audited too.

# Every change to Saaliheen's own data is audited row by row in Neon

Once Passages, Phrases and Themes leave git ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)), nothing outside Neon keeps their history. Revisions record what an Admin published, but not a content migration's load, a seed or a hand-run fix. So every table of Saaliheen's own data (Passages, Phrases, Themes, Iltifat, Allah references and their revision tables) has Postgres triggers that write each insert, update and delete to one `content_audit` table: the table, the row's key, the operation, the row before and after as JSON, the time and the actor. The app sets the actor for each transaction to the Admin's Account id, or to `migration` or `seed`. A change made any other way is recorded as `unknown`. The site's database role may only insert into `content_audit`, never update or delete it. The source data (the Quran text, Word meanings, Recitation timings, Roots) is not audited, since the import rebuilds it from the repo.

## Consequences

- No dumps are taken. The audit protects against bad edits, but it lives in the same database. Losing the database is covered only by Neon's point-in-time recovery, within the plan's window.
- An audit row from a trigger cannot be skipped by a code path that forgets to write it, which an application-written log could be.

## Considered Options

- A nightly `pg_dump` kept outside Neon: covers losing the database, but rejected as more to run than this data needs.
- Revisions alone: they hold what Admins published, but not loads, seeds or fixes made outside the editors.
