import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

// The API and data contract (#60 § Testing Decisions, #70): Vitest runs the
// API's features (features/api/*.feature) through @amiceli/vitest-cucumber —
// one *.spec.ts beside each feature — over HTTP against the production build
// and the run's own Postgres, which the global setup (features/api/serve-api.ts)
// starts on PORT and removes afterwards: `PORT=3070 pnpm test:api`.
// `pnpm test` (vitest.config.ts) never collects these.

/** The features that need Theme pages no request has rendered yet: the warm-up's renders every one. */
const COLD_PAGES = ["features/api/themes-when-neon-is-unreachable.spec.ts"];

/** Vitest's own order, with the features that need cold pages first (#170). */
class ColdPagesFirst extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    const sorted = await super.sort(files);
    const cold = (file: TestSpecification) => COLD_PAGES.some((name) => file.moduleId.endsWith(name));
    return [...sorted.filter(cold), ...sorted.filter((file) => !cold(file))];
  }
}

export default defineConfig({
  test: {
    include: ["features/api/**/*.spec.ts"],
    environment: "node",
    globalSetup: ["features/api/serve-api.ts"],
    // One server and one database for the run: features share them, one at a time.
    fileParallelism: false,
    sequence: { sequencer: ColdPagesFirst },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
