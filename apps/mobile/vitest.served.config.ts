import { defineConfig } from "vitest/config";

// The mobile app's scenarios against the website itself (#172 AC-9): Vitest
// runs features/served/*.feature through @amiceli/vitest-cucumber — one
// *.spec.ts beside each feature — in Node, driving the app's Quran Analysis
// (src/quran-analysis.ts) and Recitation (src/recitation.ts) with their data
// origin set to the site, as a build is given EXPO_PUBLIC_DATA_ORIGIN. The
// global setup (features/served/serve-site.ts) serves the website's
// production build on PORT against the run's own Postgres in Docker, with the
// Quran imported into it, and removes it afterwards:
// `PORT=3172 pnpm test:mobile-served`, never beside the website's test:api on
// one PORT. `pnpm test` (vitest.config.ts) never collects these: it runs
// without Docker.
export default defineConfig({
  test: {
    include: ["features/served/**/*.spec.ts"],
    environment: "node",
    globalSetup: ["features/served/serve-site.ts"],
    // One site and one database for the run: features share them, one at a time.
    fileParallelism: false,
    // A cold Surah file is read from Neon on its first request.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
