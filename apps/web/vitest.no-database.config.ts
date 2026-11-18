import { defineConfig } from "vitest/config";

// Surah pages without Neon (#147 AC-11): Vitest runs features/no-database/
// through @amiceli/vitest-cucumber against a production build made and served
// with DATABASE_URL naming a Postgres no one listens on, which the global
// setup (features/no-database/serve-without-database.ts) builds and serves on
// PORT: `PORT=3147 pnpm test:no-database`. It replaces .next, so `pnpm
// test:e2e` runs it last, after the site and API tests.
export default defineConfig({
  test: {
    include: ["features/no-database/**/*.spec.ts"],
    environment: "node",
    globalSetup: ["features/no-database/serve-without-database.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
