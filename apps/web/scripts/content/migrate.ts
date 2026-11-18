// Saaliheen's own content tables and data (#138, ADR 0015), the second step of
// `pnpm db:migrate` after the Account tables. Each content migration, whether
// it changes a table or loads data, runs once per database: it runs in its own
// transaction, which also records its name in "content_migration", and a
// migration already recorded is skipped. So running db:migrate again changes
// nothing, and an Admin's later edit to a loaded row is never overwritten.
// Each names `migration` as the actor its changes are audited under (ADR 0038).

import type { Pool, PoolClient } from "pg";
import { setAuditActor } from "../../src/content-audit.ts";

/** One change to the content tables or their data, named for the record it leaves. */
export interface ContentMigration {
  /** Its name in "content_migration"; never changed or reused once shipped. */
  name: string;
  run(client: PoolClient): Promise<void>;
}

/** Serialises concurrent `db:migrate` runs against one database. */
const LOCK = "select pg_advisory_xact_lock(hashtext('content_migration'))";

/** Run every content migration not yet recorded, in order; the names of those it ran. */
export async function migrateContent(pool: Pool, migrations: readonly ContentMigration[]): Promise<string[]> {
  await pool.query(
    `create table if not exists content_migration (name text primary key, ran_at timestamptz not null default now())`,
  );
  const ran: string[] = [];
  for (const migration of migrations) ran.push(...(await runOnce(pool, migration)));
  return ran;
}

/**
 * The names of `migrations` not yet recorded, in order: all of them when no
 * migration has run. Read only, so it can be asked of a database that must
 * not be migrated from here, such as production's from a preview (ADR 0041).
 */
export async function pendingContentMigrations(pool: Pool, migrations: readonly ContentMigration[]): Promise<string[]> {
  const table = await pool.query<{ exists: boolean }>(`select to_regclass('content_migration') is not null as exists`);
  const rows = table.rows[0].exists ? (await pool.query<{ name: string }>(`select name from content_migration`)).rows : [];
  const recorded = new Set(rows.map((r) => r.name));
  return migrations.map((m) => m.name).filter((name) => !recorded.has(name));
}

/** Run `migration` and record it in one transaction, unless it is recorded already; its name if it ran. */
async function runOnce(pool: Pool, migration: ContentMigration): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(LOCK);
    const ran = await runIfDue(client, migration);
    await client.query("commit");
    return ran;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Within `client`'s transaction, run `migration` and record it unless it is recorded already; its name if it ran. */
async function runIfDue(client: PoolClient, migration: ContentMigration): Promise<string[]> {
  const recorded = await client.query(`select 1 from content_migration where name = $1`, [migration.name]);
  if (recorded.rowCount !== 0) return [];
  await setAuditActor(client, "migration");
  await migration.run(client);
  await client.query(`insert into content_migration (name) values ($1)`, [migration.name]);
  return [migration.name];
}
