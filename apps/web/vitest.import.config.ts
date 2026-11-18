import { defineConfig } from "vitest/config";

// The Quran import (#172 AC-8): Vitest runs features/import/ through
// @amiceli/vitest-cucumber against the run's own Postgres, which the global
// setup (features/import/import-database.ts) starts in Docker on a port
// derived from PORT and removes afterwards: `PORT=3172 pnpm test:import`. The
// import runs as `pnpm db:migrate` and the deploy run it, as a process of its
// own on a directory of sources, so its exit status is what the steps read.
// `pnpm test` (vitest.config.ts) never collects these.
export default defineConfig({
  test: {
    include: ["features/import/**/*.spec.ts"],
    environment: "node",
    globalSetup: ["features/import/import-database.ts"],
    // One Postgres for the run: features make their own databases in it, one feature at a time.
    fileParallelism: false,
    // Each import reads the two 8 MB Script texts and writes every Word.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
