import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Surah } from "@saaliheen/dataset";
import { rootsOf } from "./root-support";
import { buildFromCommittedSources } from "./support";

const feature = await loadFeature("./root-files.feature");

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  BeforeAllScenarios(() => {
    built();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  Scenario("The dataset's Surahs carry each Word's Root tag and no Root's Lemmas", ({ Then, And }) => {
    Then("each Word in every Surah the dataset holds has a Root tag that is its Root's id and letters, or none", () => {
      const letters = new Map(rootsOf(built()).map((r) => [r.id, r.letters]));
      const surahs: Surah[] = built().dataset.surahs;
      expect(surahs).toHaveLength(114);
      for (const word of surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words))) {
        const tag = (word as { root?: { id: number; letters: string } | null }).root;
        expect(tag, `${word.location} has no root field`).not.toBeUndefined();
        if (tag !== null) expect(tag, word.location).toEqual({ id: tag!.id, letters: letters.get(tag!.id) });
      }
    });
    And("no Surah the dataset holds has a Lemma or a Spelling", () => {
      for (const surah of built().dataset.surahs) expect(JSON.stringify(surah), `Surah ${surah.number}`).not.toMatch(/"(lemmas|spellings)"/);
    });
  });
});
