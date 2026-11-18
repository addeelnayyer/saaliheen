// The import seam's own Postgres (#172 AC-8): Vitest's global setup for
// features/import/ (vitest.import.config.ts). The Quran import is tested
// against a real, empty Postgres of the run's own, never mocks: a postgres:17
// container named and published on a port derived from PORT, so relays on
// other ports never share one, and apart from the site and API seams' (it is
// `saaliheen-import-db-<PORT>` on 54<nnn>), so it may run beside them. Each
// scenario then makes the databases it needs inside it (./import-support.ts).
// The teardown removes the container.

import { startTestDatabase, stopTestDatabase, type TestDatabase } from "../site/test-database.ts";

/** The import seam's Postgres for the run serving on `sitePort` (3172 → port 54172). */
export function importDatabase(sitePort: number): TestDatabase {
  const port = 54_000 + (sitePort % 1_000);
  return {
    container: `saaliheen-import-db-${sitePort}`,
    port,
    url: `postgres://saaliheen:saaliheen-test@127.0.0.1:${port}/saaliheen_test`,
  };
}

export const runPort = () => {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error("import seam: set PORT, e.g. `PORT=3172 pnpm test:import`");
  return port;
};

export default async function startImportDatabase() {
  const db = importDatabase(runPort());
  await startTestDatabase(db);
  return () => stopTestDatabase(db);
}
