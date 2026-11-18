// Playwright's global teardown (playwright.config.ts): remove the run's own
// Postgres (./test-database.ts) once every scenario has run.

import { stopTestDatabase, testDatabase } from "./test-database";

export default function globalTeardown() {
  stopTestDatabase(testDatabase(Number(process.env.PORT)));
}
