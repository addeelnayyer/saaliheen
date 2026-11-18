// The API contract's server (#70, #60 § Testing Decisions): Vitest's global
// setup for features/api/ (vitest.api.config.ts). The API's HTTP contract is
// tested over HTTP against the production build, as the mobile app meets it,
// and a real Postgres, never mocks. Like the site tests' web server
// (playwright.config.ts), it starts the run's own, empty Postgres in Docker on
// a port derived from PORT (../site/test-database.ts), applies the Account
// schema to it with `pnpm db:migrate`, builds the standalone production build
// (E2E_SKIP_BUILD=1 serves an existing one without rebuilding), and serves it
// with `pnpm start:standalone` on PORT with the site tests' configuration
// (../site/admin-settings.ts), the Account test-only sign-in on. OpenAI is a
// fake of its embeddings endpoint (./fake-openai.ts), named in this process's
// environment, so `pnpm db:migrate`, the server and every script a feature
// runs embed Quran Chat's sources through it (#77). Claude is a fake of the
// Messages API (./fake-anthropic.ts), named the same way, so the server answers
// Quran Chat's questions through it (#78). The teardown stops the server and
// the fakes and removes the database.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { serveFakeAnthropic } from "./fake-anthropic.ts";
import { serveFakeOpenAi } from "./fake-openai.ts";
import { TEST_SERVER_SETTINGS } from "../site/admin-settings.ts";
import { startTestDatabase, stopTestDatabase, testDatabase } from "../site/test-database.ts";

/**
 * A reused build (E2E_SKIP_BUILD=1) keeps what earlier servers wrote into it:
 * every page and file they rendered on request, which the build never renders
 * — the Surah index, Juz index and Me, Surah pages, opening pages, Share
 * pages, Theme and Iltifat pages, Surah and Theme parts, the Passage editor's
 * Ayahs, the Root files, the /data/v1 Surah index, Surah files, Recitation
 * files, Root files, Juz file and manifest — and their data cache. The features that need cold pages
 * (vitest.api.config.ts's COLD_PAGES, and features/neon-rows/, which change
 * rows before any page reads them, #171) would find them already rendered,
 * from an earlier run's rows, so all are deleted: a reused build starts as
 * cold as a fresh one. The code each route runs, which sits beside its output,
 * stays.
 */
function forgetEarlierRuns() {
  const app = ".next/standalone/apps/web/.next/server/app";
  const forget = (dir: string) => rmSync(path.join(app, dir), { recursive: true, force: true });
  const forgetIn = (dir: string, rendered: (name: string) => boolean) => {
    const at = path.join(app, dir);
    if (existsSync(at)) for (const name of readdirSync(at)) if (rendered(name)) forget(path.join(dir, name));
  };
  for (const lang of ["ur", "en"]) {
    // The Surah index, `en.html`, `en.rsc`, `en.meta` and `en.segments/`.
    for (const kind of ["html", "rsc", "meta", "segments"]) forget(`${lang}.${kind}`);
    // Surah pages, `18.html` and the rest; the Juz index and Me, which list the Surahs (#172).
    forgetIn(lang, (name) => /^(\d+|juz|me)\.(html|rsc|meta|segments)$/.test(name));
    for (const dir of ["opening", "share", "themes", "iltifat"]) forget(path.join(lang, dir));
    forget(path.join("parts", lang));
  }
  // Each Surah file's, Recitation file's, Root file's and Passage editor Ayahs file's output, beside its [file] route's own code.
  for (const dir of ["data/v1/surahs", "data/v1/recitations", "data/v1/roots", "roots", "ayahs"]) forgetIn(dir, (name) => name !== "[file]");
  forgetIn("data/v1", (name) => ["manifest", "surahs.json", "juz.json"].some((file) => name.startsWith(file)));
  rmSync(".next/standalone/apps/web/.next/cache/fetch-cache", { recursive: true, force: true });
}

export default async function serveApi() {
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) throw new Error("serve-api: set PORT, e.g. `PORT=3070 pnpm test:api`");
  const openAi = await serveFakeOpenAi();
  process.env.OPENAI_BASE_URL = openAi.baseUrl;
  process.env.OPENAI_API_KEY = "fake-openai-key";
  const anthropic = await serveFakeAnthropic();
  process.env.ANTHROPIC_BASE_URL = anthropic.baseUrl;
  process.env.ANTHROPIC_API_KEY = "fake-anthropic-key";
  const closeFakes = () => Promise.all([openAi.close(), anthropic.close()]);
  const env = { ...process.env, ...TEST_SERVER_SETTINGS, NEXT_OUTPUT: "standalone", PORT: String(port), HOSTNAME: "127.0.0.1" };

  const db = testDatabase(port);
  await startTestDatabase(db);
  // Not execFileSync: the fake OpenAI answers on this process's event loop.
  const migrated = await new Promise<number | null>((resolve) =>
    spawn("pnpm", ["run", "db:migrate"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: db.url } }).on("exit", resolve),
  );
  if (migrated !== 0) {
    stopTestDatabase(db);
    await closeFakes();
    throw new Error("serve-api: `pnpm db:migrate` failed");
  }
  if (!process.env.E2E_SKIP_BUILD) execFileSync("pnpm", ["build"], { stdio: "inherit", env });
  else forgetEarlierRuns();

  const server = spawn("pnpm", ["start:standalone"], { env, detached: true, stdio: ["ignore", "ignore", "inherit"] });
  const stop = () => {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {
      // already gone
    }
    stopTestDatabase(db);
    void closeFakes();
  };

  // Ready once a Surah page serves, as the site tests' web server is.
  const ready = `http://127.0.0.1:${port}/ur/1`;
  const deadline = Date.now() + 120_000;
  for (;;) {
    const ok = await fetch(ready).then((res) => res.ok, () => false);
    if (ok) break;
    if (server.exitCode !== null || Date.now() > deadline) {
      stop();
      throw new Error(`serve-api: the production build did not serve ${ready}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return stop;
}
