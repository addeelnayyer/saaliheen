// Who changes Saaliheen's own data (#170, ADR 0022, ADR 0038): every write to
// a content table is audited in `content_audit` by a trigger, which records
// the actor its transaction named here, or `unknown`.

import type { Pool, PoolClient } from "pg";

/** The transaction-local setting the audit trigger reads the actor from. */
export const AUDIT_ACTOR_SETTING = "saaliheen.audit_actor";

/**
 * Within `client`'s open transaction, name `actor` (an Admin's Account id,
 * `migration` or `seed`) as who makes its changes, until it ends.
 */
export async function setAuditActor(client: PoolClient, actor: string): Promise<void> {
  await client.query(`select set_config($1, $2, true)`, [AUDIT_ACTOR_SETTING, actor]);
}

/** The Admin who saves: their Account id, the actor the save is audited under, and their email, its revision's author. */
export interface SavingAdmin {
  id: string;
  email: string;
}

/**
 * Run `save` in one transaction audited under `admin`'s Account id, committed
 * when it saved and rolled back otherwise, or when it throws: an Admin's save
 * writes its row and its revision together, or neither.
 */
export async function inAdminSave<T extends { kind: string }>(pool: Pool, admin: SavingAdmin, save: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, admin.id);
    const outcome = await save(client);
    await client.query(outcome.kind === "saved" ? "commit" : "rollback");
    return outcome;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
