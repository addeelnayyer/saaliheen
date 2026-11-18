// Surah pages without Neon (#147 AC-11): Vitest's global setup for
// features/no-database/ (vitest.no-database.config.ts). Builds the standalone
// production build with the site tests' configuration but DATABASE_URL naming
// a Postgres no one listens on, as if Neon were unreachable for the whole
// build, and serves it on PORT the same way. The teardown stops the server.
// It builds and serves without the app's signing settings, APPLE_TEAM_ID and
// ANDROID_SHA256, as a deploy that lacks them would (#76).

import { execFileSync, spawn } from "node:child_process";
import { TEST_SERVER_SETTINGS } from "../site/admin-settings.ts";

/** A Postgres address nothing listens on: Neon unreachable. */
export const UNREACHABLE = "postgres://saaliheen:unreachable@127.0.0.1:9/unreachable";

/** The app links' settings this server builds and serves without (#76). */
export const UNSET_APP_LINK_SETTINGS = ["APPLE_TEAM_ID", "ANDROID_SHA256"] as const;

export default async function serveWithoutDatabase() {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error("serve-without-database: set PORT, e.g. `PORT=3147 pnpm test:no-database`");
  const env = { ...process.env, ...TEST_SERVER_SETTINGS, DATABASE_URL: UNREACHABLE, NEXT_OUTPUT: "standalone", PORT: String(port), HOSTNAME: "127.0.0.1" } as NodeJS.ProcessEnv;
  for (const name of UNSET_APP_LINK_SETTINGS) {
    delete env[name];
    delete process.env[name];
  }

  execFileSync("pnpm", ["build"], { stdio: "inherit", env });
  const server = spawn("pnpm", ["start:standalone"], { env, detached: true, stdio: ["ignore", "ignore", "inherit"] });
  const stop = () => {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {
      // already gone
    }
  };

  // Ready once a page that reads nothing from Neon serves: with Neon unreachable,
  // a page that reads it may answer an error page (#170).
  const ready = `http://127.0.0.1:${port}/privacy`;
  const deadline = Date.now() + 120_000;
  for (;;) {
    const ok = await fetch(ready).then((res) => res.ok, () => false);
    if (ok) break;
    if (server.exitCode !== null || Date.now() > deadline) {
      stop();
      throw new Error(`serve-without-database: the production build did not serve ${ready}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return stop;
}
