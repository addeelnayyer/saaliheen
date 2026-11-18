// Steps for splitting a Spelling's Ayahs into parts of fifty (#288). The split
// is `spellingParts` in `@saaliheen/dataset/parts`, beside `surahParts` and
// `themeParts`: given a Spelling's Word locations in Quran order, it returns
// its parts in order, each the Ayahs it holds. `spellingsStartOpen` says
// whether a Root of so many occurrences opens with every Spelling open. Until
// they exist the steps fail on an assertion, not on the compiler.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import * as parts from "@saaliheen/dataset/parts";
import type { AyahKey } from "@saaliheen/dataset/parts";
import { compareLocations, rootNamed, rootsOf, type Root, type Spelling } from "./root-support";
import { buildFromCommittedSources } from "./support";

const feature = await loadFeature("./spelling-parts.feature");

/** What `@saaliheen/dataset/parts` exports, once it does. */
function exported<T>(name: string): T {
  const value = (parts as unknown as Record<string, unknown>)[name];
  expect(value, `@saaliheen/dataset/parts has no ${name}`).toBeTypeOf("function");
  return value as T;
}
const spellingParts = (spelling: Spelling) => exported<(locations: string[]) => AyahKey[][]>("spellingParts")(spelling.locations);
const startsOpen = (root: Root) => exported<(occurrences: number) => boolean>("spellingsStartOpen")(root.occurrences);

const key = ({ surah, ayah }: AyahKey) => `${surah}:${ayah}`;
/** The `s:a` of a Word location. */
const ayahOf = (location: string) => location.split(":").slice(0, 2).join(":");
/** The Ayahs a Spelling's Word locations are in, each once, in Quran order: read from the locations, not the split. */
const ayahsOf = (spelling: Spelling) => [...new Set([...spelling.locations].sort(compareLocations).map(ayahOf))];

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const roots = () => rootsOf(built());
  const spellings = () => roots().flatMap((root) => root.lemmas.flatMap((lemma) => lemma.spellings.map((spelling) => ({ root, spelling }))));
  /** The Spellings for which `wrong` holds, named by Root and first Word location. */
  const failing = (wrong: (spelling: Spelling) => boolean) =>
    spellings()
      .filter(({ spelling }) => wrong(spelling))
      .map(({ root, spelling }) => `${root.letters} at ${spelling.locations[0]}`);

  BeforeAllScenarios(() => {
    built();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(roots().length).toBeGreaterThan(1000);
    });
  });

  Scenario("Each Spelling's Ayahs are its Word locations' Ayahs, each once and in Quran order", ({ Then }) => {
    Then("every Spelling of every Root lists each Ayah one of its Word locations is in, once, in Quran order, and no other", () => {
      const wrong = failing((s) => JSON.stringify(spellingParts(s).flat().map(key)) !== JSON.stringify(ayahsOf(s)));
      expect(wrong, "Spellings whose Ayahs are not their Word locations' Ayahs, once each, in Quran order").toEqual([]);
    });
  });

  Scenario("Each Spelling's Ayahs split into parts of fifty, none lost or repeated", ({ Then, And }) => {
    Then("every Spelling's parts, one after another, hold exactly its Ayahs", () => {
      const wrong = failing((s) => {
        const held = spellingParts(s).flat().map(key);
        return new Set(held).size !== held.length || held.length !== ayahsOf(s).length;
      });
      expect(wrong, "Spellings whose parts lose or repeat an Ayah").toEqual([]);
    });
    And("every part but a Spelling's last holds {int} Ayahs, and its last between 1 and {int}", (_, size: number, most: number) => {
      const wrong = failing((s) => {
        const split = spellingParts(s);
        const last = split.at(-1)!.length;
        return split.slice(0, -1).some((p) => p.length !== size) || last < 1 || last > most;
      });
      expect(wrong, `Spellings with a part not of ${size} Ayahs`).toEqual([]);
    });
  });

  Scenario("A Root's occurrences add up across its Spellings", ({ Then, And }) => {
    Then("every Root's Spellings' Word locations number the Root's occurrence count", () => {
      const wrong = roots()
        .map((root) => ({ root, held: root.lemmas.flatMap((l) => l.spellings).reduce((n, s) => n + s.locations.length, 0) }))
        .filter(({ root, held }) => held !== root.occurrences)
        .map(({ root, held }) => `${root.letters}: ${held} Word locations, ${root.occurrences} occurrences`);
      expect(wrong, "Roots whose Spellings do not add up to their occurrences").toEqual([]);
    });
    And("no Word location is in two Spellings of a Root", () => {
      const wrong = roots().filter((root) => {
        const all = root.lemmas.flatMap((l) => l.spellings.flatMap((s) => s.locations));
        return new Set(all).size !== all.length;
      });
      expect(wrong.map((r) => r.letters)).toEqual([]);
    });
  });

  Scenario("ا ل ه opens closed, and its most frequent Spelling loads in many parts", ({ Then, And }) => {
    Then("the Root {string} has more than {int} occurrences, so its Spellings start closed", (_, letters: string, n: number) => {
      const root = rootNamed(built(), letters);
      expect(root.occurrences).toBeGreaterThan(n);
      expect(startsOpen(root), `${letters}'s Spellings start open`).toBe(false);
    });
    And("its most frequent Spelling has more than {int} parts", (_, n: number) => {
      const most = rootNamed(built(), "ا ل ه")
        .lemmas.flatMap((l) => l.spellings)
        .reduce((a, b) => (b.locations.length > a.locations.length ? b : a));
      expect(spellingParts(most).length).toBeGreaterThan(n);
    });
  });

  ScenarioOutline("The small Root <letters> opens with every Spelling open, each a single part", ({ Then, And }, variables) => {
    Then('the Root "<letters>" has at most 50 occurrences, so its Spellings start open', () => {
      const root = rootNamed(built(), variables.letters);
      expect(root.occurrences).toBeLessThanOrEqual(50);
      expect(startsOpen(root), `${variables.letters}'s Spellings start open`).toBe(true);
    });
    And('every Spelling of the Root "<letters>" is a single part', () => {
      for (const spelling of rootNamed(built(), variables.letters).lemmas.flatMap((l) => l.spellings)) expect(spellingParts(spelling)).toHaveLength(1);
    });
  });
});
