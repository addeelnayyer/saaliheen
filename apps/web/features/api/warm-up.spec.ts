// #170 AC-5: the warm-up after each deploy (ADR 0020, ADR 0041), run as the
// deploy runs it, `pnpm warm-up <origin>` with DATABASE_URL, against the run's
// server through a proxy that records each request and its answer. #171: a
// database that has not had a content migration is one of its own on the
// run's Postgres, so the shared one is never touched.

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { surahParts } from "@saaliheen/dataset/parts";
import { Pool } from "pg";
import { expect, vi } from "vitest";
import { CONTENT_MIGRATIONS } from "../../scripts/content/migrations.ts";
import { committedThemes } from "../site/committed-output.ts";
import { testDatabase } from "../site/test-database.ts";
import { baseURL, database } from "./support";

// 744 pages rendered cold, a Surah page each up to Al-Baqarah.
vi.setConfig({ testTimeout: 900_000 });

const feature = await loadFeature("./warm-up.feature");

const WEB = path.join(__dirname, "..", "..");
const LANGUAGES = ["ur", "en"];

/** Headers a proxy never passes on. */
const HOP_BY_HOP = new Set(["host", "connection", "keep-alive", "transfer-encoding", "content-length", "upgrade", "accept-encoding"]);

/** One request the warm-up made: its path and the status it got. */
interface Recorded {
  path: string;
  status: number;
}

/** A proxy to the run's server on a port of its own, recording each request; `failing` paths answer 503 instead. */
async function recordingProxy(failing: Set<string>) {
  const recorded: Recorded[] = [];
  const server = http.createServer(async (req, res) => {
    const at = req.url ?? "/";
    const pathname = new URL(at, "http://x").pathname;
    if (failing.has(pathname)) {
      recorded.push({ path: pathname, status: 503 });
      res.writeHead(503).end("unavailable");
      return;
    }
    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(([k, v]) => typeof v === "string" && !HOP_BY_HOP.has(k)),
    ) as Record<string, string>;
    const answer = await fetch(`${baseURL()}${at}`, { method: req.method, headers, redirect: "manual" }).catch(() => null);
    const status = answer?.status ?? 502;
    recorded.push({ path: pathname, status });
    const body = answer ? Buffer.from(await answer.arrayBuffer()) : Buffer.from("");
    res.writeHead(status, { "content-type": answer?.headers.get("content-type") ?? "text/plain" }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { origin, recorded, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

/** What a warm-up run left: its exit code and everything it wrote. */
interface Run {
  code: number | null;
  output: string;
  recorded: Recorded[];
}

/** How the warm-up is run: pages that answer 503, the database it reads, the options it is given. */
interface WarmUpOptions {
  failing?: string[];
  databaseUrl?: string;
  options?: string[];
  env?: Record<string, string>;
}

/** Run `pnpm warm-up <origin>` as the deploy does, through a recording proxy. */
async function warmUp({ failing = [], databaseUrl = testDatabase(Number(process.env.PORT)).url, options = [], env = {} }: WarmUpOptions = {}): Promise<Run> {
  const proxy = await recordingProxy(new Set(failing));
  const childEnv = { ...process.env, ...env, DATABASE_URL: databaseUrl };
  const child = spawn("pnpm", ["warm-up", proxy.origin, ...options], { cwd: WEB, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  await proxy.close();
  return { code, output, recorded: proxy.recorded };
}

/** A database of the scenario's own on the run's Postgres. */
const UNMIGRATED = "warm_up_unmigrated";

/** Create UNMIGRATED, recording every content migration but `missing` as run, and a Word table imported from `importedSources` when given; its connection string. */
async function unmigratedDatabase(missing: string, importedSources?: string): Promise<string> {
  await dropUnmigratedDatabase();
  await database().query(`create database ${UNMIGRATED}`);
  const url = new URL(testDatabase(Number(process.env.PORT)).url);
  url.pathname = `/${UNMIGRATED}`;
  const pool = new Pool({ connectionString: url.href });
  try {
    await pool.query(`create table content_migration (name text primary key, ran_at timestamptz not null default now())`);
    const ran = CONTENT_MIGRATIONS.map((m) => m.name).filter((name) => name !== missing);
    await pool.query(`insert into content_migration (name) select unnest($1::text[])`, [ran]);
    if (importedSources) {
      // As production's database holds the Quran's tables from an earlier import (#172).
      await pool.query(`create table word (location text primary key)`);
      await pool.query(`create table dataset_import (sources_hash text not null, imported_at timestamptz not null default now())`);
      await pool.query(`insert into dataset_import (sources_hash) values ($1)`, [importedSources]);
    }
  } finally {
    await pool.end();
  }
  return url.href;
}

/** A database of the #172 scenario's own on the run's Postgres. */
const COUNTED = "warm_up_word_counts";

/** Why that database's Word counts are as db:migrate left them, when they are. */
let countsUnchanged: string | undefined;

/** Create COUNTED, run `pnpm db:migrate` on it, and leave each Ayah of Surah 2 its first Word only; its connection string. */
async function countedDatabase(): Promise<string> {
  await database().query(`drop database if exists ${COUNTED} with (force)`);
  await database().query(`create database ${COUNTED}`);
  const url = new URL(testDatabase(Number(process.env.PORT)).url);
  url.pathname = `/${COUNTED}`;
  const migrate = spawn("pnpm", ["run", "db:migrate"], { cwd: WEB, env: { ...process.env, DATABASE_URL: url.href }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  migrate.stdout.on("data", (d) => (output += d));
  migrate.stderr.on("data", (d) => (output += d));
  const code = await new Promise<number | null>((resolve) => migrate.on("close", resolve));
  expect(code, `db:migrate on ${COUNTED}: ${output.slice(-2000)}`).toBe(0);
  const pool = new Pool({ connectionString: url.href });
  try {
    const { rows } = await pool.query(`select to_regclass('public.word') is not null as present`);
    if (rows[0].present) {
      const deleted = await pool.query(`delete from word where surah = 2 and position > 1`);
      expect(deleted.rowCount, "Words of Surah 2 after each Ayah's first").toBeGreaterThan(0);
      countsUnchanged = undefined;
    } else countsUnchanged = "db:migrate made no word table: Surah 2's Word counts are unchanged";
  } finally {
    await pool.end();
  }
  return url.href;
}

const dropUnmigratedDatabase = () => database().query(`drop database if exists ${UNMIGRATED} with (force)`);

const themePages = () => committedThemes().themes.flatMap((t) => LANGUAGES.map((lang) => `/${lang}/themes/${t.slug}`));
const surahPages = () => Array.from({ length: 114 }, (_, i) => LANGUAGES.map((lang) => `/${lang}/${i + 1}`)).flat();

/** Of `pages`, those the warm-up never requested, and those it requested that never answered 200. */
function unwarmed(run: Run, pages: string[]) {
  const answered = new Map<string, number[]>();
  for (const r of run.recorded) answered.set(r.path, [...(answered.get(r.path) ?? []), r.status]);
  return {
    missing: pages.filter((p) => !answered.has(p)),
    failed: pages.filter((p) => answered.has(p) && !answered.get(p)!.includes(200)),
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario("The warm-up requests every Theme page and every Surah page in Urdu and English", ({ When, Then, And }) => {
    let run: Run;
    When("the warm-up runs against the site", async () => {
      run = await warmUp();
    });
    Then("it finishes without failing", () => {
      expect(run.code, run.output.slice(-2000)).toBe(0);
    });
    And("it requested every Theme page of the {int} Themes in Urdu and in English, and each answered 200", (_, count: number) => {
      expect(committedThemes().themes).toHaveLength(count);
      const { missing, failed } = unwarmed(run, themePages());
      expect({ missing: missing.slice(0, 10), failed: failed.slice(0, 10) }, `${missing.length} not requested, ${failed.length} failed`).toEqual({ missing: [], failed: [] });
    });
    And("it requested every Surah page of the {int} Surahs in Urdu and in English, and each answered 200", (_, count: number) => {
      expect(surahPages()).toHaveLength(count * 2);
      const { missing, failed } = unwarmed(run, surahPages());
      expect({ missing: missing.slice(0, 10), failed: failed.slice(0, 10) }, `${missing.length} not requested, ${failed.length} failed`).toEqual({ missing: [], failed: [] });
    });
    And("every one of those pages is then served from Next's cache", async () => {
      const cold: string[] = [];
      for (const page of [...themePages(), ...surahPages()]) {
        const res = await fetch(`${baseURL()}${page}`);
        await res.arrayBuffer();
        if (res.status !== 200 || res.headers.get("x-nextjs-cache") !== "HIT") cold.push(`${page} ${res.status} ${res.headers.get("x-nextjs-cache")}`);
      }
      expect(cold.slice(0, 10), `${cold.length} pages not served from the cache`).toEqual([]);
    });
  });

  Scenario("The warm-up fails, naming each page that did not answer", ({ When, Then }) => {
    let run: Run;
    When("the warm-up runs against the site while these pages answer 503:", async (_, table: { page: string }[]) => {
      run = await warmUp({ failing: table.map((row) => row.page) });
    });
    Then("it fails, naming {string} and {string}", (_, first: string, second: string) => {
      expect(run.code, "the warm-up did not fail").not.toBe(0);
      expect(run.output).toContain(first);
      expect(run.output).toContain(second);
    });
  });

  Scenario("The warm-up fails, naming each content migration the database has not had", ({ Given, When, Then, And }) => {
    let missing: string;
    let run: Run;
    Given("a database that has had every content migration but {string}", (_, name: string) => {
      missing = name;
    });
    When("the warm-up runs against the site with that database", async () => {
      try {
        run = await warmUp({ databaseUrl: await unmigratedDatabase(missing) });
      } finally {
        await dropUnmigratedDatabase();
      }
    });
    Then("it fails, naming {string}", (_, name: string) => {
      expect(run.code, "the warm-up did not fail").not.toBe(0);
      expect(run.output).toContain(name);
    });
    And("it requested no pages", () => {
      expect(run.recorded.map((r) => r.path)).toEqual([]);
    });
  });

  Scenario(
    "With --skip-when-unmigrated, the warm-up names the content migration the database has not had and finishes without warming",
    ({ Given, When, Then, And }) => {
      let missing: string;
      let run: Run;
      const summary = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "warm-up-")), "summary.md");
      Given("a database that has had every content migration but {string}", (_, name: string) => {
        missing = name;
      });
      When("the warm-up runs against the site with that database and {string}", async (_, option: string) => {
        try {
          run = await warmUp({ databaseUrl: await unmigratedDatabase(missing), options: [option], env: { GITHUB_STEP_SUMMARY: summary } });
        } finally {
          await dropUnmigratedDatabase();
        }
      });
      Then("it finishes without failing", () => {
        expect(run.code, run.output.slice(-2000)).toBe(0);
      });
      And("it names {string}", (_, name: string) => {
        expect(run.output).toContain(name);
      });
      And("it requested no pages", () => {
        expect(run.recorded.map((r) => r.path)).toEqual([]);
      });
      And("the step summary says the preview is not warmed until the migrations reach production", () => {
        const note = fs.readFileSync(summary, "utf8");
        expect(note).toContain("not warmed");
        expect(note).toContain(missing);
        expect(note).toContain("production");
      });
    },
  );

  Scenario(
    "With --skip-when-unmigrated, the warm-up names the Quran import when the database's last import was of other sources",
    ({ Given, When, Then, And }) => {
      let run: Run;
      Given("a database that has had every content migration and an import of other sources", () => {});
      When("the warm-up runs against the site with that database and {string}", async (_, option: string) => {
        try {
          run = await warmUp({ databaseUrl: await unmigratedDatabase("", "the sources of an earlier deployment"), options: [option] });
        } finally {
          await dropUnmigratedDatabase();
        }
      });
      Then("it finishes without failing", () => {
        expect(run.code, run.output.slice(-2000)).toBe(0);
      });
      And("it names {string}", (_, name: string) => {
        expect(run.output).toContain(name);
      });
      And("it requested no pages", () => {
        expect(run.recorded.map((r) => r.path)).toEqual([]);
      });
    },
  );

  Scenario("The warm-up asks for each Surah's parts as the Word counts in its database cut them", ({ Given, When, Then, And }) => {
    let databaseUrl = "";
    let run: Run | undefined;
    Given("a database made by db:migrate in which every Ayah of Surah 2 holds only its first Word", async () => {
      databaseUrl = await countedDatabase();
    });
    When("the warm-up runs against the site with that database", async () => {
      try {
        run = await warmUp({ databaseUrl });
      } finally {
        await database().query(`drop database if exists ${COUNTED} with (force)`);
      }
    });
    Then("it finishes without failing", () => {
      expect(run?.code, run?.output.slice(-2000)).toBe(0);
    });
    And("it requested every Surah page of the {int} Surahs in Urdu and in English, and each answered 200", (_, count: number) => {
      expect(count).toBe(114);
      expect(unwarmed(run!, surahPages())).toEqual({ missing: [], failed: [] });
    });
    And("it requested exactly the parts of Surah 2 that {int} Ayahs of one Word each make, in Urdu and in English", (_, ayahs: number) => {
      const parts = surahParts(Array.from({ length: ayahs }, () => 1));
      const expected = LANGUAGES.flatMap((lang) => parts.map((_, i) => `/parts/${lang}/2/${i + 1}.json`)).sort();
      const requested = [...new Set(run!.recorded.map((r) => r.path).filter((p) => /^\/parts\/(ur|en)\/2\/\d+\.json$/.test(p)))].sort();
      expect(requested, countsUnchanged ?? "the parts of Surah 2 the warm-up asked for").toEqual(expected);
    });
  });
});
