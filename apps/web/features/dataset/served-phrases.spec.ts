import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Surah, Word } from "@saaliheen/dataset";
import { partAyahs, surahParts } from "@saaliheen/dataset/parts";
import { LANGUAGES } from "@saaliheen/dataset/types";
import { withPassagesAndPhrases } from "@/passages/served-surah";
import { filePassages } from "./passage-support";
import { buildFromCommittedSources } from "./support";

const feature = await loadFeature("./served-phrases.feature");

/** A Phrase as Neon and a served Surah file hold it: its first and last Word location. */
interface PhraseEntry {
  first: string;
  last: string;
}

const phrasesOf = (surah: Surah): PhraseEntry[] => surah.phrases;
const colourOf = (word: Pick<Word, "location">): unknown => (word as { phraseColour?: unknown }).phraseColour;

/** `1:1:1–1:1:4, 1:2:1–1:2:4` read into Phrases, in the order written. */
function parsePhrases(text: string): PhraseEntry[] {
  return text.split(",").map((one) => {
    const m = /^\s*(\d+:\d+:\d+)–(\d+:\d+:\d+)\s*$/.exec(one);
    expect(m, `not a Phrase: "${one}"`).not.toBeNull();
    return { first: m![1], last: m![2] };
  });
}

const surahWords = (surah: Surah): Word[] => surah.ayahs.flatMap((a) => a.words);

/** The Words of `surah` from `first` to `last`, both included, in reading order. */
function wordsFromTo(surah: Surah, first: string, last: string): Word[] {
  const words = surahWords(surah);
  const [i, j] = [first, last].map((l) => words.findIndex((w) => w.location === l));
  expect(i, `no Word ${first} in Surah ${surah.number}`).toBeGreaterThanOrEqual(0);
  expect(j, `no Word ${last} in Surah ${surah.number}`).toBeGreaterThanOrEqual(i);
  return words.slice(i, j + 1);
}

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  let outcome: { surah?: Surah; error?: unknown };

  /** Surah `n` of the committed sources' dataset served with its Passages as last committed and `phrases`. */
  const serve = (n: number, phrases: PhraseEntry[]) => {
    try {
      outcome = { surah: withPassagesAndPhrases(buildFromCommittedSources().dataset.surahs[n - 1], filePassages(n), phrases) };
    } catch (error) {
      outcome = { error };
    }
  };
  const served = () => {
    expect(outcome.error, "serving the Surah failed").toBeUndefined();
    return outcome.surah!;
  };
  /** The Surah number and Phrases a step written `... Surah <n> ...: <Phrases>` or `... Surah <n> carries the Phrases <Phrases>` names. */
  const named = (step: string) => {
    const m = /Surah (\d+)[^:]*?(?:: | carries the Phrases )(.+)$/.exec(step)!;
    return { n: Number(m[1]), phrases: parsePhrases(m[2]) };
  };
  const servedWith = (step: string) => () => serve(named(step).n, named(step).phrases);
  const carries = (step: string) => () => {
    expect(served().number).toBe(named(step).n);
    expect(phrasesOf(served())).toEqual(named(step).phrases);
  };
  const carriesColours = (n: number, table: { words: string; colour: string }[]) => {
    const surah = served();
    expect(surah.number).toBe(n);
    expect(table.length).toBeGreaterThan(0);
    for (const row of table) {
      const [{ first, last }] = parsePhrases(row.words);
      for (const word of wordsFromTo(surah, first, last)) {
        expect(colourOf(word), `the Phrase colour of ${word.location}`).toBe(row.colour);
      }
    }
  };
  const noColours = (words: Word[], where: string) => {
    expect(words.length, where).toBeGreaterThan(0);
    const coloured = words.filter((w) => colourOf(w) !== undefined).map((w) => `${w.location}: ${String(colourOf(w))}`);
    expect(coloured, `${where}: Words carrying a Phrase colour`).toEqual([]);
  };

  Scenario("A served Surah carries the Phrases it is served with, in Quran order", ({ When, Then }) => {
    When("Surah 112 is served with these Phrases: 112:3:1–112:4:2, 112:1:1–112:1:4, 112:2:1–112:2:2, 112:4:3–112:4:5", servedWith("Surah 112 is served with these Phrases: 112:3:1–112:4:2, 112:1:1–112:1:4, 112:2:1–112:2:2, 112:4:3–112:4:5"));
    Then("Surah 112 carries the Phrases 112:1:1–112:1:4, 112:2:1–112:2:2, 112:3:1–112:4:2, 112:4:3–112:4:5", carries("Surah 112 carries the Phrases 112:1:1–112:1:4, 112:2:1–112:2:2, 112:3:1–112:4:2, 112:4:3–112:4:5"));
  });

  Scenario(
    "A covered Passage's Words alternate Phrase colours a and b, Phrase by Phrase, carrying through Ayah ends",
    ({ When, Then, And }) => {
      When("Surah 112 is served with these Phrases: 112:1:1–112:1:4, 112:2:1–112:2:2, 112:3:1–112:4:2, 112:4:3–112:4:5", servedWith("Surah 112 is served with these Phrases: 112:1:1–112:1:4, 112:2:1–112:2:2, 112:3:1–112:4:2, 112:4:3–112:4:5"));
      Then("the Words of Surah 112 carry these Phrase colours:", (_, table: { words: string; colour: string }[]) =>
        carriesColours(112, table),
      );
      And("each part of Surah 112, in Urdu and in English, carries the same Phrase colour on each Word", () => {
        const surah = served();
        const colours = new Map(surahWords(surah).map((w) => [w.location, colourOf(w)]));
        for (const lang of LANGUAGES) {
          const words = surahParts(surah.ayahs.map((a) => a.words.length))
            .flatMap((part) => partAyahs(surah, part, lang))
            .flatMap((a) => a.words);
          expect(words.length).toBe(colours.size);
          for (const word of words) {
            expect(colourOf(word), `${lang} part: the Phrase colour of ${word.location}`).toBe(colours.get(word.location));
            expect(colourOf(word), `${lang} part: ${word.location} carries a Phrase colour`).toBeDefined();
          }
        }
      });
    },
  );

  Scenario("Each covered Passage starts on Phrase colour a", ({ When, Then }) => {
    When("Surah 1 is served with these Phrases: 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4, 1:6:1–1:7:9", servedWith("Surah 1 is served with these Phrases: 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4, 1:6:1–1:7:9"));
    Then("the Words of Surah {int} carry these Phrase colours:", (_, n: number, table: { words: string; colour: string }[]) =>
      carriesColours(n, table),
    );
  });

  Scenario("A single-Word Phrase takes its own Phrase colour", ({ When, Then }) => {
    When("Surah 112 is served with these Phrases: 112:1:1–112:1:1, 112:1:2–112:1:4, 112:2:1–112:4:5", servedWith("Surah 112 is served with these Phrases: 112:1:1–112:1:1, 112:1:2–112:1:4, 112:2:1–112:4:5"));
    Then("the Words of Surah {int} carry these Phrase colours:", (_, n: number, table: { words: string; colour: string }[]) =>
      carriesColours(n, table),
    );
  });

  Scenario(
    "A partly covered Passage carries no Phrase colours, while a covered Passage of the same Surah does",
    ({ When, Then, And }) => {
      When("Surah 1 is served with these Phrases: 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4", servedWith("Surah 1 is served with these Phrases: 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4"));
      Then("Surah 1 carries the Phrases 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4", carries("Surah 1 carries the Phrases 1:1:1–1:1:4, 1:2:1–1:2:4, 1:3:1–1:4:3, 1:5:1–1:5:4"));
      And("the Words of Surah 1 carry these Phrase colours:", (_, table: { words: string; colour: string }[]) =>
        carriesColours(1, table),
      );
      And("no Word of Surah 1's Passage 5–7 carries a Phrase colour", () => {
        noColours(served().ayahs.slice(4, 7).flatMap((a) => a.words), "Surah 1, Passage 5–7");
      });
    },
  );

  Scenario("A Surah served with no Phrases carries no Phrase colours", ({ When, Then, And }) => {
    When("Surah {int} is served with no Phrases", (_, n: number) => serve(n, []));
    Then("Surah {int} carries no Phrases", (_, n: number) => {
      expect(served().number).toBe(n);
      expect(phrasesOf(served())).toEqual([]);
    });
    And("no Word of Surah {int} carries a Phrase colour", (_, n: number) => noColours(surahWords(served()), `Surah ${n}`));
  });

  ScenarioOutline("Serving a Surah refuses <problem>, naming the Phrase and the problem", ({ When, Then }, variables) => {
    When("Surah <surah> is served with <problem>: <phrases>", () => serve(Number(variables.surah), parsePhrases(variables.phrases)));
    Then('serving it fails naming "<phrase>" and "<problem words>"', () => {
      expect(outcome.error, "serving the Surah did not fail").toBeDefined();
      const text = String((outcome.error as Error).message ?? outcome.error);
      expect(text, `the error does not name "${variables.phrase}"`).toContain(variables.phrase);
      expect(text.toLowerCase(), `the error does not say "${variables["problem words"]}"`).toContain(variables["problem words"].toLowerCase());
    });
  });
});
