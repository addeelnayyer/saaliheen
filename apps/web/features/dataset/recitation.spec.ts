import { createHash } from "node:crypto";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Recitation } from "@saaliheen/dataset";
import { manifestOf, publishedFile, type Manifest } from "@saaliheen/dataset/published";
import { firstSaidAt, recitedWordAt } from "@saaliheen/dataset/recitation";
import { RECITATION, buildFromCommittedSources, readSource, type TimingSource } from "./support";

const feature = await loadFeature("./recitation.feature");

let source: TimingSource | undefined;
const timingSource = () => (source ??= readSource<TimingSource>(RECITATION));

/** The source's timings of `ayah` (`s:a`) in the order the Reciter says them: by start, ties as listed. */
const saidInOrder = (ayah: string) => timingSource()[ayah].segments.toSorted((x, y) => x[1] - y[1]);

/** A time named as the Examples write it: "the start of 1:1's timing 2 less 1 ms", from the source's timings in order. */
function timeNamed(name: string): number {
  const match = /^the (start|end) of (\d+:\d+)'s timing (\d+)(?: (less|plus) (\d+) ms)?$/.exec(name);
  expect(match, `no such time: ${name}`).not.toBeNull();
  const [, edge, ayah, nth, sign, ms] = match!;
  const timing = saidInOrder(ayah)[Number(nth) - 1];
  const at = edge === "start" ? timing[1] : timing[2];
  return at + (sign === "less" ? -Number(ms) : Number(ms ?? 0));
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const recitations = () => built().dataset.recitations;
  const recitationOf = (surah: number): Recitation => recitations()[surah - 1];
  let manifest: Manifest;

  BeforeAllScenarios(() => {
    built();
    timingSource();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  Scenario("Each Recitation is published as its own file, listed in the manifest", ({ When, Then, And }) => {
    When("I make the manifest", () => {
      manifest = manifestOf(built().dataset);
    });
    Then("it lists {int} Recitation files, Surah 1 first, each at {string}", (_, count: number, template: string) => {
      expect(manifest.recitations.map((r) => r.number)).toEqual(Array.from({ length: count }, (_, k) => k + 1));
      for (const r of manifest.recitations) expect(r.url).toBe(template.replace("<n>", String(r.number)));
    });
    And("each Recitation file's hash is the SHA-256 of that Recitation's published file, in hex", () => {
      for (const r of manifest.recitations) {
        const body = publishedFile(recitationOf(r.number));
        expect(r.hash, `Surah ${r.number}`).toBe(createHash("sha256").update(body).digest("hex"));
      }
    });
  });

  Scenario("The Reciter repeats Words of 2:9, and its timings go back with him", ({ Then }) => {
    Then("the Word timings of 2:9 run through Words {int} to {int}, then {int} to {int}", (_, a: number, b: number, c: number, d: number) => {
      const run = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => from + k);
      expect(recitationOf(2).ayahs[8].words.map(([word]) => word)).toEqual([...run(a, b), ...run(c, d)]);
    });
  });

  Scenario("The report lists the Words with no timing", ({ Then, And }) => {
    const listed = () => built().report.untimedWords;
    Then(
      "the report lists the untimed Words {string}, {string}, {string}, {string} and {string}",
      (_, a: string, b: string, c: string, d: string, e: string) => {
        expect(listed().toSorted()).toEqual([a, b, c, d, e].sort());
      },
    );
    And("every Word the source gives no timing is listed, and nothing else", () => {
      const untimed = built().dataset.surahs.flatMap((surah) =>
        surah.ayahs.flatMap((ayah) => {
          const timed = new Set(timingSource()[`${surah.number}:${ayah.number}`].segments.map(([word]) => word));
          return ayah.words.filter((_, k) => !timed.has(k + 1)).map((w) => w.location);
        }),
      );
      expect(listed()).toEqual(untimed);
    });
  });

  Scenario("Played from the start of 2:9, no Word is recited until 2:9's first Word starts", ({ Then, And }) => {
    const from = () => recitationOf(2).ayahs[8].from;
    Then("played from the start of 2:9, the Recited Word at the start of 2:9 is none", () => {
      expect(timingSource()["2:9"].timestamp_from).toBe(from());
      expect(recitedWordAt(recitationOf(2), from())).not.toBeNull();
      expect(recitedWordAt(recitationOf(2), from(), from())).toBeNull();
    });
    And('played from the start of 2:9, the Recited Word at the start of 2:9\'s timing 1 is {string}', (_, word: string) => {
      expect(recitedWordAt(recitationOf(2), timeNamed("the start of 2:9's timing 1"), from())).toBe(word);
    });
  });

  ScenarioOutline("The Recited Word at <time> is <word>", ({ Then }, variables) => {
    Then('the Recited Word of Surah <surah> at <time> is "<word>"', () => {
      expect(recitedWordAt(recitationOf(Number(variables.surah)), timeNamed(variables.time))).toBe(variables.word);
    });
  });

  ScenarioOutline("The Reciter first says <word> at <time>", ({ Then }, variables) => {
    Then('the Reciter first says "<word>" at <time>', () => {
      const surah = Number(variables.word.split(":")[0]);
      expect(firstSaidAt(recitationOf(surah), variables.word)).toBe(timeNamed(variables.time));
    });
  });

  Scenario("A Word with no timing is never said", ({ Then }) => {
    Then("the Reciter never says {string}", (_, word: string) => {
      expect(built().report.untimedWords).toContain(word);
      expect(firstSaidAt(recitationOf(Number(word.split(":")[0])), word)).toBeNull();
    });
  });
});
