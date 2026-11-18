// `pnpm db:seed-allah-references <file>` (#147, ADR 0012, ADR 0014): the
// one-off seed that loads the owner's JSON array of Word locations into the
// Postgres DATABASE_URL names (Neon), exactly as given, in one transaction, with
// one seed revision per Surah. It refuses the whole file, naming them, when any
// entry is not a Word of the Quran text, and exits non-zero having written
// nothing. Running it again with the same file leaves every row as it was. The
// owner's file is committed as data/allah-references.json:
// `pnpm db:seed-allah-references data/allah-references.json`.

import fs from "node:fs";
import { accountDatabase } from "../src/account/database.ts";
import { fileLocations, seedAllahReferences, SeedRefused } from "../src/allah-references/seed.ts";
import { readAyahWordCounts } from "../src/quran/quran.ts";

const file = process.argv[2];
if (!file) throw new Error("db:seed-allah-references: name the file, e.g. `pnpm db:seed-allah-references allah-references.json`");
if (!process.env.DATABASE_URL) throw new Error("db:seed-allah-references: set DATABASE_URL");

const pool = accountDatabase();
try {
  // Each Surah's Word counts as Neon holds them, which the import loads (ADR 0049).
  const counts = await readAyahWordCounts(pool);
  const wordCounts = (surah: number) => counts[surah - 1];
  const { loaded, unchanged } = await seedAllahReferences(pool, fileLocations(fs.readFileSync(file, "utf8"), wordCounts));
  console.log(`db:seed-allah-references: ${loaded.length} Surahs loaded, ${unchanged.length} already as the file has them`);
} catch (error) {
  if (!(error instanceof SeedRefused)) throw error;
  console.error(`db:seed-allah-references: refused: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
