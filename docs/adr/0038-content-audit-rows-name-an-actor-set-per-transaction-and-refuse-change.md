Amends [0022](0022-saaliheens-own-data-is-audited-row-by-row.md).

# content_audit rows name an actor set per transaction, and refuse every change after they are written

[0022](0022-saaliheens-own-data-is-audited-row-by-row.md) audits Saaliheen's own data in one `content_audit` table. Its shape: `id` (an identity, the order rows were written in), `table_name`, `row_key` (the row's primary key as a JSON object of its columns, `{"slug": "faith"}`, `{"surah": 2, "ayah": 255, "position": 1}`), `operation` (`insert`, `update` or `delete`), `before` and `after` (the whole row as JSON, `before` null for an insert and `after` null for a delete), `changed_at` and `actor`. One trigger function writes it, attached to every table of Saaliheen's own data: the Theme tables ([0037](0037-themes-are-three-content-tables-loaded-once.md)), `iltifat`, `iltifat_revision`, `iltifat_marked_word`, and Better Auth's `allahReference` and `allahReferenceRevision` ([0014](0014-allah-reference-tables.md)), the last two by a content migration of their own since Better Auth creates them.

The app names the actor for each transaction through one helper, `setAuditActor(client, actor)` in `apps/web/src/content-audit.ts`, inside the transaction it applies to: the content migrations name `migration`, the Allah reference seed `seed`, and an Admin's save or publish the Admin's Account id. The trigger records `unknown` for a transaction that named none, so a hand-run fix is still audited.

The site connects to Neon as the role that owns the tables and runs `db:migrate` (and to its test Postgres as a superuser), so grants alone cannot stop it rewriting the audit: an owner can grant itself back what is revoked, and a superuser skips grants. `content_audit` therefore refuses every update, delete and truncate itself, with triggers that raise, whoever asks; the site's role can only insert, which the audit triggers do.

## Consequences

- Removing audit rows, for a retention limit one day, means a content migration that drops the guard and puts it back in one transaction, and leaves a record of its own.
- `setAuditActor` sets the transaction-local setting `saaliheen.audit_actor`, which the trigger reads; the guard is a statement trigger, so a change that matches no row is refused too. An index on `(table_name, row_key)` finds a row's history.
- A write that forgets `setAuditActor` is still audited, as `unknown`, which a reviewer can find.

## Considered Options

- A second, less privileged role for the site, with `insert` only on `content_audit`: the strongest guard, but every environment (production, previews, `pnpm dev`, the tests) would need two connection strings and the role kept in step with each new table.
- Writing audit rows from the application: a code path that forgets one leaves no trace, which [0022](0022-saaliheens-own-data-is-audited-row-by-row.md) rejects.
