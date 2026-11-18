import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  compareLocations,
  hamzaFolded,
  qulAnalysis,
  rootDisagreementsOf,
  rootsJsonByLocation,
  type RootDisagreement,
} from "./root-support";
import { buildFromCommittedSources } from "./support";

const feature = await loadFeature("./root-disagreements.feature");

/** The Roots the sources give `location`: QUL's single-spaced, roots.json's as written; null where one gives none. */
function sourceRoots(location: string): Omit<RootDisagreement, "location"> {
  const { rootOf, roots } = qulAnalysis();
  const id = rootOf.get(location);
  return {
    qul: id === undefined ? null : roots.get(id)!.letters,
    rootsJson: rootsJsonByLocation().rootAt.get(location) ?? null,
  };
}
const disagree = ({ qul, rootsJson }: Omit<RootDisagreement, "location">) =>
  qul === null || rootsJson === null || hamzaFolded(qul) !== hamzaFolded(rootsJson);
const orNull = (letters: string) => (letters === "" ? null : letters);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const report = () => rootDisagreementsOf(built());

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

  ScenarioOutline("The report lists <location>, where the sources' Roots disagree", ({ Then, And }, variables) => {
    const expected = () => ({ qul: orNull(variables.qul), rootsJson: orNull(variables.rootsJson) });
    Then('the sources give "<location>" the QUL Root "<qul>" and the roots.json Root "<rootsJson>"', () => {
      expect(sourceRoots(variables.location)).toEqual(expected());
    });
    And('the report lists "<location>" with exactly those Roots', () => {
      const listed = report().filter((d) => d.location === variables.location);
      expect(listed).toEqual([{ location: variables.location, ...expected() }]);
    });
  });

  Scenario("A Root written with a different hamza is not a disagreement", ({ Then, And }) => {
    Then('the sources write the Root at {string} differently only in its hamza', (_, location: string) => {
      const { qul, rootsJson } = sourceRoots(location);
      expect(qul).not.toBeNull();
      expect(rootsJson).not.toBeNull();
      expect(qul).not.toBe(rootsJson);
      expect(hamzaFolded(qul!)).toBe(hamzaFolded(rootsJson!));
    });
    And('the report does not list {string}', (_, location: string) => {
      expect(report().filter((d) => d.location === location)).toEqual([]);
    });
  });

  Scenario("The report lists every Root disagreement and nothing else", ({ Then, And }) => {
    Then("the report lists {int} Root disagreements, in Word location order", (_, count: number) => {
      const locations = report().map((d) => d.location);
      expect(locations).toHaveLength(count);
      expect(locations).toEqual([...locations].sort(compareLocations));
    });
    And(
      "{int} of them have Roots that differ, {int} only a QUL Root and {int} only a roots.json Root",
      (_, differ: number, onlyQul: number, onlyRootsJson: number) => {
        const kinds = report().map((d) => (d.qul === null ? "rootsJson" : d.rootsJson === null ? "qul" : "differ"));
        const count = (kind: string) => kinds.filter((k) => k === kind).length;
        expect({ differ: count("differ"), qul: count("qul"), rootsJson: count("rootsJson") }).toEqual({
          differ,
          qul: onlyQul,
          rootsJson: onlyRootsJson,
        });
      },
    );
    And("each one's Roots are the sources' Roots at that Word location, which differ once hamza is read as ا", () => {
      for (const d of report()) {
        const roots = sourceRoots(d.location);
        expect({ qul: d.qul, rootsJson: d.rootsJson }, d.location).toEqual(roots);
        expect(disagree(roots), d.location).toBe(true);
      }
    });
    And("every Word location the sources disagree on is listed", () => {
      const every = new Set([...qulAnalysis().rootOf.keys(), ...rootsJsonByLocation().rootAt.keys()]);
      const expected = [...every].filter((l) => disagree(sourceRoots(l))).sort(compareLocations);
      expect(report().map((d) => d.location)).toEqual(expected);
    });
  });
});
