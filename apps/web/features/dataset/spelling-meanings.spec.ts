import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { rootsJsonByLocation, rootsOf, type Spelling } from "./root-support";
import { ENGLISH, URDU, buildFromCommittedSources, readSource, type MeaningSource } from "./support";

const feature = await loadFeature("./spelling-meanings.feature");

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios }) => {
  const urdu = readSource<MeaningSource>(URDU);
  const english = readSource<MeaningSource>(ENGLISH);
  const built = buildFromCommittedSources;
  const spellings = () => rootsOf(built()).flatMap((r) => r.lemmas.flatMap((l) => l.spellings));
  const qulMeaning = (location: string) => ({ ur: urdu[location], en: english[location] });
  const rootsJsonMeaning = (location: string) => {
    const entry = rootsJsonByLocation().entryAt.get(location)!;
    return { ur: entry.urdu, en: entry.english };
  };
  let spelling: Spelling;

  BeforeAllScenarios(() => {
    built();
    rootsJsonByLocation();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  const findSpelling = (_: unknown, location: string) => {
    const found = spellings().filter((s) => s.locations[0] === location);
    expect(found, `Spellings first found at ${location}`).toHaveLength(1);
    spelling = found[0];
  };

  Scenario("The Spelling first found at 1:1:3 shows the roots.json meaning for that Word location", ({ When, Then, And }) => {
    When('I find the Spelling whose first Word location is {string}', findSpelling);
    Then("roots.json lists that Word location, with an Urdu meaning that differs from QUL's Urdu Word meaning there", () => {
      const location = spelling.locations[0];
      expect(rootsJsonByLocation().entryAt.has(location)).toBe(true);
      expect(rootsJsonMeaning(location).ur).not.toBe(qulMeaning(location).ur);
    });
    And("the Spelling's Urdu and English meaning are roots.json's meaning at that Word location", () => {
      expect(spelling.meaning).toEqual(rootsJsonMeaning(spelling.locations[0]));
    });
  });

  Scenario("Every Spelling covered by roots.json shows its meaning", ({ Then }) => {
    Then("every Spelling whose first Word location roots.json lists has roots.json's Urdu and English meaning there", () => {
      const covered = spellings().filter((s) => rootsJsonByLocation().entryAt.has(s.locations[0]));
      expect(covered.length).toBeGreaterThan(0);
      for (const s of covered) expect(s.meaning, s.locations[0]).toEqual(rootsJsonMeaning(s.locations[0]));
    });
  });

  Scenario("The Spelling first found at 2:223:6 falls back to QUL's Word meaning", ({ When, Then, And }) => {
    When('I find the Spelling whose first Word location is {string}', findSpelling);
    Then("roots.json lists none of the Spelling's {int} Word locations", (_, count: number) => {
      expect(spelling.locations).toHaveLength(count);
      expect(spelling.locations.filter((l) => rootsJsonByLocation().entryAt.has(l))).toEqual([]);
    });
    And("the Spelling's Urdu and English meaning are QUL's Word meaning at that Word location", () => {
      expect(qulMeaning(spelling.locations[0]).ur).toBeTruthy();
      expect(spelling.meaning).toEqual(qulMeaning(spelling.locations[0]));
    });
  });

  Scenario("Every Spelling roots.json does not cover falls back to QUL's Word meaning", ({ Then, And }) => {
    let uncovered: Spelling[] = [];
    Then("{int} Spellings have a first Word location roots.json does not list", (_, count: number) => {
      uncovered = spellings().filter((s) => !rootsJsonByLocation().entryAt.has(s.locations[0]));
      expect(uncovered).toHaveLength(count);
    });
    And("each of them has QUL's Urdu and English Word meaning at its first Word location", () => {
      for (const s of uncovered) expect(s.meaning, s.locations[0]).toEqual(qulMeaning(s.locations[0]));
    });
  });

  Scenario("Every Lemma's representative meaning is its most frequent Spelling's meaning", ({ Then }) => {
    Then("every Lemma's Urdu and English meaning is the meaning of its first Spelling", () => {
      const lemmas = rootsOf(built()).flatMap((r) => r.lemmas);
      expect(lemmas.length).toBeGreaterThan(0);
      for (const l of lemmas) expect(l.meaning, `Lemma ${l.id}`).toEqual(l.spellings[0].meaning);
    });
  });
});
