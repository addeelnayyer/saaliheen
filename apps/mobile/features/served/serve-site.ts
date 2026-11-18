// The site the served scenarios read from (#172 AC-9): Vitest's global setup
// for features/served/ (vitest.served.config.ts). Since the Quran text, Word
// meanings, Ayah translations, the Surah index and Recitation timings live in
// Neon (#172), the app's Surah and Recitation scenarios are served by the
// website itself, as a phone meets it, never by a stand-in: this runs the
// website's API seam's global setup (apps/web/features/api/serve-api.ts),
// which starts the run's own Postgres in Docker on a port derived from PORT,
// runs `pnpm db:migrate` on it (which imports the Quran, ADR 0049), builds
// the production build (E2E_SKIP_BUILD=1 serves an existing one) and serves
// it on PORT. Its teardown stops the server and removes the database.
//
// serve-api.ts reads and runs everything relative to the website's own
// directory, so it runs there: the working directory is apps/web for the
// call, and the mobile app's again once the site serves.
//
// `PORT=3172 pnpm test:mobile-served`. The website's test:api (and
// test:neon-rows, test:dev) start the same Postgres container for a PORT:
// never run this beside them on one PORT.

import { fileURLToPath } from "node:url";
import serveApi from "../../../web/features/api/serve-api.ts";

/** The website's own directory, apps/web. */
const WEB = fileURLToPath(new URL("../../../web/", import.meta.url));

export default async function serveSite() {
  const mobile = process.cwd();
  process.chdir(WEB);
  try {
    return await serveApi();
  } finally {
    process.chdir(mobile);
  }
}
