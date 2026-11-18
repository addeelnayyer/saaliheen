// #172 AC-2: `pnpm db:migrate`, which the deploy and `pnpm dev` run, runs the
// import before the content migrations.

import { spawnSync } from "node:child_process";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { CONTENT_MIGRATIONS } from "../../scripts/content/migrations.ts";
import { WEB, builtExpected, dropDatabase, freshDatabase, query, snapshot, storedSourcesHash, writtenSince, type ImportRun, type Snapshot } from "./import-support.ts";

const feature = await loadFeature("./db-migrate-import.feature");

/** The tables the import writes (ADR 0049). */
const IMPORT_TABLES = ["surah", "ayah", "word", "section_mark", "recitation", "recitation_ayah", "recitation_timing", "dataset_import"];

/** Run `pnpm db:migrate` on `url`, as the deploy and `pnpm dev` do. */
function dbMigrate(url: string): ImportRun {
  const run = spawnSync("pnpm", ["run", "--silent", "db:migrate"], { cwd: WEB, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: run.status, output: `${run.stdout ?? ""}${run.stderr ?? ""}` };
}

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let url: string;
  let run: ImportRun;
  let before: Snapshot;
  let hashBefore: string | undefined;
  let scenario = 0;

  const name = () => `db_migrate_${scenario}`;
  BeforeEachScenario(() => {
    scenario++;
  });
  AfterEachScenario(() => dropDatabase(name()));

  const migrate = async () => {
    before = await snapshot(url);
    hashBefore = await storedSourcesHash(url);
    run = dbMigrate(url);
  };
  const exitsZero = () => expect(run.status, `db:migrate failed:\n${run.output.slice(-3000)}`).toBe(0);

  Scenario("`pnpm db:migrate` on an empty Postgres imports the Quran, then runs every content migration", ({ Given, When, Then, And }) => {
    Given("an empty Postgres", async () => {
      url = await freshDatabase(name());
    });
    When("`pnpm db:migrate` runs on it", migrate);
    Then("it exits 0", exitsZero);
    And(
      "the database holds the Quran the builder makes of the committed sources: {int} Surahs, {int} Ayahs and every Word",
      async (_, surahs: number, ayahs: number) => {
        const [counts] = await query<{ surahs: number; ayahs: number; words: number }>(
          url,
          "select (select count(*) from surah)::int as surahs, (select count(*) from ayah)::int as ayahs, (select count(*) from word)::int as words",
        );
        const words = builtExpected().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words)).length;
        expect(counts).toEqual({ surahs, ayahs, words });
      },
    );
    And("it stores a hash of the sources", async () => {
      expect((await storedSourcesHash(url)) ?? "", "the stored sources hash").toMatch(/\S/);
    });
    And("every content migration ran, each after the import was stored", async () => {
      const ran = await query<{ name: string; after: boolean }>(
        url,
        "select name, ran_at > (select min(imported_at) from dataset_import) as after from content_migration order by name",
      );
      expect(ran.map((r) => r.name)).toEqual(CONTENT_MIGRATIONS.map((m) => m.name).sort());
      for (const r of ran) expect(r.after, `${r.name} ran before the import`).toBe(true);
    });
  });

  Scenario("`pnpm db:migrate` run again imports nothing", ({ Given, When, Then, And }) => {
    Given("a Postgres `pnpm db:migrate` has run on", async () => {
      url = await freshDatabase(name());
      const first = dbMigrate(url);
      expect(first.status, `db:migrate failed:\n${first.output.slice(-3000)}`).toBe(0);
    });
    When("`pnpm db:migrate` runs on it again", migrate);
    Then("it exits 0", exitsZero);
    And("nothing was written to the import's tables", async () => {
      expect(IMPORT_TABLES.filter((t) => !(t in before.rows)), "the import's tables").toEqual([]);
      const written = (await writtenSince(url, before)).filter((line) => IMPORT_TABLES.includes(line.split(/[: ]/)[0]));
      expect(written, "db:migrate wrote to the import's tables").toEqual([]);
    });
    And("the stored sources hash is the same", async () => {
      expect(hashBefore ?? "", "the stored sources hash before").toMatch(/\S/);
      expect(await storedSourcesHash(url)).toBe(hashBefore);
    });
  });
});
