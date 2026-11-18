// #171 AC-1 and AC-3: the Passage load's refusals, and the reasons the
// Passages module gives, at the dataset seam (checkedLoad, the load's checks
// before it writes a row).

import fs from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Surah } from "@saaliheen/dataset";
import { problems, type Passage } from "@saaliheen/passages";
import { checkedLoad, type PassagesInput } from "../../scripts/content/passages";
import { buildFromCommittedSources } from "./support";

const feature = await loadFeature("./passage-load-refusals.feature");

const CARRIED = new URL("../../scripts/content/0013-load-passages-and-phrases-files.json", import.meta.url);
const carried = (): PassagesInput => JSON.parse(fs.readFileSync(CARRIED, "utf8")) as PassagesInput;

/** `1–3 untitled in English, 4–6` read into Passages, titled unless written untitled. */
function passagesWritten(text: string): Passage[] {
  return text.split(",").map((one) => {
    const m = /^\s*(\d+)(?:–(\d+))?(?: untitled in (English|Urdu))?\s*$/.exec(one);
    if (!m) throw new Error(`not a Passage: "${one}"`);
    const [from, till] = [Number(m[1]), Number(m[2] ?? m[1])];
    return { from, till, en: m[3] === "English" ? "" : `Passage ${from}–${till}`, ur: m[3] === "Urdu" ? "" : `Passage ${from}–${till} (ur)` };
  });
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeEachScenario }) => {
  let input: PassagesInput;
  let outcome: { served?: Surah[]; error?: unknown };
  let named: string[] = [];

  BeforeEachScenario(() => {
    outcome = {};
    named = [];
  });

  const check = () => {
    try {
      outcome = { served: checkedLoad(input, buildFromCommittedSources().dataset.surahs) };
    } catch (error) {
      outcome = { error };
    }
  };
  const refusal = () => {
    expect(outcome.error, "the load was not refused").toBeDefined();
    return String((outcome.error as Error).message ?? outcome.error);
  };
  const withPassages = (surah: number, passages: Passage[]) => {
    const others = input.passages.filter((p) => p.surah_no !== surah);
    const placed = passages.map((p) => ({ surah_no: surah, ayah_from: p.from, ayah_till: p.till, title_en: p.en, title_ur: p.ur }));
    input = { ...input, passages: [...others, ...placed] };
  };
  const addPhrase = (written: string) => {
    const [first, last] = written.split("–");
    input = { ...input, phrases: [...input.phrases, { first, last }] };
  };

  Background(({ Given }) => {
    Given("the load's input as it carries it", () => {
      input = carried();
    });
  });

  Scenario("The carried input passes the load's checks", ({ When, Then }) => {
    When("the load checks its input", check);
    Then("it passes, serving {int} Surahs with {int} Passages and {int} Phrases", (_, surahs: number, passages: number, phrases: number) => {
      expect(outcome.error, String(outcome.error)).toBeUndefined();
      const served = outcome.served!;
      expect(served.map((s) => s.number)).toEqual(Array.from({ length: surahs }, (_, i) => i + 1));
      expect(served.flatMap((s) => s.passages).length).toBe(passages);
      expect(served.flatMap((s) => s.phrases).length).toBe(phrases);
    });
  });

  ScenarioOutline("The load refuses <problem>, naming the Surah and its Ayahs", ({ Given, When, Then }, variables) => {
    Given("<problem>: Surah <surah>'s Passages in the input are <passages>", () => withPassages(Number(variables.surah), passagesWritten(variables.passages)));
    When("the load checks its input", check);
    Then('the load is refused, saying "<reason>"', () => {
      expect(refusal()).toContain(variables.reason);
    });
  });

  Scenario("The load names a Passage starting past the Surah's end once, by its Ayahs", ({ Given, When, Then, And }) => {
    Given("Surah {int}'s Passages in the input are 1–6, 8–9", (_, surah: number) => withPassages(surah, passagesWritten("1–6, 8–9")));
    When("the load checks its input", check);
    Then('the load is refused, saying {string}', (_, reason: string) => {
      expect(refusal()).toContain(reason);
    });
    And('the refusal does not say {string}', (_, words: string) => {
      expect(refusal()).not.toContain(words);
    });
  });

  ScenarioOutline("The load refuses <problem>, naming the Phrase", ({ Given, When, Then, And }, variables) => {
    Given("<problem>: the Phrase <phrase> is added to the input", () => addPhrase(variables.phrase));
    When("the load checks its input", check);
    Then('the load is refused, saying "<reason>"', () => {
      expect(refusal()).toContain(variables.reason);
    });
    And('the refusal says "<also>"', () => {
      expect(refusal().toLowerCase()).toContain(variables.also.toLowerCase());
    });
  });

  ScenarioOutline("The Passages module names what is wrong with Surah 109's Passages <passages>", ({ When, Then }, variables) => {
    When("the Passages module checks Surah 109's Passages <passages>", () => {
      named = problems(passagesWritten(variables.passages), 6);
    });
    Then('it names exactly "<problems>"', () => {
      expect(named.join("; ")).toBe(variables.problems ?? "");
    });
  });
});
