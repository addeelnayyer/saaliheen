import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

/**
 * The features that change rows by SQL with no Publish to refresh what pages
 * cached (passages-read-from-neon), first: they need a server that has cached
 * nothing yet, not even the manifest, which every Surah's tag keys. The rest
 * follow in Vitest's own order.
 */
const FIRST = ["passages-read-from-neon.spec.ts"];
class FreshServerFirst extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    const first = (f: TestSpecification) => FIRST.some((name) => f.moduleId.endsWith(`/${name}`));
    const sorted = await super.sort(files);
    return [...sorted.filter(first), ...sorted.filter((f) => !first(f))];
  }
}

// Rows changed in Neon (#171): Vitest runs features/neon-rows/ through
// @amiceli/vitest-cucumber over HTTP, and in Chromium, against the production
// build and the run's own Postgres, which the API seam's global setup
// (features/api/serve-api.ts) starts on PORT: `PORT=3171 pnpm test:neon-rows`.
// It is a seam of its own because its features change rows by SQL before any
// page reads them, so they need a server no other feature has asked for a
// page yet: the API seam's features render and cache every Surah page (its
// warm-up) and every /data/v1 file. A reused build (E2E_SKIP_BUILD=1) starts
// as cold as a fresh one (serve-api.ts's forgetEarlierRuns), so `pnpm
// test:e2e` runs it after `pnpm test:api`, on the same build and PORT, never
// beside it.
export default defineConfig({
  test: {
    include: ["features/neon-rows/**/*.spec.ts"],
    environment: "node",
    globalSetup: ["features/api/serve-api.ts"],
    // One server and one database for the run: features share them, one at a time.
    fileParallelism: false,
    sequence: { sequencer: FreshServerFirst },
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
