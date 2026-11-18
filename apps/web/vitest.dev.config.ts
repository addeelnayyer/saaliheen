import { defineConfig } from "vitest/config";

// `pnpm dev`'s own Postgres (#170 AC-7, ADR 0041): Vitest runs features/dev/
// through @amiceli/vitest-cucumber, starting `pnpm dev` as a developer does,
// with Docker, on PORT: `PORT=3170 pnpm test:dev`. Its dev Postgres is
// renamed and moved for the run (DEV_DATABASE_NAME, DEV_DATABASE_PORT), so a
// developer's own is never touched. It uses the run's test Postgres too
// (features/site/test-database.ts), so it never runs beside `pnpm test:api`.
export default defineConfig({
  test: {
    include: ["features/dev/**/*.spec.ts"],
    environment: "node",
    fileParallelism: false,
    // `next dev` compiles each page on its first request.
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
});
