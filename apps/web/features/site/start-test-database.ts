// `node features/site/start-test-database.ts`: start the site tests' own,
// empty Postgres (./test-database.ts) for the run on PORT, then apply the
// Account schema to it with `pnpm db:migrate` (DATABASE_URL set to it), so
// the production build serves Accounts from a ready database, and seed it
// with the few Allah references the site tests read (#147,
// ./allah-references.json) through the seed the owner runs. A seed that fails
// fails the run before the build, rather than leaving the site without gold.
// Then arrange the Iltifat the site tests expect (#138, ./arrange-iltifat.ts),
// and put in their Tafsir (#234, ./tafsir-in-the-test-database.ts), so the
// server reads it from its first request.
// playwright.config.ts's web server command runs this before the build.

import { execFileSync } from "node:child_process";
import { arrangeIltifat } from "./arrange-iltifat.ts";
import { putTafsirIn } from "./tafsir-in-the-test-database.ts";
import { startTestDatabase, testDatabase } from "./test-database.ts";

const db = testDatabase(Number(process.env.PORT));
await startTestDatabase(db);
console.log(`test-database: ${db.container} takes connections at ${db.url}`);

// No OPENAI_API_KEY: the site tests never read Quran Chat's index, so it is left empty rather than embedded by OpenAI (#77).
execFileSync("pnpm", ["run", "db:migrate"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: db.url, OPENAI_API_KEY: "" } });

execFileSync("pnpm", ["run", "db:seed-allah-references", "features/site/allah-references.json"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: db.url } });
await arrangeIltifat(db);
await putTafsirIn(db);
