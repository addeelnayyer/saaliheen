import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { moveStart, problems, publishable, retitle, split, type Passage, type PassageEdit, type TafsirRanges } from "@saaliheen/passages";
import { LANGUAGE_NAMED, tafsirEntries } from "../site/tafsir-entries";
import { filePassages, passageAt } from "./passage-support";
import { SURAH_META, metadataAyahCount, readSource, type SurahMeta } from "./support";

const feature = await loadFeature("./passages-and-tafsir.feature");

const SURAH = 18;

describeFeature(feature, ({ Background, Scenario }) => {
  const ayahCount = () => metadataAyahCount(readSource<SurahMeta>(SURAH_META), SURAH) as number;

  /** Surah 18's Passages after the edits so far. */
  let current: Passage[];
  /** Each Language's Tafsir entry ranges of Surah 18, as the scenario gives them. */
  let tafsir: TafsirRanges;

  /** Sets one Language's entries: `the English Tafsir entries of Surah 18 are one per Ayah[, but <groups>]`. */
  const given = (text: string) => () => {
    const m = /^the (English|Urdu) Tafsir entries of Surah 18 are one per Ayah(?:, but (.+))?$/.exec(text);
    expect(m, `no such Tafsir: ${text}`).not.toBeNull();
    tafsir = { ...tafsir, [LANGUAGE_NAMED[m![1]]]: tafsirEntries(ayahCount(), m![2]) };
  };
  /** Define the step `text` with `Step` as the Tafsir it names. */
  const tafsirStep = (Step: (text: string, fn: () => void) => void, text: string) => Step(text, given(text));
  /** Apply `made`, an edit the Passages module made, failing when it made none. */
  const apply = (made: PassageEdit | null) => {
    expect(made, "the edit was made").not.toBeNull();
    current = made!.passages;
  };

  const isPublishable = () => expect(publishable(current, ayahCount(), tafsir)).toBe(true);
  const notPublishable = () => expect(publishable(current, ayahCount(), tafsir)).toBe(false);
  const problemsAre = (_: unknown, table: { problem: string }[]) =>
    expect(problems(current, ayahCount(), tafsir)).toEqual(table.map((row) => row.problem.trim()));

  Background(({ Given }) => {
    Given("Surah 18's Passages from the Passages file", () => {
      current = filePassages(SURAH);
      expect(current.length).toBeGreaterThan(0);
      tafsir = {};
    });
  });

  Scenario("Every split, in either Language, is a problem of its own, in Passage order", ({ Given, And, Then }) => {
    tafsirStep(Given, "the English Tafsir entries of Surah 18 are one per Ayah, but 88–89");
    tafsirStep(And, "the Urdu Tafsir entries of Surah 18 are one per Ayah, but 82–83 and 91–92");
    Then("Surah 18's Passages are not publishable", notPublishable);
    And("the problems are, in order:", problemsAre);
  });

  Scenario("A Passage splitting an entry in English is a problem naming the Passage, the entry and English", ({ Given, And, Then }) => {
    tafsirStep(Given, "the English Tafsir entries of Surah 18 are one per Ayah, but 88–89");
    tafsirStep(And, "the Urdu Tafsir entries of Surah 18 are one per Ayah");
    Then("Surah 18's Passages are not publishable", notPublishable);
    And("the problems are, in order:", problemsAre);
  });

  Scenario("A Passage splitting an entry only in Urdu is a named problem", ({ Given, And, Then }) => {
    tafsirStep(Given, "the English Tafsir entries of Surah 18 are one per Ayah");
    tafsirStep(And, "the Urdu Tafsir entries of Surah 18 are one per Ayah, but 94–96");
    Then("Surah 18's Passages are not publishable", notPublishable);
    And("the problems are, in order:", problemsAre);
  });

  Scenario("A Passage lying inside one entry splits it at both ends", ({ Given, Then }) => {
    tafsirStep(Given, "the English Tafsir entries of Surah 18 are one per Ayah, but 88–92");
    Then("the problems are, in order:", problemsAre);
  });

  Scenario("Passages made of whole entries are publishable", ({ Given, And, Then }) => {
    tafsirStep(Given, "the English Tafsir entries of Surah 18 are one per Ayah, but 83–88 and 89–90");
    tafsirStep(And, "the Urdu Tafsir entries of Surah 18 are one per Ayah, but 95–98");
    Then("Surah 18's Passages are publishable", isPublishable);
  });

  Scenario("With no Tafsir entries in either Language, nothing is split", ({ Given, Then }) => {
    Given("Surah 18 has no Tafsir entries in either Language", () => {
      tafsir = { en: [], ur: [] };
    });
    Then("Surah 18's Passages are publishable", isPublishable);
  });

  Scenario("A split made by an edit is a problem until the Passages are whole entries again", ({ Given, Then, When, And }) => {
    tafsirStep(Given, "the English Tafsir entries of Surah 18 are one per Ayah, but 85–86");
    Then("Surah 18's Passages as the Passages file has them are publishable", isPublishable);
    When("I split 83–88 at 86", () => apply(split(current, 83, 86)));
    And("I give 86–88 the Passage titles of 89–91", () => {
      const { en, ur } = passageAt(current, "89–91");
      apply(retitle(current, 86, en, ur));
    });
    Then("the problems are, in order:", problemsAre);
    When("I move the start of 86–88 to 85", () => apply(moveStart(current, 86, 85)));
    Then("Surah 18's Passages are publishable again", isPublishable);
  });
});
