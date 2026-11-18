import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { FIRST_PART_WORDS, PART_WORDS, partAyahs, surahParts, type SurahPart } from "@saaliheen/dataset/parts";
import type { Language, PartAyah, Surah } from "@saaliheen/dataset/types";
import { buildFromCommittedSources } from "./support";

const feature = await loadFeature("./surah-parts.feature");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;

  /** Each Surah's Ayah Word counts and its parts, by Surah number. */
  const surahs = () =>
    built().dataset.surahs.map((s) => {
      const counts = s.ayahs.map((a) => a.words.length);
      return { number: s.number, counts, parts: surahParts(counts) };
    });
  /** How many Words `part` holds, given its Surah's Ayah Word counts. */
  const words = (counts: number[], part: SurahPart) => counts.slice(part.first - 1, part.last).reduce((a, b) => a + b, 0);
  const partsOf = (n: number) => surahs().find((s) => s.number === n)!.parts;

  BeforeAllScenarios(() => {
    built();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  Scenario("Every Surah's parts cover its Ayahs once each, in order", ({ Then, And }) => {
    Then(
      "each of the {int} Surahs' parts run from Ayah 1 to its last Ayah with no gap or overlap",
      (_, count: number) => {
        expect(surahs()).toHaveLength(count);
        for (const { number, counts, parts } of surahs()) {
          const covered = parts.flatMap((p) => Array.from({ length: p.last - p.first + 1 }, (_, k) => p.first + k));
          expect(covered, `Surah ${number}`).toEqual(counts.map((_, k) => k + 1));
        }
      },
    );
    And("every part holds at least one Ayah", () => {
      for (const { number, parts } of surahs()) {
        for (const p of parts) expect(p.last, `Surah ${number}`).toBeGreaterThanOrEqual(p.first);
      }
    });
  });

  Scenario("Parts keep to their Word budgets", ({ Then, And }) => {
    const overBudget = (budget: number, which: (parts: SurahPart[]) => SurahPart[]) =>
      surahs().flatMap(({ number, counts, parts }) =>
        which(parts)
          .filter((p) => p.first !== p.last && words(counts, p) > budget)
          .map((p) => `${number}:${p.first}-${p.last}`),
      );

    Then("every first part holds at most {int} Words, unless it is a single Ayah", (_, budget: number) => {
      expect(budget).toBe(FIRST_PART_WORDS);
      expect(overBudget(budget, (parts) => parts.slice(0, 1))).toEqual([]);
    });
    And("every later part holds at most {int} Words, unless it is a single Ayah", (_, budget: number) => {
      expect(budget).toBe(PART_WORDS);
      expect(overBudget(budget, (parts) => parts.slice(1))).toEqual([]);
    });
    And("no part could take its next Ayah without going over its budget", () => {
      const greedy = surahs().flatMap(({ number, counts, parts }) =>
        parts.slice(0, -1).flatMap((p, i) => {
          const budget = i === 0 ? FIRST_PART_WORDS : PART_WORDS;
          const grown = { first: p.first, last: p.last + 1 };
          return words(counts, grown) <= budget ? [`${number}:${p.first}-${p.last}`] : [];
        }),
      );
      expect(greedy).toEqual([]);
    });
  });

  ScenarioOutline(
    "A part in <Language> carries its Ayahs' Words and Ayah translations in <Language> only",
    ({ When, Then, And }, variables) => {
      const lang: Language = variables.Language === "Urdu" ? "ur" : "en";
      const other: Language = lang === "ur" ? "en" : "ur";
      let surah: Surah;
      let range: SurahPart;
      let part: PartAyah[];

      When("I take part {int} of Surah {int} in <Language>", (_, index: number, n: number) => {
        surah = built().dataset.surahs[n - 1];
        range = partsOf(n)[index - 1];
        part = partAyahs(surah, range, lang);
      });
      Then(
        "it holds the Ayahs of part {int} of Surah {int}, in order, with every Word they hold in the dataset",
        (_, index: number, n: number) => {
          expect(range).toEqual(partsOf(n)[index - 1]);
          expect(part.map((a) => a.number)).toEqual(
            Array.from({ length: range.last - range.first + 1 }, (_, k) => range.first + k),
          );
          for (const ayah of part) {
            const source = surah.ayahs[ayah.number - 1];
            // Its Indo-Pak end too, which a shared Ayah ends with (#19).
            expect(ayah.indopakEnd).toBe(source.indopakEnd);
            expect(ayah.words.map((w) => [w.location, w.uthmani, w.indopak, w.root])).toEqual(
              source.words.map((w) => [w.location, w.uthmani, w.indopak, w.root]),
            );
          }
        },
      );
      And("each Word's meaning is the dataset's <Language> Word meaning, and nothing in the other Language", () => {
        for (const ayah of part) {
          const source = surah.ayahs[ayah.number - 1];
          // A plain string, not a per-Language record: the other Language's meaning is not in the part.
          expect(ayah.words.map((w) => w.meaning)).toEqual(source.words.map((w) => w.meaning[lang]));
          for (const word of ayah.words) {
            // A Word with no Root also carries its particle (#249, particle-analysis.feature).
            const keys = ["indopak", "location", "meaning", "root", "uthmani", ...(word.root === null ? ["particle"] : [])];
            expect(Object.keys(word).sort()).toEqual(keys.sort());
          }
          // An Ayah a Passage begins at also carries that Passage, its title in this Language only (#41, passages.feature).
          expect(Object.keys(ayah).filter((key) => key !== "passage").sort()).toEqual(["indopakEnd", "number", "themes", "translation", "words"]);
          expect(part).not.toContainEqual(expect.objectContaining({ translation: source.translation[other] }));
        }
      });
      And("each Ayah translation is the dataset's <Language> Ayah translation", () => {
        expect(part.map((a) => a.translation)).toEqual(part.map((a) => surah.ayahs[a.number - 1].translation[lang]));
      });
    },
  );

  Scenario("Al-Baqarah opens with a small first part and loads in many parts", ({ Then, And }) => {
    Then("Surah {int} has more than {int} parts", (_, n: number, count: number) => {
      expect(partsOf(n).length).toBeGreaterThan(count);
    });
    And("Surah {int}'s first part ends before Ayah {int}", (_, n: number, ayah: number) => {
      expect(partsOf(n)[0].last).toBeLessThan(ayah);
    });
    And("Surah {int} is a single part", (_, n: number) => {
      expect(partsOf(n)).toHaveLength(1);
    });
  });
});
