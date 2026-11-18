// The content audit (#170, ADR 0022, ADR 0038): one `content_audit` table,
// written by one trigger function attached to every table of Saaliheen's own
// data, and refusing every update, delete and truncate of its own rows,
// whoever asks. The actor is what the writing transaction named through
// src/content-audit.ts's setAuditActor, or `unknown`.

import type { PoolClient } from "pg";
import { AUDIT_ACTOR_SETTING } from "../../src/content-audit.ts";

/**
 * `content_audit`, its writer `content_audit_record()` and its guard; then
 * the Iltifat's three tables, made by earlier content migrations, audited.
 */
export async function createContentAudit(client: PoolClient): Promise<void> {
  await client.query(`
    create table content_audit (
      id bigint generated always as identity primary key,
      table_name text not null,
      row_key jsonb not null,
      operation text not null check (operation in ('insert', 'update', 'delete')),
      before jsonb,
      after jsonb,
      changed_at timestamptz not null default now(),
      actor text not null
    )`);
  // A row's history, looked up by its table and key.
  await client.query(`create index content_audit_by_row on content_audit (table_name, row_key)`);
  // The row's key is its primary key's columns, which auditTable passes as the trigger's arguments.
  await client.query(`
    create function content_audit_record() returns trigger language plpgsql as $$
    declare
      written jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    begin
      insert into content_audit (table_name, row_key, operation, before, after, actor)
      values (
        tg_table_name,
        (select jsonb_object_agg(k, written -> k) from unnest(tg_argv) as k),
        lower(tg_op),
        case when tg_op <> 'INSERT' then to_jsonb(old) end,
        case when tg_op <> 'DELETE' then to_jsonb(new) end,
        coalesce(nullif(current_setting('${AUDIT_ACTOR_SETTING}', true), ''), 'unknown')
      );
      return null;
    end $$`);
  // Statement triggers, so even a change that matches no row is refused.
  await client.query(`
    create function content_audit_refuse() returns trigger language plpgsql as $$
    begin
      raise exception 'content_audit rows cannot be changed or removed (%), ADR 0038', lower(tg_op)
        using errcode = 'insufficient_privilege';
    end $$`);
  await client.query(`create trigger content_audit_guard before update or delete or truncate on content_audit
    for each statement execute function content_audit_refuse()`);
  for (const table of ["iltifat", "iltifat_revision", "iltifat_marked_word"]) await auditTable(client, table);
}

/** Better Auth's Allah reference tables, which `db:migrate` makes before the content migrations, audited. */
export async function auditAllahReferences(client: PoolClient): Promise<void> {
  for (const table of ["allahReference", "allahReferenceRevision"]) await auditTable(client, table);
}

/** Audit every insert, update and delete on `table` in `content_audit`, keyed by its primary key. */
export async function auditTable(client: PoolClient, table: string): Promise<void> {
  const { rows } = await client.query<{ attname: string }>(
    `select a.attname from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
      where i.indrelid = $1::regclass and i.indisprimary
      order by array_position(i.indkey, a.attnum)`,
    [`public."${table}"`],
  );
  if (rows.length === 0) throw new Error(`content audit: "${table}" has no primary key to key its rows by`);
  const key = rows.map((r) => `'${r.attname}'`).join(", ");
  await client.query(`create trigger "${table}_audit" after insert or update or delete on "${table}"
    for each row execute function content_audit_record(${key})`);
}
