// #171 AC-8: the mobile scenarios' origin (features/support.ts) serves each
// Surah file with its Passages, Phrases and Phrase colours as /data/v1
// published them before they moved into Neon, read from git at 3a52736, with
// each Surah's Passages as the website loads them, from the Passage load's
// input: the Passages file as last committed, at 646e747 (Surah 57's Publish,
// which changed only that file), as the website's passage-load feature proves.
// Likewise each Surah's Phrases: the Phrases file as last committed, at edc10b5
// (Surah 2's Phrase Publishes, which changed only that file). Where those
// changed a Surah's Phrases, its Phrases and Phrase colours are the load's,
// placed and coloured by the dataset's Phrase rules, as the build would have.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { checkedPhrases, indexWords, phraseColours } from "@saaliheen/dataset/phrase-rules";
import { expect } from "vitest";
import { World } from "./support.ts";

const feature = await loadFeature("./passages-at-the-test-origin.feature");

/** main as Passages and Phrases began moving into Neon (#171). */
const BEFORE_PASSAGES_MOVED = "3a52736c23e2080c88b22f0de20e53a633497530";
/** The Passage load's input (#171): every Passage and Phrase the website loads into Neon and serves. */
const PASSAGE_LOAD = fileURLToPath(new URL("../../web/scripts/content/0013-load-passages-and-phrases-files.json", import.meta.url));
const REPO = fileURLToPath(new URL("../../../", import.meta.url));

/** A Surah file's Passages, Phrases and Words, as /data/v1 serves it. */
interface PassageSurah {
  number: number;
  passages: { from: number; till: number; en: string; ur: string }[];
  phrases: { first: string; last: string }[];
  ayahs: { number: number; words: { location: string; phraseColour?: string }[] }[];
}

/** `file` (a path in the repository) as committed at `commit`, parsed. */
const committedJson = <T>(commit: string, file: string): T =>
  JSON.parse(execFileSync("git", ["show", `${commit}:${file}`], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })) as T;

/** A Passage as the Passage load's input gives it. */
interface LoadedPassage {
  surah_no: number;
  ayah_from: number;
  ayah_till: number;
  title_en: string;
  title_ur: string;
}

type Phrases = PassageSurah["phrases"];

let load: { passages: LoadedPassage[]; phrases: Phrases } | undefined;
let phrasesBefore: Phrases | undefined;

/** Those of `phrases` in Surah `n`, as sorted keys: the same for the same Phrases in any order. */
const keysIn = (n: number, phrases: Phrases) =>
  phrases
    .filter((p) => Number(p.first.split(":")[0]) === n)
    .map((p) => `${p.first}–${p.last}`)
    .sort()
    .join();

/**
 * Surah `n`'s generated file as last committed before the move, with the
 * Passages the Passage load gives it and, where a Phrase Publish changed its
 * Phrases since, the load's Phrases and the Phrase colours they give its Words.
 */
const committedSurah = (n: number): PassageSurah => {
  load ??= JSON.parse(readFileSync(PASSAGE_LOAD, "utf8")) as { passages: LoadedPassage[]; phrases: Phrases };
  phrasesBefore ??= committedJson<Phrases>(BEFORE_PASSAGES_MOVED, "apps/web/data/phrases.json");
  const generated = committedJson<PassageSurah>(BEFORE_PASSAGES_MOVED, `apps/web/data/generated/surahs/${String(n).padStart(3, "0")}.json`);
  const surah = {
    ...generated,
    passages: load.passages.filter((p) => p.surah_no === n).map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur })),
  };
  if (keysIn(n, load.phrases) === keysIn(n, phrasesBefore)) return surah;
  const index = indexWords([surah]);
  const sorted = checkedPhrases(index, load.phrases.filter((p) => Number(p.first.split(":")[0]) === n));
  const colours = phraseColours(sorted, index);
  return {
    ...surah,
    phrases: sorted.map((p) => p.phrase),
    ayahs: surah.ayahs.map((a) => ({ ...a, words: a.words.map((w) => ({ location: w.location, phraseColour: colours.get(w.location) })) })),
  };
};

/** Each Word's location and its Phrase colour, or "none". */
const coloursOf = (surah: PassageSurah) => surah.ayahs.flatMap((a) => a.words.map((w) => `${w.location} ${w.phraseColour ?? "none"}`));

describeFeature(feature, ({ Scenario, BeforeAllScenarios, AfterAllScenarios }) => {
  const world = new World();
  BeforeAllScenarios(() => world.start());
  AfterAllScenarios(() => world.close());

  Scenario(
    "Every Surah file the test origin serves carries its Passages, Phrases and Phrase colours as committed before the move",
    ({ Given, When, Then, And }) => {
      let served: PassageSurah[] = [];
      let committed: PassageSurah[] = [];
      Given("the app's test origin is serving /data/v1", async () => {
        expect((await fetch(`${world.data.origin}/data/v1/surahs.json`)).status).toBe(200);
      });
      When("a client fetches each of the {int} Surah files from it", async (_, count: number) => {
        const numbers = Array.from({ length: count }, (_, i) => i + 1);
        served = await Promise.all(
          numbers.map(async (n) => {
            const res = await fetch(`${world.data.origin}/data/v1/surahs/${n}.json`);
            expect(res.status, `/data/v1/surahs/${n}.json`).toBe(200);
            return (await res.json()) as PassageSurah;
          }),
        );
        committed = numbers.map(committedSurah);
      });
      Then("each Surah file carries the Passages, with both Passage titles, that its committed Surah file carried before the move", () => {
        expect(committed.reduce((n, s) => n + s.passages.length, 0), "Passages committed before the move").toBeGreaterThan(0);
        const wrong = served.filter((s, i) => JSON.stringify(s.passages) !== JSON.stringify(committed[i].passages)).map((s) => s.number);
        expect(wrong, "Surah files whose Passages differ from those committed before the move").toEqual([]);
      });
      And("each Surah file carries the Phrases that its committed Surah file carried before the move", () => {
        expect(committed.reduce((n, s) => n + s.phrases.length, 0), "Phrases committed before the move").toBeGreaterThan(0);
        const wrong = served.filter((s, i) => JSON.stringify(s.phrases) !== JSON.stringify(committed[i].phrases)).map((s) => s.number);
        expect(wrong, "Surah files whose Phrases differ from those committed before the move").toEqual([]);
      });
      And("each Word carries the Phrase colour that it carried in its committed Surah file before the move, and no Word another", () => {
        const wrong = served.flatMap((s, i) => {
          const want = coloursOf(committed[i]);
          return coloursOf(s).filter((got, w) => got !== want[w]);
        });
        expect(served.flatMap(coloursOf)).toHaveLength(committed.flatMap(coloursOf).length);
        expect(wrong.slice(0, 5), `${wrong.length} Words whose Phrase colour differs from before the move`).toEqual([]);
      });
    },
  );
});
