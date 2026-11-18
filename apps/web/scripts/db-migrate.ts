// `pnpm db:migrate`, in the Postgres DATABASE_URL names: first the Account
// tables (#66), Better Auth's schema for the options the site runs with; then
// the Quran import from the committed sources (#172, ADR 0049), which writes
// nothing when they are unchanged; then Saaliheen's own content tables and
// data (#138, ADR 0015), each content migration run once per database and
// recorded (./content/migrate.ts), some reading the Surahs the import loads;
// last, Quran Chat's index is brought to the Ayah translations and the Tafsir
// (#77, ADR 0056), embedding only what changed, when OPENAI_API_KEY is set.

import { fileURLToPath } from "node:url";
import { getMigrations } from "better-auth/db/migration";
import { accountAuthOptions } from "../src/account/auth-options.ts";
import { database } from "../src/database.ts";
import { importQuran, reportLines } from "../src/quran/import.ts";
import { indexWhenKeyed } from "../src/quran-chat/sources.ts";
import { migrateContent } from "./content/migrate.ts";
import { CONTENT_MIGRATIONS } from "./content/migrations.ts";

if (!process.env.DATABASE_URL) throw new Error("db:migrate: set DATABASE_URL");
const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(accountAuthOptions());
await runMigrations();
console.log(`db:migrate: ${toBeCreated.length} tables created, ${toBeAdded.length} tables altered`);
const pool = database();
const imported = await importQuran(pool, fileURLToPath(new URL("../data", import.meta.url)));
if (imported.imported) for (const line of reportLines(imported)) console.log(`db:migrate: ${line}`);
console.log(`db:migrate: Quran ${imported.imported ? `imported (${imported.words} Words)` : "unchanged"}, sources ${imported.sourcesHash}`);
const ran = await migrateContent(pool, CONTENT_MIGRATIONS);
console.log(`db:migrate: ${ran.length} content migrations run${ran.length ? ` (${ran.join(", ")})` : ""}`);
console.log(`db:migrate: ${await indexWhenKeyed(pool)}`);
await pool.end();
