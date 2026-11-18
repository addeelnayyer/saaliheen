// #171 AC-8: the dataset build reads neither the Passages file nor the
// Phrases file, and holds no Passages, Phrases or Phrase colours, now that
// they live in Neon (ADR 0041). The Surahs keep their empty keys.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { afterAll, expect } from "vitest";
import { buildDataset, type BuildResult } from "@saaliheen/dataset";
import { buildFromCommittedSources, removeSourceCopies, sourceCopy } from "./support";

const feature = await loadFeature("./passages-moved.feature");

/** A Surah as a built dataset or a written Surah file holds it, whatever its type says. */
interface HeldSurah {
  number: number;
  passages?: unknown;
  phrases?: unknown;
  ayahs: { number: number; words: { location: string; phraseColour?: unknown }[] }[];
}

const surahsOf = (result: BuildResult) => result.dataset.surahs as unknown as HeldSurah[];

/** The Surahs among `surahs` holding any Passage or Phrase, or holding them as anything but a list. */
const withPassagesOrPhrases = (surahs: HeldSurah[]) =>
  surahs
    .filter((s) => !Array.isArray(s.passages) || s.passages.length > 0 || !Array.isArray(s.phrases) || s.phrases.length > 0)
    .map((s) => s.number);

/** The Words among `surahs` carrying a Phrase colour. */
const colouredWords = (surahs: HeldSurah[]) =>
  surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words.filter((w) => "phraseColour" in w).map((w) => w.location)));

describeFeature(feature, ({ Scenario }) => {
  afterAll(removeSourceCopies);

  Scenario("The dataset built from the committed sources holds no Passages, Phrases or Phrase colours", ({ Given, Then, And }) => {
    let result: BuildResult;
    Given("the dataset is built from the committed sources", () => {
      result = buildFromCommittedSources();
    });
    Then("each of the {int} Surahs has an empty list of Passages and an empty list of Phrases", (_, count: number) => {
      const surahs = surahsOf(result);
      expect(surahs).toHaveLength(count);
      const held = withPassagesOrPhrases(surahs);
      expect(held.slice(0, 5), `${held.length} Surahs hold Passages or Phrases`).toEqual([]);
    });
    And("none of the Words of the {int} Ayahs carries a Phrase colour", (_, count: number) => {
      const surahs = surahsOf(result);
      expect(surahs.reduce((n, s) => n + s.ayahs.length, 0)).toBe(count);
      const coloured = colouredWords(surahs);
      expect(coloured.slice(0, 5), `${coloured.length} Words carry a Phrase colour`).toEqual([]);
    });
  });

  Scenario("A Passages file and a Phrases file put back beside the sources are never read", ({ Given, When, Then }) => {
    let dir: string;
    let outcome: { result?: BuildResult; error?: Error };
    Given("a copy of the sources holding a Passages file and a Phrases file that are not JSON", () => {
      dir = sourceCopy({ replaceData: { "passages.json": "this is not JSON", "phrases.json": "this is not JSON either" } });
    });
    When("the dataset is built from that copy", () => {
      try {
        outcome = { result: buildDataset({ sourceDir: dir }) };
      } catch (error) {
        outcome = { error: error as Error };
      }
    });
    Then("the build succeeds, and no Surah holds a Passage or a Phrase", () => {
      expect(outcome.error?.message, "the build read the Passages or Phrases file").toBeUndefined();
      expect(withPassagesOrPhrases(surahsOf(outcome.result!))).toEqual([]);
    });
  });

  Scenario("The dataset keeps each Surah's empty Passages and Phrases in their place", ({ Given, Then, And }) => {
    let written: HeldSurah[] = [];
    let keyOrders: string[][] = [];
    Given("the dataset is built from the committed sources", () => {
      written = buildFromCommittedSources().dataset.surahs as unknown as HeldSurah[];
      expect(written).toHaveLength(114);
      keyOrders = written.map((s) => Object.keys(s));
    });
    Then(
      'each of the {int} Surahs it holds has "passages" and "phrases" as empty lists, after "sectionMarks" and before "ayahs"',
      (_, count: number) => {
        expect(written).toHaveLength(count);
        const misplaced = keyOrders
          .map((keys, i) => ({ n: written[i].number, at: ["sectionMarks", "passages", "phrases", "ayahs"].map((k) => keys.indexOf(k)) }))
          .filter(({ at }) => at.some((x, j) => x < 0 || (j > 0 && x !== at[j - 1] + 1)))
          .map(({ n }) => n);
        expect(misplaced, "Surahs without passages and phrases between sectionMarks and ayahs").toEqual([]);
        const held = written.filter((s) => JSON.stringify(s.passages) !== "[]" || JSON.stringify(s.phrases) !== "[]").map((s) => s.number);
        expect(held.slice(0, 5), `${held.length} Surahs hold Passages or Phrases`).toEqual([]);
      },
    );
    And("no Word in them carries a Phrase colour", () => {
      const coloured = colouredWords(written);
      expect(coloured.slice(0, 5), `${coloured.length} Words carry a Phrase colour`).toEqual([]);
    });
  });
});
