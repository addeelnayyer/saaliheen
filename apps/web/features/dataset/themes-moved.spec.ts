// #170 AC-2: the dataset build reads and holds no Themes, now that they
// live in Neon (ADR 0037, ADR 0041).

import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { afterAll, expect } from "vitest";
import { buildDataset, type BuildResult } from "@saaliheen/dataset";
import { DATA, buildFromCommittedSources, removeSourceCopies, sourceCopy } from "./support";

const feature = await loadFeature("./themes-moved.feature");

/** The website's own directory, which holds data/. */
const WEB = path.join(DATA, "..");

/** What the dataset holds of Themes, whatever its type says. */
const themesHeld = (result: BuildResult) => {
  const dataset = result.dataset as unknown as Record<string, unknown>;
  return { themes: dataset.themes, themeCategories: dataset.themeCategories };
};

const expectNoThemes = (result: BuildResult) => {
  const { themes, themeCategories } = themesHeld(result);
  expect(themes, "the dataset holds Themes").toBeUndefined();
  expect(themeCategories, "the dataset holds Theme categories").toBeUndefined();
};

describeFeature(feature, ({ Scenario }) => {
  afterAll(removeSourceCopies);

  Scenario("The committed sources and the committed dataset hold no Themes file", ({ Then, And }) => {
    Then('the website\'s data holds no Themes file, {string}', (_, file: string) => {
      expect(fs.existsSync(path.join(WEB, file)), `${file} is still in the tree`).toBe(false);
    });
    And('the committed dataset holds no Themes file, {string}', (_, file: string) => {
      expect(fs.existsSync(path.join(WEB, file)), `${file} is still in the tree`).toBe(false);
    });
  });

  Scenario("The dataset built from the committed sources holds no Themes", ({ Given, Then, And }) => {
    let result: BuildResult;
    Given("the dataset is built from the committed sources", () => {
      result = buildFromCommittedSources();
    });
    Then("the dataset holds no Themes and no Theme categories", () => expectNoThemes(result));
    And("every one of the {int} Ayahs has an empty list of Themes", (_, count: number) => {
      const ayahs = result.dataset.surahs.flatMap((s) => s.ayahs.map((a) => ({ at: `${s.number}:${a.number}`, themes: a.themes })));
      expect(ayahs).toHaveLength(count);
      const tagged = ayahs.filter((a) => !Array.isArray(a.themes) || a.themes.length > 0).map((a) => a.at);
      expect(tagged.slice(0, 5), `${tagged.length} Ayahs carry Themes`).toEqual([]);
    });
  });

  Scenario("A Themes file put back beside the sources is never read", ({ Given, When, Then }) => {
    let dir: string;
    let outcome: { result?: BuildResult; error?: Error };
    Given("a copy of the sources holding a Themes file that is not JSON", () => {
      dir = sourceCopy({ replaceData: { "themes.json": "this is not JSON" } });
    });
    When("the dataset is built from that copy", () => {
      try {
        outcome = { result: buildDataset({ sourceDir: dir }) };
      } catch (error) {
        outcome = { error: error as Error };
      }
    });
    Then("the build succeeds, and the dataset holds no Themes and no Theme categories", () => {
      expect(outcome.error?.message, "the build read the Themes file").toBeUndefined();
      expectNoThemes(outcome.result!);
    });
  });
});
