// The site tests' own Postgres (#66): Accounts live in Neon Postgres (ADR
// 0008), which the site tests cannot reach, so each run serves the production
// build against a fresh, empty Postgres in a Docker container of its own,
// named and published on a port derived from the run's PORT so that relays on
// other ports never share one. start-test-database.ts starts it before the
// build (playwright.config.ts's web server command); the global teardown
// (stop-test-database.ts) removes it.

import { execFileSync } from "node:child_process";

/** The image the container runs: Neon's default Postgres major version, with pgvector, which Neon has, for Quran Chat's index (#77). */
const POSTGRES_IMAGE = "pgvector/pgvector:pg17";

export interface TestDatabase {
  /** The Docker container's name. */
  container: string;
  /** The port on 127.0.0.1 the container's Postgres is published on. */
  port: number;
  /** The connection string the site reads as DATABASE_URL. */
  url: string;
}

/** The test database of the run serving on `sitePort` (3066 → port 53066). */
export function testDatabase(sitePort: number): TestDatabase {
  const port = 50_000 + (sitePort % 10_000);
  return {
    container: `saaliheen-test-db-${sitePort}`,
    port,
    url: `postgres://saaliheen:saaliheen-test@127.0.0.1:${port}/saaliheen_test`,
  };
}

const docker = (args: string[]) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Remove the run's container, if one is left over or running. */
export function stopTestDatabase(db: TestDatabase) {
  try {
    docker(["rm", "-f", db.container]);
  } catch {
    // no such container
  }
}

/** Start a fresh, empty Postgres for the run and wait until it takes connections. */
export async function startTestDatabase(db: TestDatabase) {
  if (!(db.port > 50_000)) throw new Error("test-database: set PORT, e.g. `PORT=3066 pnpm test:e2e`");
  stopTestDatabase(db);
  docker([
    "run", "-d", "--rm",
    "--name", db.container,
    "-p", `127.0.0.1:${db.port}:5432`,
    "-e", "POSTGRES_USER=saaliheen",
    "-e", "POSTGRES_PASSWORD=saaliheen-test",
    "-e", "POSTGRES_DB=saaliheen_test",
    "--tmpfs", "/var/lib/postgresql/data",
    POSTGRES_IMAGE,
  ]);
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      // -h 127.0.0.1: the image's first, socket-only start answers pg_isready too early.
      docker(["exec", db.container, "pg_isready", "-h", "127.0.0.1", "-U", "saaliheen", "-d", "saaliheen_test"]);
      return;
    } catch (error) {
      if (Date.now() > deadline) throw new Error(`test-database: ${db.container} did not take connections in 60s`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
