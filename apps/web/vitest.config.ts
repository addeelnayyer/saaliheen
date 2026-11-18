import path from "node:path";
import { defineConfig } from "vitest/config";

// Seam 1: Vitest runs the dataset features (features/dataset/*.feature) through
// @amiceli/vitest-cucumber — one *.spec.ts beside each feature — on the real
// sources, against the shared packages that build the dataset (#64). Playwright (seam 2) runs features/site/ and is never collected here.
export default defineConfig({
  // The website's own `@/` imports, as tsconfig.json maps them.
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    // Beside them, unit tests of the website's pure modules (src/**/*.test.ts), such as the Passage editor's Phrase edits (#100).
    include: ["features/dataset/**/*.spec.ts", "src/**/*.test.ts"],
    environment: "node",
    // The Script texts are 8 MB each; a full build takes seconds, not millis.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: "v8",
      // Seam 1 exercises the builder and the Passage rules (packages/); the reader
      // is exercised only through the pages (seam 2), so it scores 0% here and
      // CRAP ≤ 6 holds it to complexity ≤ 2. The admin area's logic (src/admin/,
      // #100) has unit tests of its own. UI code is held to complexity instead.
      // A "../../packages" glob matches nothing (paths outside the root never
      // match a relative pattern); "**/packages" does, with allowExternal.
      include: ["src/dataset/**/*.ts", "src/admin/**/*.ts", "**/packages/*/src/**/*.ts"],
      allowExternal: true,
    },
  },
});
