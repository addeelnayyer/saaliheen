import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { committedPassages, committedPhrases } from "../site/committed-output.ts";
import { testDatabase } from "../site/test-database.ts";
import { auditMark, hasTable } from "./audit";
import { baseURL, database } from "./support";

// The Passage load (#171, ADR 0021): the Passage tables `pnpm db:migrate`
// made and loaded in the run's own Postgres, read directly, since no endpoint
// answers them, and compared with the Passages and Phrases files as last
// committed before they moved into Neon (../site/committed-output.ts). The
// stored content hashes are compared with the Surah files /data/v1 serves,
// fetched over HTTP as the mobile app fetches them.

const feature = await loadFeature("./passage-load.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");
/** The tables the load fills, as the feature names them. */
const PASSAGE_TABLES = ["passage", "phrase", "passage_revision"] as const;
/** Where the load and each publish keep each Surah's content hash. */
const HASHES = "surah_content_hash";
const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** What a run of a script left: whether it succeeded, and everything it printed. */
interface Run {
  ok: boolean;
  output: string;
}

/** Run `pnpm run <script>` in the website's directory against the run's database. */
async function runScript(script: string): Promise<Run> {
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", script], {
      cwd: WEB,
      env: { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url },
      encoding: "utf8",
    });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${stdout}\n${stderr}\n${message}` };
  }
}

/** Every row of `table`, each as sorted-key JSON, sorted: a snapshot to compare. */
async function rowsOf(table: string): Promise<string[]> {
  return (await database().query(`select * from "${table}"`)).rows.map((row) => JSON.stringify(row, Object.keys(row).sort())).sort();
}

/** Fails, naming it, unless db:migrate made `table`. */
async function expectTable(table: string) {
  expect(await hasTable(table), `db:migrate made the table \`${table}\``).toBe(true);
}

/** GET `address` from the server, once more if a kept-alive connection was reset. */
async function get(address: string): Promise<Response> {
  try {
    return await fetch(`${baseURL()}${address}`);
  } catch {
    return fetch(`${baseURL()}${address}`);
  }
}

/** The Passages of the committed file, as the `passage` table holds them, in Surah and Ayah order. */
const committedPassageRows = () =>
  committedPassages()
    .map((p) => ({ surah: p.surah_no, ayah_from: p.ayah_from, ayah_till: p.ayah_till, title_en: p.title_en, title_ur: p.title_ur }))
    .sort((a, b) => a.surah - b.surah || a.ayah_from - b.ayah_from);

describeFeature(feature, ({ Scenario, BeforeEachScenario, defineSteps }) => {
  let noted: Record<string, string[]> | undefined;
  let notedMark: number | null = null;
  let run: Run | undefined;
  let files: { number: number; text: string }[] = [];

  BeforeEachScenario(() => {
    noted = run = undefined;
    notedMark = null;
    files = [];
  });

  const ran = () => {
    if (!run) throw new Error("nothing run yet in this scenario");
    return run;
  };

  const snapshot = async () =>
    Object.fromEntries(await Promise.all([...PASSAGE_TABLES, HASHES].map(async (t) => [t, await rowsOf(t)] as const)));

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("`pnpm db:migrate` has made the Passage tables in the run's database", async () => {
      for (const table of [...PASSAGE_TABLES, HASHES]) await expectTable(table);
    });

    step(
      "the Passages in the database are exactly the committed Passages file's {int}, each with its Surah, its first and last Ayah and its English and Urdu Passage titles",
      async (_, count: number) => {
        const expected = committedPassageRows();
        expect(expected, "Passages in the committed Passages file").toHaveLength(count);
        const { rows } = await database().query(
          `select surah, ayah_from, ayah_till, title_en, title_ur from passage order by surah, ayah_from`,
        );
        expect(rows).toEqual(expected);
      },
    );

    step("each of the {int} Surahs has, in Ayah order, exactly the Passages the committed Passages file gives it", async (_, count: number) => {
      const { rows } = await database().query<{ surah: number; ayah_from: number; ayah_till: number }>(
        `select surah, ayah_from, ayah_till from passage order by surah, ayah_from`,
      );
      const bySurah = (list: { surah: number; ayah_from: number; ayah_till: number }[]) =>
        Object.fromEntries(SURAHS.map((n) => [n, list.filter((p) => p.surah === n).map((p) => `${p.ayah_from}–${p.ayah_till}`)]));
      const expected = bySurah(committedPassageRows());
      expect(Object.values(expected).filter((ps) => ps.length > 0), "Surahs with Passages in the committed file").toHaveLength(count);
      expect(bySurah(rows)).toEqual(expected);
    });

    step(
      "the Phrases in the database are exactly the committed Phrases file's {int}, each with its Surah and its first and last Word location",
      async (_, count: number) => {
        const expected = committedPhrases()
          .map(({ first, last }) => ({ surah: Number(first.split(":")[0]), first_word: first, last_word: last }))
          .sort((a, b) => a.first_word.localeCompare(b.first_word));
        expect(expected, "Phrases in the committed Phrases file").toHaveLength(count);
        const { rows } = await database().query<{ surah: number; first_word: string; last_word: string }>(
          `select surah, first_word, last_word from phrase`,
        );
        expect([...rows].sort((a, b) => a.first_word.localeCompare(b.first_word))).toEqual(expected);
      },
    );

    step(
      "each of the {int} Surahs has exactly one Passage revision, by {string}, with base {int}, version {int} and no edits",
      async (_, count: number, author: string, base: number, version: number) => {
        const { rows } = await database().query<{ surah: number; author: string; base: number; version: number; edits: unknown; created_at: Date | null }>(
          `select surah, author, base, version, edits, created_at from passage_revision where author = $1 order by surah`,
          [author],
        );
        expect(rows.map((r) => r.surah), `Surahs with a "${author}" Passage revision`).toEqual(SURAHS.slice(0, count));
        const wrong = rows
          .filter((r) => r.base !== base || r.version !== version || JSON.stringify(r.edits) !== "[]" || !(r.created_at instanceof Date))
          .map((r) => `Surah ${r.surah}: base ${r.base}, version ${r.version}, edits ${JSON.stringify(r.edits)}, created_at ${r.created_at}`);
        expect(wrong, "seed revisions not base 0, version 1, no edits, with a time").toEqual([]);
      },
    );

    step("there is no other Passage revision", async () => {
      const { rows } = await database().query<{ surah: number; author: string; version: number }>(
        `select surah, author, version from passage_revision where author <> 'seed' order by surah, version`,
      );
      expect(rows, "Passage revisions other than the seed").toEqual([]);
    });

    step("I note every row of the Passage tables and the stored content hashes, and the latest content audit row", async () => {
      for (const table of [...PASSAGE_TABLES, HASHES]) await expectTable(table);
      noted = await snapshot();
      notedMark = (await hasTable("content_audit")) ? await auditMark() : null;
    });

    step("I run `pnpm db:migrate` again", async () => {
      run = await runScript("db:migrate");
    });

    step("it succeeds, reporting 0 content migrations run", () => {
      const { ok, output } = ran();
      expect(ok, output).toBe(true);
      expect(output).toContain("0 content migrations run");
    });

    step("every row of the Passage tables and the stored content hashes is as noted", async () => {
      expect(await snapshot()).toEqual(noted);
    });

    step("no content audit row has been written since", async () => {
      if (notedMark !== null) expect(await auditMark(), "the latest content audit row").toBe(notedMark);
    });

    step("a client fetches each of the {int} Surah files the manifest lists", async (_, count: number) => {
      const res = await get("/data/v1/manifest.json");
      expect(res.status, "the manifest answers").toBe(200);
      const entries = ((await res.json()) as { surahs: { number: number; url: string }[] }).surahs;
      expect(entries.map((e) => e.number), "the Surahs the manifest lists").toEqual(SURAHS.slice(0, count));
      for (const entry of entries) {
        const file = await get(entry.url);
        expect(file.status, entry.url).toBe(200);
        files.push({ number: entry.number, text: await file.text() });
      }
    });

    step("each of the {int} Surahs has one stored content hash, and no other Surah has one", async (_, count: number) => {
      const { rows } = await database().query<{ surah: number }>(`select surah from ${HASHES} order by surah`);
      expect(rows.map((r) => r.surah), "Surahs with a stored content hash").toEqual(SURAHS.slice(0, count));
    });

    step("each Surah's stored content hash is the SHA-256 of the bytes its Surah file answers", async () => {
      expect(files, "Surah files fetched").toHaveLength(SURAHS.length);
      const { rows } = await database().query<{ surah: number; hash: string }>(`select surah, hash from ${HASHES}`);
      const stored = new Map(rows.map((r) => [r.surah, r.hash]));
      const wrong = files.filter((f) => stored.get(f.number) !== sha256(f.text)).map((f) => `Surah ${f.number}: stored ${stored.get(f.number)}`);
      expect(wrong, "Surahs whose stored content hash is not the SHA-256 of the file /data/v1 serves").toEqual([]);
    });
  });

  Scenario("Every Passage is loaded, with its Surah, its first and last Ayah and its English and Urdu Passage titles", () => {});
  Scenario("Every one of the 114 Surahs has its committed Passages, in order, and no other", () => {});
  Scenario("Every Phrase is loaded, with its Surah and its first and last Word location", () => {});
  Scenario("The load writes one seed Passage revision per Surah, base 0 and version 1, and no other revision", () => {});
  Scenario("Running `pnpm db:migrate` again changes no row", () => {});
  Scenario("The load stores each Surah's content hash, the SHA-256 of the Surah file /data/v1 serves for it", () => {});
});
