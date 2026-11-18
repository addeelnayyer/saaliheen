// Playwright's last global setup: once the run's Postgres is arranged
// (./passages-in-the-test-database.ts), warm the test server as the deploy
// warms each deployment (`pnpm warm-up`, ADR 0020, ADR 0041). Surah pages read
// the Quran from Neon (#172), so the build no longer makes them; unwarmed,
// every worker would wait on Al-Baqarah's first render at once.

import { execFileSync } from "node:child_process";
import { testDatabase } from "./test-database";

export default function warmUpTheTestServer() {
  const port = Number(process.env.PORT);
  execFileSync("pnpm", ["run", "warm-up", `http://127.0.0.1:${port}`], { stdio: "inherit", env: { ...process.env, DATABASE_URL: testDatabase(port).url } });
}
