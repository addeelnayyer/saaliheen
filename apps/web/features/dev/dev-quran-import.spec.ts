// #172 AC-2: `pnpm dev` runs the import on start, through `pnpm db:migrate`
// on its own Postgres (ADR 0041, ADR 0049).

import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { UTHMANI, readSource, type TextSource } from "../dataset/support.ts";
import { WEB, devContainers, devDatabase, devVolumes, query, removeDevDatabase, startDev, stopDev } from "./dev-support.ts";

const feature = await loadFeature("./dev-quran-import.feature");

describeFeature(feature, ({ Background, Scenario, AfterEachScenario }) => {
  AfterEachScenario(async () => {
    await stopDev();
    removeDevDatabase();
  });

  Background(({ Given, And }) => {
    Given("no DATABASE_URL is set, in the environment or in apps/web's .env files", () => {
      const files = fs.readdirSync(WEB).filter((f) => f.startsWith(".env"));
      const naming = files.filter((f) => /^\s*DATABASE_URL\s*=/m.test(fs.readFileSync(path.join(WEB, f), "utf8")));
      expect(naming, "apps/web's .env files name a DATABASE_URL, which would override pnpm dev's own Postgres").toEqual([]);
    });
    And("the run's dev Postgres has no container and no volume", () => {
      removeDevDatabase();
      expect(devContainers()).toBe("");
      expect(devVolumes()).toBe("");
    });
  });

  Scenario("`pnpm dev` imports the Quran into its own Postgres when it starts", ({ When, Then, And }) => {
    const hashes = () => query<{ sources_hash: string }>(devDatabase().url, "select sources_hash from dataset_import");
    let first: { sources_hash: string }[];
    When("I start `pnpm dev`", () => startDev());
    Then(
      "its database holds {int} Surahs and {int} Ayahs, and a hash of the sources they were imported from",
      async (_, surahs: number, ayahs: number) => {
        const [counts] = await query<{ surahs: number; ayahs: number }>(
          devDatabase().url,
          "select (select count(*) from surah)::int as surahs, (select count(*) from ayah)::int as ayahs",
        );
        expect(counts).toEqual({ surahs, ayahs });
        first = await hashes();
        expect(first).toHaveLength(1);
        expect(first[0].sources_hash).toMatch(/\S/);
      },
    );
    And("Word 1:1:1 in its database has the QPC Hafs text at that Word location", async () => {
      const uthmani = readSource<TextSource>(UTHMANI);
      expect(await query(devDatabase().url, "select uthmani from word where location = '1:1:1'")).toEqual([{ uthmani: uthmani["1:1:1"].text }]);
    });
    When("`pnpm dev` is stopped and started again", async () => {
      await stopDev();
      await startDev();
    });
    Then("its database holds the same sources hash, stored once", async () => {
      expect(await hashes()).toEqual(first);
    });
  });
});
