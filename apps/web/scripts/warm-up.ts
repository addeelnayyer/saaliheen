// `pnpm warm-up <origin>`, run by the deploy against each new deployment
// (.github/workflows/deploy.yml, ADR 0020, ADR 0041), with that deployment's
// DATABASE_URL: it requests every Theme page, by the slugs the `theme` table
// holds, every Surah page and every Surah part (#171), 1 to 114, cut by the
// Word counts the database holds (#172), and the Surah index, its Juz tab and
// Me, which list the Surahs from it, each in Urdu and in English, so each is
// rendered once into the cache before a reader asks (ADR 0040). It fails,
// naming each address, when one does not answer 200 or a page answers the
// error page, which says 200 too but is never indexed (ADR 0040). With
// VERCEL_AUTOMATION_BYPASS_SECRET set it sends Vercel's protection bypass
// header, so a protected preview can be warmed.
//
// First it asks the database which content migrations it has not had
// (./content/migrate.ts), and whether it has had the Quran import, which
// `pnpm db:migrate` runs before them: pages that read their tables cannot
// render until `pnpm db:migrate` runs there. It names them and fails, as
// production's deploy must, having just migrated; with --skip-when-unmigrated it warms
// nothing and succeeds instead, for a preview, which shares production's
// database and never migrates it (ADR 0041), so a PR's new migrations reach
// that database only when it merges.
//
//   DATABASE_URL=… pnpm --dir apps/web warm-up https://<deployment> [--skip-when-unmigrated]

import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "@saaliheen/dataset/types";
import { database } from "../src/database.ts";
import { pendingContentMigrations } from "./content/migrate.ts";
import { CONTENT_MIGRATIONS } from "./content/migrations.ts";
import { surahPageAddresses, surahPartAddresses } from "../src/passages/addresses.ts";
import { sourcesHash, storedSourcesHash } from "../src/quran/import.ts";
import { readAyahWordCounts } from "../src/quran/quran.ts";

const SURAHS = 114;
/** The Quran import's sources, as db:migrate imports them. */
const DATA = fileURLToPath(new URL("../data", import.meta.url));
/** The pages under each Language that list the Surahs from the database: the Surah index, its Juz tab and Me. */
const SURAH_LISTS = ["", "/juz", "/me"];
/** The error page's robots meta tag (app/[lang]/unavailable-page.tsx): no page warmed has one. */
const ERROR_PAGE = /<meta name="robots" content="[^"]*noindex/;
/** How many pages are requested at once. */
const AT_ONCE = 8;

/** What the database lacks, beside its content migrations, until it holds an import of this deployment's sources (src/quran/import.ts, #172, #173). */
const QURAN_IMPORT = "the Quran import";

/** The option that lets a preview's warm-up succeed, warming nothing, when its database lacks a content migration. */
const SKIP_WHEN_UNMIGRATED = "--skip-when-unmigrated";

const args = process.argv.slice(2);
const skipWhenUnmigrated = args.includes(SKIP_WHEN_UNMIGRATED);
const origin = args.find((arg) => arg !== SKIP_WHEN_UNMIGRATED)?.replace(/\/+$/, "");
if (!origin || !/^https?:\/\//.test(origin)) throw new Error("warm-up: give the deployment's origin, e.g. `pnpm warm-up https://saaliheen.com`");
if (!process.env.DATABASE_URL) throw new Error("warm-up: set DATABASE_URL to the deployment's database");

/** The headers each request sends: Vercel's protection bypass when its secret is set. */
function requestHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

/** What the warm-up reads from the deployment's database. */
interface Database {
  /** The content migrations it has not had, in order. */
  pending: string[];
  /** Every Theme's slug, in the Themes list's order; none when a migration is pending. */
  slugs: string[];
  /** How many Words each Ayah of every Surah holds, Surah 1 first; none when a migration is pending. */
  wordCounts: number[][];
}

/** Read the deployment's database, changing nothing. */
async function readDatabase(): Promise<Database> {
  const pool = database();
  try {
    const pending = await pendingContentMigrations(pool, CONTENT_MIGRATIONS);
    // Pending until the database's last import is of this deployment's sources (#173).
    if ((await storedSourcesHash(pool)) !== sourcesHash(DATA)) pending.unshift(QURAN_IMPORT);
    if (pending.length) return { pending, slugs: [], wordCounts: [] };
    const [themes, wordCounts] = await Promise.all([pool.query<{ slug: string }>("select slug from theme order by position"), readAyahWordCounts(pool)]);
    return { pending, slugs: themes.rows.map((r) => r.slug), wordCounts };
  } finally {
    await pool.end();
  }
}

/** Say which migrations `pending` are and why nothing is warmed; the exit code: 0 with SKIP_WHEN_UNMIGRATED, else 1. */
function reportUnmigrated(pending: string[]): number {
  console.error(
    `warm-up: the database at DATABASE_URL has not had ${pending.length} content migrations (${pending.join(", ")}): ` +
      `its pages that read them cannot render until \`pnpm db:migrate\` runs there, so nothing was warmed at ${origin}`,
  );
  if (!skipWhenUnmigrated) return 1;
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(
      summary,
      `\nThis preview is not warmed: its database, production's, has not had ${pending.join(", ")}. ` +
        `Pages that read their tables fail until those migrations reach production, when this PR merges.\n`,
    );
  }
  return 0;
}

/** Every address to warm: each Surah list, each Theme page, then each Surah page, then each Surah part, in Urdu and in English. */
function pagesToWarm(slugs: string[], wordCounts: number[][]): string[] {
  const surahs = Array.from({ length: SURAHS }, (_, i) => i + 1);
  const lists = LANGUAGES.flatMap((lang) => SURAH_LISTS.map((page) => `/${lang}${page}`));
  const themes = slugs.flatMap((slug) => LANGUAGES.map((lang) => `/${lang}/themes/${slug}`));
  return [...lists, ...themes, ...surahs.flatMap(surahPageAddresses), ...surahs.flatMap((n) => surahPartAddresses(n, wordCounts[n - 1]))];
}

/** Request `page`; why it failed, or undefined when it answered 200 with the page itself. */
async function warm(page: string, headers: Record<string, string>): Promise<string | undefined> {
  try {
    const res = await fetch(`${origin}${page}`, { headers, redirect: "manual" });
    const html = await res.text();
    if (res.status !== 200) return `${page} answered ${res.status}`;
    // A Surah part is JSON: it fails with a status, never with the error page.
    return ERROR_PAGE.test(html) ? `${page} answered the error page` : undefined;
  } catch (error) {
    return `${page} did not answer: ${(error as Error).message}`;
  }
}

/** Warm `pages`, AT_ONCE at a time; why each that failed did. */
async function warmAll(pages: string[]): Promise<string[]> {
  const headers = requestHeaders();
  const queue = [...pages];
  const failures: string[] = [];
  const worker = async () => {
    for (let page = queue.shift(); page !== undefined; page = queue.shift()) {
      const failed = await warm(page, headers);
      if (failed) failures.push(failed);
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
  return failures;
}

/** Warm every page `slugs` and the Surahs, cut by `wordCounts`, give; the exit code: 1 when one failed. */
async function warmUp(slugs: string[], wordCounts: number[][]): Promise<number> {
  const pages = pagesToWarm(slugs, wordCounts);
  const failures = await warmAll(pages);
  console.log(`warm-up: ${pages.length - failures.length} of ${pages.length} pages and parts warmed at ${origin}`);
  for (const failure of failures) console.error(`warm-up: ${failure}`);
  return failures.length ? 1 : 0;
}

const { pending, slugs, wordCounts } = await readDatabase();
process.exitCode = pending.length ? reportUnmigrated(pending) : await warmUp(slugs, wordCounts);
