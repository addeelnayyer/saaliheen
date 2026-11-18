import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Particle, Word } from "@saaliheen/dataset";
import { compareLocations, qulAnalysis, rootTagOf, rootsJsonByLocation, withoutPauseMarks } from "./root-support";
import {
  ENGLISH,
  INDOPAK,
  URDU,
  allWords,
  buildFromCommittedSources,
  readSource,
  wordAt,
  type MeaningSource,
  type TextSource,
} from "./support";

const feature = await loadFeature("./particle-analysis.feature");

const sorted = (locations: string[]) => [...locations].sort(compareLocations);
const locationsOf = (particle: Particle) => particle.spellings.flatMap((s) => s.locations);
const kindOf = (kind: string) => kind.toLowerCase() as Particle["kind"];

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const particles = () => {
    const list = (built().dataset as { particles?: Particle[] }).particles;
    expect(list, "the dataset has no particles (dataset.particles)").toBeDefined();
    return list!;
  };
  /** Each Word's own Uthmani text: QPC Hafs's, its printed ۞ set aside. */
  const uthmaniOf = () => (wordText ??= new Map(allWords(built()).map((w) => [w.location, w.uthmani])));
  let wordText: Map<string, string> | undefined;
  const indopak = readSource<TextSource>(INDOPAK);
  const urdu = readSource<MeaningSource>(URDU);
  const english = readSource<MeaningSource>(ENGLISH);
  /** The particle a rootless Word's sources make it: its QUL Lemma's text, else its Spelling. */
  const expectedParticle = (location: string) => {
    const { lemmaOf, lemmaText } = qulAnalysis();
    const lemma = lemmaOf.get(location);
    return lemma === undefined
      ? { kind: "spelling" as const, text: withoutPauseMarks(uthmaniOf().get(location)!) }
      : { kind: "lemma" as const, text: lemmaText.get(lemma)! };
  };
  let word: Word;

  BeforeAllScenarios(() => {
    built();
    qulAnalysis();
    rootsJsonByLocation();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs.length).toBeGreaterThan(0);
    });
  });

  Scenario("Every rootless Word belongs to exactly one particle, and Words with a Root to none", ({ Then, And }) => {
    Then("the dataset holds {int} Lemma particles and {int} Spelling particles", (_, lemmas: number, spellings: number) => {
      expect(particles().filter((p) => p.kind === "lemma")).toHaveLength(lemmas);
      expect(particles().filter((p) => p.kind === "spelling")).toHaveLength(spellings);
    });
    And("every Word QUL gives no Root carries the particle its Lemma, else its Spelling, makes it", () => {
      const byId = new Map(particles().map((p) => [p.id, p]));
      for (const w of allWords(built()).filter((w) => !qulAnalysis().rootOf.has(w.location))) {
        expect(w.particle, w.location).toBeDefined();
        const particle = byId.get(w.particle!.id)!;
        expect(w.particle, w.location).toEqual({ id: particle.id, kind: particle.kind, text: particle.text, indopak: particle.indopak });
        expect({ kind: particle.kind, text: particle.text }, w.location).toEqual(expectedParticle(w.location));
      }
    });
    And("no Word with a Root carries a particle", () => {
      const carrying = allWords(built()).filter((w) => rootTagOf(w) !== null && "particle" in w);
      expect(carrying.map((w) => w.location)).toEqual([]);
    });
    And("every particle lists each Word location of its Words exactly once, and no other", () => {
      const expected = new Map<number, string[]>();
      for (const w of allWords(built())) {
        if (w.particle) expected.set(w.particle.id, [...(expected.get(w.particle.id) ?? []), w.location]);
      }
      for (const p of particles()) expect(sorted(locationsOf(p)), `particle ${p.id}`).toEqual(expected.get(p.id));
    });
  });

  Scenario("Each particle has its kind, text, occurrence count and Spellings", ({ Then, And }) => {
    Then(
      "each Lemma particle's text is QUL's Lemma text, and each Spelling particle's its Uthmani text with pause marks set aside",
      () => {
        for (const p of particles()) {
          for (const location of locationsOf(p)) expect({ kind: p.kind, text: p.text }, location).toEqual(expectedParticle(location));
        }
      },
    );
    And("each particle's occurrence count is the number of its Word locations", () => {
      for (const p of particles()) expect(p.occurrences, `particle ${p.id}`).toBe(locationsOf(p).length);
    });
    And(
      "each particle's Spellings are its Words grouped by Uthmani text with pause marks set aside, most frequent first, each with both Scripts' text and its meaning at its first Word location",
      () => {
        const { entryAt } = rootsJsonByLocation();
        for (const p of particles()) {
          const texts = p.spellings.map((s) => {
            const own = new Set(s.locations.map((l) => withoutPauseMarks(uthmaniOf().get(l)!)));
            expect(own.size, `particle ${p.id}: Spelling at ${s.locations[0]} mixes texts`).toBe(1);
            return [...own][0];
          });
          expect(new Set(texts).size, `particle ${p.id} repeats a Spelling`).toBe(texts.length);
          for (let k = 1; k < p.spellings.length; k++) {
            const [a, b] = [p.spellings[k - 1], p.spellings[k]];
            const inOrder =
              a.locations.length > b.locations.length ||
              (a.locations.length === b.locations.length && compareLocations(a.locations[0], b.locations[0]) < 0);
            expect(inOrder, `particle ${p.id}: Spelling ${k + 1} out of order`).toBe(true);
          }
          for (const s of p.spellings) {
            const first = s.locations[0];
            const entry = entryAt.get(first);
            expect(s.locations, first).toEqual(sorted(s.locations));
            expect({ uthmani: s.uthmani, indopak: s.indopak, meaning: s.meaning }, first).toEqual({
              uthmani: uthmaniOf().get(first),
              indopak: indopak[first].text,
              meaning: entry ? { ur: entry.urdu, en: entry.english } : { ur: urdu[first], en: english[first] },
            });
          }
        }
      },
    );
    And("a Spelling particle has one Spelling", () => {
      for (const p of particles().filter((p) => p.kind === "spelling")) {
        expect(p.spellings, `particle ${p.id}`).toHaveLength(1);
        expect(p.indopak, `particle ${p.id}`).toBe(p.spellings[0].indopak);
      }
    });
  });

  Scenario("Particles are numbered from 1, most frequent first", ({ Then, And }) => {
    Then(
      "the particles are numbered {int} to {int} in order, most frequent first, ties by first Word location",
      (_, from: number, to: number) => {
        expect(particles().map((p) => p.id)).toEqual(Array.from({ length: to - from + 1 }, (_, k) => from + k));
        const first = (p: Particle) => sorted(locationsOf(p))[0];
        for (let k = 1; k < particles().length; k++) {
          const [a, b] = [particles()[k - 1], particles()[k]];
          const inOrder = a.occurrences > b.occurrences || (a.occurrences === b.occurrences && compareLocations(first(a), first(b)) < 0);
          expect(inOrder, `particle ${a.id} (${a.occurrences} at ${first(a)}) before ${b.id} (${b.occurrences} at ${first(b)})`).toBe(true);
        }
      },
    );
    And('the particle numbered 1 is the Lemma particle {string}', (_, text: string) => {
      expect({ kind: particles()[0].kind, text: particles()[0].text }).toEqual({ kind: "lemma", text });
    });
  });

  ScenarioOutline("The Word at <location> carries the <kind> particle \"<text>\"", ({ When, Then, And }, variables) => {
    When('I look up the Word at "<location>"', () => {
      word = wordAt(built(), variables.location);
    });
    Then("the Word has no Root", () => {
      expect(rootTagOf(word)).toBeNull();
    });
    And('the Word carries the <kind> particle "<text>"', () => {
      expect(word.particle && { kind: word.particle.kind, text: word.particle.text }).toEqual({
        kind: kindOf(variables.kind),
        text: variables.text,
      });
    });
  });
});
