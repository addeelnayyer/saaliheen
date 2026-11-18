import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { testDatabase } from "../site/test-database.ts";
import { database } from "./support";

const feature = await loadFeature("./allah-reference-seed.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/**
 * The two tables `pnpm db:migrate` creates for Allah references (#147, ADR
 * 0014), as Better Auth's schema names them: "allahReference" (one row per
 * Word location: "location", "surah") and "allahReferenceRevision" (one row
 * per publish or seed: "surah", "author" — "seed" for the seed — and the Word
 * locations it "added" and "removed").
 */
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");

/** What a run of a script left: whether it succeeded, and everything it printed. */
interface Run {
  ok: boolean;
  output: string;
}

/** Run `pnpm run <script> [...args]` in the website's directory against the run's own Postgres, as the owner runs it against Neon. */
async function runScript(script: string, ...args: string[]): Promise<Run> {
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", script, ...args], { cwd: WEB, env, encoding: "utf8" });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${stdout}\n${stderr}\n${message}` };
  }
}

/** A list of Word locations as a table or column holds it: a JSON array, as text or already parsed. */
const locationsIn = (value: unknown): string[] => {
  const list = typeof value === "string" ? JSON.parse(value) : value;
  expect(Array.isArray(list), `a list of Word locations: ${JSON.stringify(value)}`).toBe(true);
  return (list as unknown[]).map(String).sort();
};

/** Every table and column of the run's database, with its type and whether it may be null. */
const schemaOf = async () =>
  (
    await database().query(
      `select table_name, column_name, data_type, is_nullable from information_schema.columns
        where table_schema = 'public' order by table_name, column_name`,
    )
  ).rows;

/** Every row of both Allah reference tables, in a stable order. */
async function rowsOfBothTables() {
  const all = async (table: string) =>
    (await database().query(`select * from "${table}"`)).rows.map((row) => JSON.stringify(row, Object.keys(row).sort())).sort();
  return { references: await all(REFERENCES), revisions: await all(REVISIONS) };
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  /** The file of Allah references a step last wrote, and the Word locations it holds. */
  let file: { path: string; locations: string[] } | undefined;
  /** The seed's last run. */
  let run: Run | undefined;
  /** What a step noted, to compare after. */
  let notedSchema: unknown;
  let notedRows: unknown;

  BeforeEachScenario(() => {
    file = undefined;
    run = undefined;
    notedSchema = undefined;
    notedRows = undefined;
  });

  const written = () => {
    if (!file) throw new Error("no file of Allah references written in this scenario");
    return file;
  };
  /** Write `locations` as a file of Allah references, a JSON array, as the owner's file is. */
  const writeFile = (locations: string[]) => {
    const at = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "allah-references-")), "allah-references.json");
    fs.writeFileSync(at, JSON.stringify(locations));
    file = { path: at, locations };
  };
  const seed = async () => (run = await runScript("db:seed-allah-references", written().path));
  const ran = () => {
    if (!run) throw new Error("nothing run yet in this scenario");
    return run;
  };

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("the run's database holds the Allah references table and the Allah reference revisions table", async () => {
      const columns = (table: string) => schemaOf().then((rows) => rows.filter((r) => r.table_name === table).map((r) => r.column_name));
      expect(await columns(REFERENCES), `the "${REFERENCES}" table's columns`).toEqual(expect.arrayContaining(["location", "surah"]));
      expect(await columns(REVISIONS), `the "${REVISIONS}" table's columns`).toEqual(expect.arrayContaining(["surah", "author", "added", "removed"]));
    });

    step("I note every table and column of the run's database", async () => {
      notedSchema = await schemaOf();
    });

    step("I run `pnpm db:migrate` again", async () => {
      run = await runScript("db:migrate");
    });

    step("it reports 0 tables created and 0 tables altered", () => {
      const { ok, output } = ran();
      expect(ok, output).toBe(true);
      expect(output).toContain("0 tables created, 0 tables altered");
    });

    step("every table and column of the run's database is as noted", async () => {
      expect(await schemaOf()).toEqual(notedSchema);
    });

    step("a file of Allah references holding the Word locations:", (_, table: { location: string }[]) => {
      writeFile(table.map((row) => row.location));
    });

    step("a file of Allah references holding 2:255:1, 2:255:2, {string}, 113:1:1 and {string}", (_, bad: string, also: string) => {
      writeFile(["2:255:1", "2:255:2", bad, "113:1:1", also]);
    });

    step("I run the seed with that file", async () => {
      await seed();
    });

    step("I have run the seed with that file", async () => {
      const { ok, output } = await seed();
      expect(ok, `the seed ran: ${output}`).toBe(true);
    });

    step("the seed succeeds", () => {
      const { ok, output } = ran();
      expect(ok, `the seed's output: ${output}`).toBe(true);
    });

    step("the Allah references are exactly the Word locations in the file, each with its Surah", async () => {
      const { rows } = await database().query(`select location, surah from "${REFERENCES}" order by location`);
      const expected = written().locations.map((location) => ({ location, surah: Number(location.split(":")[0]) }));
      expect(rows.map((r) => ({ location: String(r.location), surah: Number(r.surah) })).sort((a, b) => a.location.localeCompare(b.location))).toEqual(
        expected.sort((a, b) => a.location.localeCompare(b.location)),
      );
    });

    step(
      "there is exactly one seed revision for each of Surahs 1, 12 and 112, adding that Surah's Word locations in the file, and no other revision",
      async () => {
        const { rows } = await database().query(`select surah, author, added, removed from "${REVISIONS}" order by surah`);
        const bySurah = (surah: number) => written().locations.filter((l) => l.startsWith(`${surah}:`)).sort();
        expect(
          rows.map((r) => ({ surah: Number(r.surah), author: r.author, added: locationsIn(r.added), removed: locationsIn(r.removed ?? []) })),
        ).toEqual([1, 12, 112].map((surah) => ({ surah, author: "seed", added: bySurah(surah), removed: [] })));
      },
    );

    step("I note every row of the Allah references and Allah reference revisions tables", async () => {
      notedRows = await rowsOfBothTables();
    });

    step("every row of the Allah references and Allah reference revisions tables is as noted", async () => {
      expect(await rowsOfBothTables()).toEqual(notedRows);
    });

    step("the seed fails, naming {string} and {string} and no other Word location", (_, bad: string, also: string) => {
      const { ok, output } = ran();
      expect(ok, `the seed's output: ${output}`).toBe(false);
      const named = new Set(output.split(/[^\w:-]+/));
      expect(named.has(bad) && named.has(also), `the seed names ${bad} and ${also}: ${output}`).toBe(true);
      const good = written().locations.filter((l) => l !== bad && l !== also);
      expect(good.filter((l) => named.has(l)), `Word locations that exist, named in: ${output}`).toEqual([]);
    });
  });

  Scenario("`pnpm db:migrate` has created both Allah reference tables, and running it again changes nothing", () => {});
  Scenario("The seed loads every Word location in the file, exactly as given, and records one seed revision per Surah", () => {});
  Scenario("Running the seed again leaves the same rows", () => {});
  ScenarioOutline("The seed refuses the whole load when the file holds <bad>, and names it", () => {});
});
