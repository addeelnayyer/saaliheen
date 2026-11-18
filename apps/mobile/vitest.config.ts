import { defineConfig } from "vitest/config";

// The mobile app's scenarios (#72, #60 § Testing Decisions): Vitest runs
// features/*.feature through @amiceli/vitest-cucumber — one *.spec.ts beside
// each feature — in Node, driving the app's Quran Analysis (src/quran-analysis.ts)
// against the committed dataset served as /data/v1 by features/support.ts.
// The app's screens have no automated seam; they are checked by hand on iOS
// and Android simulators. features/served/ runs against the website itself,
// in Docker (vitest.served.config.ts, #172), so it is never collected here.
export default defineConfig({
  test: {
    include: ["features/**/*.spec.ts"],
    exclude: ["features/served/**", "**/node_modules/**"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
  },
});
