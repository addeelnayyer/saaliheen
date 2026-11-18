// Saaliheen's database (ADR 0008, ADR 0011): Postgres at DATABASE_URL, one pool
// per server, shared by the Accounts (./account/) and Saaliheen's own content,
// such as the Iltifat (./iltifat/). An idle connection the database drops is
// logged, never fatal.

import { Pool } from "pg";

let pool: Pool | undefined;

export function database(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on("error", (error) => console.error("Database:", error.message));
  }
  return pool;
}
