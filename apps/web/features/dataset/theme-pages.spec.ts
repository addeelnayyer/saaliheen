import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { BuildResult } from "@saaliheen/dataset";
import { readPassageEntries } from "./passage-support";
import { buildFromCommittedSources } from "./support";
import { ayahThemes, themeNamed, themesOf, type ThemeGroup } from "./theme-support";

const feature = await loadFeature("./theme-pages.feature");

/** A group as the feature writes it: `17:26–30 [26 27 29]`, the Passage's range then the matching Ayahs. */
function parseGroup(text: string): ThemeGroup {
  const m = /^(\d+):(\d+)[–-](\d+) \[([\d ]+)\]$/.exec(text.trim());
  expect(m, `"${text}" is no Passage group`).not.toBeNull();
  return { surah: Number(m![1]), from: Number(m![2]), till: Number(m![3]), ayahs: m![4].trim().split(/\s+/).map(Number) };
}

/** A group as the feature writes it, for messages. */
const written = (g: ThemeGroup) => `${g.surah}:${g.from}–${g.till} [${g.ayahs.join(" ")}]`;

/** A group's range and Ayahs only, whatever else the dataset puts on it. */
const plain = ({ surah, from, till, ayahs }: ThemeGroup): ThemeGroup => ({ surah, from, till, ayahs });

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  let result: BuildResult;
  const committed = () => {
    result = buildFromCommittedSources();
  };
  const groupsOf = (name: string) => {
    const theme = themeNamed(themesOf(result), name);
    expect(theme.groups, `${name} has no Passage groups`).toBeInstanceOf(Array);
    return theme;
  };

  ScenarioOutline("<theme>'s Theme page has these Passage groups", ({ Given, Then }, variables) => {
    Given("the dataset is built from the committed sources", committed);
    Then("the Theme \"<theme>\" has <count> Ayahs in these Passage groups, in order: <groups>", () => {
      const theme = groupsOf(variables.theme);
      const expected = (variables.groups as string).split(";").map(parseGroup);
      expect(theme.groups.map(plain).map(written)).toEqual(expected.map(written));
      expect(theme.ayahCount).toBe(Number(variables.count));
    });
  });

  Scenario("A Passage whose matching Ayahs are not consecutive Ayahs is still one group", ({ Given, Then }) => {
    Given("the dataset is built from the committed sources", committed);
    Then(
      "the Theme {string} has one Passage group for {string}, holding Ayahs {int}, {int} and {int} but not {int}",
      (_, name: string, range: string, a: number, b: number, c: number, not: number) => {
        const [surah, span] = range.split(":");
        const [from, till] = span.split(/[–-]/).map(Number);
        const groups = groupsOf(name).groups.filter((g) => g.surah === Number(surah) && g.from === from && g.till === till);
        expect(groups, `Passage groups for ${range}`).toHaveLength(1);
        expect(groups[0].ayahs).toEqual([a, b, c]);
        expect(groups[0].ayahs).not.toContain(not);
      },
    );
  });

  Scenario(
    "Every Theme's Passage groups hold exactly its Ayahs, in Quran order, each group within its Passage",
    ({ Given, Then, And }) => {
      Given("the dataset is built from the committed sources", committed);
      Then("for every Theme, its Passage groups' Ayahs are, in order, every Ayah that has that Theme", () => {
        const { themes } = themesOf(result);
        const taggedWith = new Map(themes.map((t) => [t.slug, [] as string[]]));
        for (const ayah of result.dataset.surahs.flatMap((s) => s.ayahs.map((a) => `${s.number}:${a.number}`))) {
          for (const slug of new Set(ayahThemes(result, ayah))) taggedWith.get(slug)?.push(ayah);
        }
        const wrong: string[] = [];
        for (const theme of themes) {
          const tagged = taggedWith.get(theme.slug)!;
          const grouped = (theme.groups ?? []).flatMap((g) => g.ayahs.map((a) => `${g.surah}:${a}`));
          if (grouped.join() !== tagged.join() || theme.ayahCount !== tagged.length) wrong.push(theme.en);
        }
        expect(wrong).toEqual([]);
      });
      And("every Passage group's range is a Passage of the Passages file, holding all of the group's Ayahs", () => {
        const passages = new Set(readPassageEntries().map((p) => `${p.surah_no}:${p.ayah_from}–${p.ayah_till}`));
        const wrong = themesOf(result).themes.flatMap((t) =>
          (t.groups ?? [])
            .filter((g) => !passages.has(`${g.surah}:${g.from}–${g.till}`) || g.ayahs.some((a) => a < g.from || a > g.till))
            .map((g) => `${t.en}: ${written(g)}`),
        );
        expect(wrong).toEqual([]);
      });
      And("no two Passage groups one after another are of the same Passage", () => {
        const wrong = themesOf(result).themes.flatMap((t) =>
          (t.groups ?? [])
            .filter((g, i, all) => i > 0 && all[i - 1].surah === g.surah && all[i - 1].from === g.from)
            .map((g) => `${t.en}: ${written(g)}`),
        );
        expect(wrong).toEqual([]);
      });
    },
  );
});
