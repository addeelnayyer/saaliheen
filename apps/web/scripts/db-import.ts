// `pnpm db:import [<sources directory>]`: the Quran import (#172, ADR 0049)
// into the Postgres DATABASE_URL names, from a sources directory laid out as
// apps/web/data, that one when none is given (../src/quran/import.ts). It
// reports what the sources lack, as the builder's report does; a source that
// fails a check exits non-zero, naming it, having written nothing. `pnpm
// db:migrate` runs the same import before the content migrations.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { database } from "../src/database.ts";
import { importQuran, reportLines } from "../src/quran/import.ts";

if (!process.env.DATABASE_URL) throw new Error("db:import: set DATABASE_URL");
const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../data", import.meta.url));
const pool = database();
try {
  const outcome = await importQuran(pool, sourceDir);
  if (outcome.imported) {
    for (const line of reportLines(outcome)) console.log(`db:import: ${line}`);
    console.log(`db:import: imported ${outcome.words} Words from ${sourceDir} (sources ${outcome.sourcesHash})`);
  } else console.log(`db:import: the sources are unchanged (sources ${outcome.sourcesHash}); nothing written`);
} catch (error) {
  console.error(`db:import: ${error instanceof Error ? error.message : String(error)}; nothing written`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
