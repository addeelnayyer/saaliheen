// The Iltifat the site tests arrange before the build (#138): an edit an Admin
// will be able to make once the Iltifat editor exists, made here directly in
// the run's own Postgres after `pnpm db:migrate` loaded the catalogue.
//
// No two Iltifat of the catalogue share both their Iltifat direction and their
// run, so to show how a direction page holds a shared run, the two We → He
// Iltifat cited at 35:31 and 35:32 (each a run of one Ayah in the catalogue)
// are given the run 35:31–32. The counts stay as the catalogue's.
// start-test-database.ts runs this; it does nothing while db:migrate makes no
// `iltifat` table, so that the site still builds and serves.

import { Pool } from "pg";
import type { TestDatabase } from "./test-database.ts";

export async function arrangeIltifat(db: TestDatabase) {
  const pool = new Pool({ connectionString: db.url, max: 1 });
  try {
    const table = await pool.query<{ t: string | null }>(`select to_regclass('public.iltifat')::text as t`);
    if (table.rows[0].t !== "iltifat") {
      console.log("arrange-iltifat: no `iltifat` table yet; nothing arranged");
      return;
    }
    const done = await pool.query(
      `update iltifat set ayah_from = 31, ayah_to = 32
        where from_person = 'first' and to_person = 'third' and surah = 35 and cited_ayah in (31, 32)`,
    );
    console.log(`arrange-iltifat: gave ${done.rowCount} We → He Iltifat the run 35:31–32`);
  } finally {
    await pool.end();
  }
}
