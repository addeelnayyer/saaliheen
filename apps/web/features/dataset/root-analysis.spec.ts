import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Word } from "@saaliheen/dataset";
import {
  TRANSLITERATION,
  compareLocations,
  locationsOf,
  qulAnalysis,
  qulLocationsOf,
  qulRootNamed,
  rootNamed,
  rootTagOf,
  rootsOf,
  withoutPauseMarks,
  type Lemma,
  type Root,
  type Spelling,
} from "./root-support";
import {
  INDOPAK,
  UTHMANI,
  allWords,
  buildFromCommittedSources,
  readSource,
  wordAt,
  type TextSource,
} from "./support";

const feature = await loadFeature("./root-analysis.feature");

const sorted = (locations: string[]) => [...locations].sort(compareLocations);

/** Sorted by occurrences, highest first; ties by first Word location in Quran order. */
function expectMostFrequentFirst<T>(items: T[], count: (item: T) => number, first: (item: T) => string, where: string) {
  for (let k = 1; k < items.length; k++) {
    const [a, b] = [items[k - 1], items[k]];
    const inOrder = count(a) > count(b) || (count(a) === count(b) && compareLocations(first(a), first(b)) < 0);
    expect(inOrder, `${where}: item ${k} (${count(a)} at ${first(a)}) before item ${k + 1} (${count(b)} at ${first(b)})`).toBe(true);
  }
}
const firstOfLemma = (lemma: Lemma) => lemma.spellings[0].locations[0];
const firstOfSpelling = (spelling: Spelling) => spelling.locations[0];

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  let word: Word;
  let root: Root;

  BeforeAllScenarios(() => {
    built();
    qulAnalysis();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  ScenarioOutline("The particle or pronoun at <location> has no Root", ({ When, Then, And }, variables) => {
    When('I look up the Word at "<location>"', () => {
      word = wordAt(built(), variables.location);
    });
    Then("QUL's word root database gives that Word location no Root", () => {
      expect(qulAnalysis().rootOf.has(word.location)).toBe(false);
    });
    And("the Word has no Root", () => {
      expect(rootTagOf(word)).toBeNull();
    });
    And("no Root lists that Word location", () => {
      const holders = rootsOf(built()).filter((r) => locationsOf(r).includes(word.location));
      expect(holders.map((r) => r.letters)).toEqual([]);
    });
  });

  Scenario("Every Word carries exactly the Root QUL gives its Word location", ({ Then, And }) => {
    Then("{int} Words have a Root and {int} Words have none", (_, withRoot: number, without: number) => {
      const tags = allWords(built()).map(rootTagOf);
      expect(tags.filter((t) => t !== null)).toHaveLength(withRoot);
      expect(tags.filter((t) => t === null)).toHaveLength(without);
    });
    And("every Word's Root tag is the id and single-spaced letters of the Root QUL gives its Word location", () => {
      const { rootOf, roots } = qulAnalysis();
      for (const w of allWords(built())) {
        const id = rootOf.get(w.location);
        const expected = id === undefined ? null : { id, letters: roots.get(id)!.letters };
        expect(rootTagOf(w), w.location).toEqual(expected);
      }
    });
    And("every Root lists each Word location QUL gives it exactly once", () => {
      const { roots } = qulAnalysis();
      const dataset = rootsOf(built());
      expect(dataset.map((r) => r.id).sort((a, b) => a - b)).toEqual([...roots.keys()].sort((a, b) => a - b));
      for (const r of dataset) expect(sorted(locationsOf(r)), r.letters).toEqual(sorted(qulLocationsOf(r.id)));
    });
  });

  Scenario("ر ح م has its transliteration and QUL's counts", ({ When, Then, And }) => {
    When('I open the Root "ر ح م"', () => {
      root = rootNamed(built(), "ر ح م");
    });
    Then('its transliteration is "r-ḥ-m"', () => {
      expect(root.id).toBe(qulRootNamed("ر ح م").id);
      expect(root.transliteration).toBe("r-ḥ-m");
    });
    And(
      "it has {int} occurrences and {int} unique Words, as QUL's word root database counts them",
      (_, occurrences: number, uniqueWords: number) => {
        const qul = qulRootNamed(root.letters);
        expect([qul.wordsCount, qul.uniqueWords]).toEqual([occurrences, uniqueWords]);
        expect({ occurrences: root.occurrences, uniqueWords: root.uniqueWords }).toEqual({ occurrences, uniqueWords });
      },
    );
    And("its Word locations are the {int} Word locations QUL gives it", (_, count: number) => {
      const qul = qulLocationsOf(root.id);
      expect(qul).toHaveLength(count);
      expect(sorted(locationsOf(root))).toEqual(sorted(qul));
    });
  });

  Scenario("ر ح م's Spellings are grouped under its QUL Lemmas, most frequent first", ({ When, Then, And }) => {
    When('I open the Root "ر ح م"', () => {
      root = rootNamed(built(), "ر ح م");
    });
    Then(
      "its Lemmas are these QUL Lemmas, in this order, each with QUL's Lemma text",
      (_, table: { lemma: string; occurrences: string }[]) => {
        const { lemmaText } = qulAnalysis();
        expect(root.lemmas.map((l) => ({ id: l.id, text: l.text, occurrences: l.occurrences }))).toEqual(
          table.map((row) => ({
            id: Number(row.lemma),
            text: lemmaText.get(Number(row.lemma)),
            occurrences: Number(row.occurrences),
          })),
        );
      },
    );
    And("each Lemma's Word locations are the ones QUL's word lemma database gives that Lemma within the Root", () => {
      const { lemmaOf } = qulAnalysis();
      const rootLocations = qulLocationsOf(root.id);
      for (const lemma of root.lemmas) {
        const expected = rootLocations.filter((l) => lemmaOf.get(l) === lemma.id);
        expect(sorted(lemma.spellings.flatMap((s) => s.locations)), `Lemma ${lemma.id}`).toEqual(sorted(expected));
      }
    });
    And("each Lemma's occurrences are its Spellings' Word locations counted", () => {
      for (const lemma of root.lemmas) {
        expect(lemma.occurrences, `Lemma ${lemma.id}`).toBe(lemma.spellings.reduce((n, s) => n + s.locations.length, 0));
      }
    });
    And("the Root has {int} Spellings", (_, count: number) => {
      expect(root.lemmas.reduce((n, l) => n + l.spellings.length, 0)).toBe(count);
    });
  });

  Scenario("A Spelling is one exact text within its Lemma", ({ When, Then, And }) => {
    const uthmani = readSource<TextSource>(UTHMANI);
    const indopak = readSource<TextSource>(INDOPAK);
    When('I open the Root "ر ح م"', () => {
      root = rootNamed(built(), "ر ح م");
    });
    Then(
      "within each Lemma, a Spelling's Word locations share one Uthmani text once pause marks are set aside, and no two Spellings share one",
      () => {
        for (const lemma of root.lemmas) {
          const texts = lemma.spellings.map((s) => {
            const own = new Set(s.locations.map((l) => withoutPauseMarks(uthmani[l].text)));
            expect(own.size, `Spelling at ${s.locations[0]} mixes texts`).toBe(1);
            return [...own][0];
          });
          expect(new Set(texts).size, `Lemma ${lemma.id} repeats a Spelling`).toBe(texts.length);
        }
      },
    );
    And("each Spelling's Uthmani and Indo-Pak text is the Script texts' text at its first Word location", () => {
      for (const s of root.lemmas.flatMap((l) => l.spellings)) {
        const first = s.locations[0];
        expect({ uthmani: s.uthmani, indopak: s.indopak }, first).toEqual({
          uthmani: uthmani[first].text,
          indopak: indopak[first].text,
        });
      }
    });
    And("each Spelling's Word locations are in Quran order", () => {
      for (const s of root.lemmas.flatMap((l) => l.spellings)) expect(s.locations).toEqual(sorted(s.locations));
    });
  });

  Scenario("A Root's Word locations with no QUL Lemma are held under one Lemma with no text", ({ Then, And }) => {
    Then(
      "{int} Roots hold {int} Word locations that QUL's word lemma database gives no Lemma",
      (_, rootCount: number, locationCount: number) => {
        const { lemmaOf } = qulAnalysis();
        const holding = rootsOf(built()).filter((r) => r.lemmas.some((l) => l.id === null));
        const without = holding.flatMap((r) => r.lemmas.filter((l) => l.id === null)).flatMap((l) => l.spellings.flatMap((s) => s.locations));
        expect(holding).toHaveLength(rootCount);
        expect(without).toHaveLength(locationCount);
        for (const location of without) expect(lemmaOf.has(location), location).toBe(false);
      },
    );
    And("each such Root holds them under one Lemma whose id and text are empty", () => {
      for (const r of rootsOf(built())) {
        const empty = r.lemmas.filter((l) => l.id === null);
        expect(empty.length, r.letters).toBeLessThanOrEqual(1);
        for (const l of empty) expect(l.text, r.letters).toBeNull();
      }
    });
    And("every other Lemma's id and text are QUL's", () => {
      const { lemmaOf, lemmaText } = qulAnalysis();
      for (const r of rootsOf(built())) {
        for (const l of r.lemmas.filter((x) => x.id !== null)) {
          expect(l.text, `Lemma ${l.id}`).toBe(lemmaText.get(l.id!));
          for (const s of l.spellings) for (const location of s.locations) expect(lemmaOf.get(location), location).toBe(l.id);
        }
      }
    });
  });

  ScenarioOutline("The Root <letters> is transliterated as <transliteration>", ({ When, Then }, variables) => {
    When('I open the Root "<letters>"', () => {
      root = rootNamed(built(), variables.letters);
    });
    Then('its transliteration is "<transliteration>"', () => {
      expect(root.id).toBe(qulRootNamed(variables.letters).id);
      expect(root.transliteration).toBe(variables.transliteration);
    });
  });

  Scenario("Every Root's transliteration has one part per letter", ({ Then }) => {
    Then("every Root's transliteration is its QUL Buckwalter letters, one hyphen-joined part per Root letter", () => {
      const { roots } = qulAnalysis();
      for (const r of rootsOf(built())) {
        const qul = roots.get(r.id)!;
        const parts = [...qul.buckwalter].map((c) => TRANSLITERATION[c]);
        expect(parts.every(Boolean), `${qul.buckwalter} has an unmapped letter`).toBe(true);
        expect(parts, r.letters).toHaveLength(r.letters.split(" ").length);
        expect(r.transliteration, r.letters).toBe(parts.join("-"));
      }
    });
  });

  ScenarioOutline(
    "In every Root, <items> are sorted by occurrence count, highest first",
    ({ Then }, variables) => {
      Then(
        "in every Root the <items> are sorted by occurrence count, highest first, and by first Word location when counts tie",
        () => {
          const roots = rootsOf(built());
          expect(roots).toHaveLength(qulAnalysis().roots.size);
          for (const r of roots) {
            if (variables.items === "Lemmas") {
              expectMostFrequentFirst(r.lemmas, (l) => l.occurrences, firstOfLemma, r.letters);
            } else {
              for (const l of r.lemmas) {
                expectMostFrequentFirst(l.spellings, (s) => s.locations.length, firstOfSpelling, `${r.letters} Lemma ${l.id}`);
              }
            }
          }
        },
      );
    },
  );
});
