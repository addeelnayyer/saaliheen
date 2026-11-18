// The World of the served scenarios (#172 AC-9, #173): the app launched with
// the site the global setup (./serve-site.ts) serves on PORT as its data
// origin, as a build is given EXPO_PUBLIC_DATA_ORIGIN, never a stand-in.

import { World } from "../support.ts";

/** The site the global setup serves on PORT: the app's data origin. */
export function siteOrigin(): string {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error("set PORT, e.g. `PORT=3172 pnpm test:mobile-served`");
  return `http://127.0.0.1:${port}`;
}

/**
 * The World against the site: its origin is the site's, never a stand-in, so
 * nothing it serves is held, deployed or failed, and it records no request on
 * the site's side (`received` stays empty; `record()` records the app's own
 * fetches). The global setup's teardown stops the site.
 */
export class SiteWorld extends World {
  override async start() {
    this.data ??= { origin: siteOrigin(), received: [], close: async () => {} } as unknown as World["data"];
  }
}
