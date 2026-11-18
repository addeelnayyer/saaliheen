// Steps for splitting a Theme page into Theme parts (#131). The split is read
// from `themeParts` in `@saaliheen/dataset/parts`, beside `surahParts`, the
// Surah-part split it shares its mechanism with (ADR 0005): given a Theme's
// Passage groups in order, it returns its parts in order, each part the
// Passage groups it holds. Until it exists the steps fail on an assertion,
// not on the compiler.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import * as parts from "@saaliheen/dataset/parts";
import type { Theme, ThemeGroup } from "@saaliheen/dataset";
import { buildFromCommittedSources } from "./support";
import { themeNamed, themesOf } from "./theme-support";

const feature = await loadFeature("./theme-parts.feature");

/** A Theme's parts, each the Passage groups it holds, from `themeParts` once it exists. */
function themeParts(groups: ThemeGroup[]): ThemeGroup[][] {
  const split = (parts as unknown as Record<string, unknown>).themeParts;
  expect(split, "@saaliheen/dataset/parts has no themeParts").toBeTypeOf("function");
  return (split as (groups: ThemeGroup[]) => ThemeGroup[][])(groups);
}

/** A group's range and Ayahs only, whatever else the dataset puts on it. */
const plain = ({ surah, from, till, ayahs }: ThemeGroup) => ({ surah, from, till, ayahs: [...ayahs] });
const ayahCount = (groups: ThemeGroup[]) => groups.reduce((n, g) => n + g.ayahs.length, 0);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const themes = (): Theme[] => themesOf(built()).themes;
  const partsOf = (name: string) => themeParts(themeNamed(themesOf(built()), name).groups);

  BeforeAllScenarios(() => {
    built();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(themes().length).toBeGreaterThan(0);
    });
  });

  Scenario("Every Theme's parts hold its Passage groups once each, whole and in order", ({ Then, And }) => {
    Then(
      "each of the {int} Themes' parts, one after another, hold exactly its Passage groups, each whole, in order",
      (_, count: number) => {
        expect(themes()).toHaveLength(count);
        const wrong = themes().filter((t) => {
          const joined = themeParts(t.groups).flat().map(plain);
          return JSON.stringify(joined) !== JSON.stringify(t.groups.map(plain));
        });
        expect(wrong.map((t) => t.en), "Themes whose parts do not hold exactly their Passage groups").toEqual([]);
      },
    );
    And("every Theme part holds at least one Passage group", () => {
      const empty = themes().filter((t) => themeParts(t.groups).some((p) => p.length === 0));
      expect(empty.map((t) => t.en), "Themes with an empty part").toEqual([]);
    });
  });

  ScenarioOutline("A small Theme, <theme>, is a single part", ({ Then }, variables) => {
    Then('the Theme "<theme>" is a single part holding all of its <count> Ayahs', () => {
      const split = partsOf(variables.theme);
      expect(split, `${variables.theme}'s parts`).toHaveLength(1);
      expect(ayahCount(split[0])).toBe(Number(variables.count));
    });
  });

  Scenario("Disbelief opens with a small first part and loads in many parts", ({ Then, And }) => {
    Then("the Theme {string} has more than {int} parts", (_, name: string, count: number) => {
      expect(partsOf(name).length).toBeGreaterThan(count);
    });
    And(
      "the first part of the Theme {string} holds fewer than {int} of its {int} Ayahs",
      (_, name: string, most: number, total: number) => {
        const split = partsOf(name);
        expect(ayahCount(split.flat())).toBe(total);
        expect(ayahCount(split[0])).toBeLessThan(most);
      },
    );
  });
});
