// The content audit as the run's Postgres holds it (#170, ADR 0022, ADR
// 0038): every insert, update and delete on a table of Saaliheen's own data
// is a row of `content_audit`, which no endpoint answers, so the API features
// read it here, directly.

import { expect } from "vitest";
import type { Pool } from "pg";
import { database } from "./support";

/** One row of `content_audit`. */
export interface AuditRow {
  id: number;
  table_name: string;
  row_key: Record<string, unknown>;
  operation: "insert" | "update" | "delete";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changed_at: Date;
  actor: string;
}

/** Whether `table` is a table of `db`. */
export async function hasTable(table: string, db: Pool = database()): Promise<boolean> {
  const { rows } = await db.query<{ t: string | null }>(`select to_regclass($1)::text as t`, [`public."${table}"`]);
  return rows[0].t !== null;
}

/** Fails, naming it, unless db:migrate made `content_audit`. */
export async function expectAudit() {
  expect(await hasTable("content_audit"), "db:migrate made the table `content_audit`").toBe(true);
}

/** The id of the latest audit row, 0 when there is none: a mark to read the rows written after. */
export async function auditMark(): Promise<number> {
  await expectAudit();
  const { rows } = await database().query<{ id: string | null }>(`select max(id)::text as id from content_audit`);
  return Number(rows[0].id ?? 0);
}

/** Every audit row written after `mark`, of `table` when one is given, in the order they were written. */
export async function auditRowsSince(mark: number, table?: string): Promise<AuditRow[]> {
  await expectAudit();
  const { rows } = await database().query<AuditRow>(
    `select * from content_audit where id > $1 and ($2::text is null or table_name = $2) order by id`,
    [mark, table ?? null],
  );
  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}

/** The columns of `table`'s primary key, in key order. */
export async function primaryKeyOf(table: string): Promise<string[]> {
  expect(await hasTable(table), `the table \`${table}\``).toBe(true);
  const { rows } = await database().query<{ attname: string }>(
    `select a.attname from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
      where i.indrelid = $1::regclass and i.indisprimary
      order by array_position(i.indkey, a.attnum)`,
    [`public."${table}"`],
  );
  return rows.map((r) => r.attname);
}

/** A row's key as `content_audit` records it: its primary key's columns and values. */
export async function keyOf(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  return Object.fromEntries((await primaryKeyOf(table)).map((column) => [column, row[column]]));
}
