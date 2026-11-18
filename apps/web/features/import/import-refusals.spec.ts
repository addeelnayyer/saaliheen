// #172 AC-1, AC-8: every refusal case of the dataset seam (builder-failures,
// ayah-translation's broken sources), run as the import against a database
// that already holds a good import: the import exits non-zero, naming what is
// wrong, and writes nothing.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { INDOPAK, RECITATION, UTHMANI, readSource, removeSourceCopies, sourceCopy, type TextSource, type TimingSource } from "../dataset/support.ts";
import { dropDatabase, expectSucceeded, importedCopy, runImport, snapshot, storedSourcesHash, writtenSince, type ImportRun, type Snapshot } from "./import-support.ts";

const feature = await loadFeature("./import-refusals.feature");

// Cut off mid-JSON: the file exists but does not parse.
const MALFORMED = '{"1:1:1": ';

const withoutWord = (name: string, location: string) => {
  const changed: TextSource = { ...readSource<TextSource>(name) };
  delete changed[location];
  return JSON.stringify(changed);
};
const withText = (name: string, location: string, text: string) => {
  const source = readSource<TextSource>(name);
  return JSON.stringify({ ...source, [location]: { ...source[location], text } });
};
const withAyahTimings = (ayah: string, entry: TimingSource[string] | undefined) => {
  const changed: TimingSource = { ...readSource<TimingSource>(RECITATION), [ayah]: entry! };
  if (!entry) delete changed[ayah];
  return JSON.stringify(changed);
};

/** The copies the Examples name after "a copy of the sources whose …". */
const COPIES: Record<string, () => string> = {
  "Digital Khatt Indopak text lacks Word 2:255:3": () => sourceCopy({ replace: { [INDOPAK]: withoutWord(INDOPAK, "2:255:3") } }),
  "QPC Hafs and Digital Khatt Indopak texts both lack Word 2:255:3": () =>
    sourceCopy({ replace: { [UTHMANI]: withoutWord(UTHMANI, "2:255:3"), [INDOPAK]: withoutWord(INDOPAK, "2:255:3") } }),
  "QPC Hafs and Digital Khatt Indopak texts both lack Word 2:255:51": () =>
    sourceCopy({ replace: { [UTHMANI]: withoutWord(UTHMANI, "2:255:51"), [INDOPAK]: withoutWord(INDOPAK, "2:255:51") } }),
  "QPC Hafs Ayah-end marker 2:255:51 reads 254 in Arabic-Indic digits": () =>
    sourceCopy({ replace: { [UTHMANI]: withText(UTHMANI, "2:255:51", (254).toLocaleString("ar-EG")) } }),
  "Recitation timings lack Ayah 2:255": () => sourceCopy({ replace: { [RECITATION]: withAyahTimings("2:255", undefined) } }),
  "Recitation timings of Ayah 2:255 time a Word 51": () => {
    const entry = readSource<TimingSource>(RECITATION)["2:255"];
    const timed = { ...entry, segments: [...entry.segments, [51, 999_999_000, 999_999_999] as [number, number, number]] };
    return sourceCopy({ replace: { [RECITATION]: withAyahTimings("2:255", timed) } });
  },
};

type TranslationSource = Record<string, { t: string }>;
const FOOTNOTE = /\[\[[\s\S]*?\]\]/g;
/** How each Examples `defect` breaks an Ayah translation source. */
const DEFECTS: Record<string, (source: TranslationSource) => string> = {
  "cut off mid-JSON": () => '{"1:1": ',
  "holding an entry for 1:1 with no text": (source) => JSON.stringify({ ...source, "1:1": {} }),
  "holding no entries": () => "{}",
  "holding an empty text for 1:1": (source) => JSON.stringify({ ...source, "1:1": { t: "" } }),
  "holding only a footnote for 1:1": (source) => JSON.stringify({ ...source, "1:1": { t: source["1:1"].t.match(FOOTNOTE)![0] } }),
  "lacking its entry for 1:1": (source) => JSON.stringify(Object.fromEntries(Object.entries(source).slice(1))),
  "holding an extra entry for 115:1": (source) => JSON.stringify({ ...source, "115:1": source["1:1"] }),
};

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, AfterEachScenario, AfterAllScenarios }) => {
  let url: string;
  let copy: string;
  let run: ImportRun;
  let before: Snapshot;
  let hashBefore: string | undefined;
  let scenario = 0;

  const name = () => `import_refusal_${scenario}`;
  AfterEachScenario(() => dropDatabase(name()));
  AfterAllScenarios(() => removeSourceCopies());

  // The Background runs before each scenario's own hooks, so it starts each scenario afresh.
  Background(({ Given }) => {
    Given("a Postgres holding the import of the committed sources", async () => {
      scenario++;
      url = undefined!;
      before = undefined!;
      run = undefined!;
      url = await importedCopy(name());
    });
  });

  /** The Background's database, or a failure naming why there is none (its import of the committed sources failed). */
  const imported = () => {
    expect(url, "no Postgres holding the import of the committed sources: the Background's import failed").toBeDefined();
    return url;
  };
  const runOnCopy = async () => {
    before = await snapshot(imported());
    hashBefore = await storedSourcesHash(url);
    run = runImport(url, copy);
  };
  const ran = () => {
    expect(run, "the import never ran on the copy").toBeDefined();
    return run;
  };
  const failsNaming = (named: string) => {
    ran();
    expect(run.status, `the import did not fail:\n${run.output.slice(-2000)}`).not.toBe(0);
    expect(run.status, "the import did not exit").not.toBeNull();
    expect(run.output).toContain(named);
  };
  const nothingWritten = async () => {
    expect(before, "the import never ran on the copy").toBeDefined();
    expect(await writtenSince(imported(), before), "the import wrote to the database").toEqual([]);
  };
  const hashKept = async () => {
    expect(hashBefore ?? "", "the committed sources' import stored no sources hash").toMatch(/\S/);
    expect(await storedSourcesHash(imported())).toBe(hashBefore);
  };

  Scenario("A complete copy of the sources elsewhere is the same sources, and writes nothing", ({ Given, When, Then, And }) => {
    Given("a copy of the sources with nothing left out", () => {
      copy = sourceCopy({});
    });
    When("the import runs on that copy", runOnCopy);
    Then("it exits 0", () => expectSucceeded(ran()));
    And("nothing was written to any table", nothingWritten);
  });

  /** The source copies the four file-level outlines make, by the Given that names each. */
  const FILE_COPIES: [outline: string, given: string, make: (source: string) => string][] = [
    ["The import fails, naming the file, when a source is missing", 'a copy of the sources without "<source>"', (source) => sourceCopy({ omit: source })],
    ["The import fails, naming the file, when a source is malformed", 'a copy of the sources where "<source>" is cut off mid-JSON', (source) => sourceCopy({ replace: { [source]: MALFORMED } })],
    ["The import fails, naming the file, when a source is not a JSON object", 'a copy of the sources where "<source>" is a JSON list', (source) => sourceCopy({ replace: { [source]: "[]" } })],
    ["The import fails, naming the file, when a source has no entries", 'a copy of the sources where "<source>" is an empty JSON object', (source) => sourceCopy({ replace: { [source]: "{}" } })],
  ];
  for (const [outline, given, make] of FILE_COPIES) {
    ScenarioOutline(outline, ({ Given, When, Then, And }, variables) => {
      Given(given, () => {
        copy = make(variables.source);
      });
      When("the import runs on that copy", runOnCopy);
      Then('it exits non-zero, naming "<source>"', () => failsNaming(variables.source));
      And("nothing was written to any table", nothingWritten);
      And("the stored sources hash is the committed sources'", hashKept);
    });
  }

  ScenarioOutline('The import fails, naming "<named>", when the sources do not fit together', ({ Given, When, Then, And }, variables) => {
    Given("a copy of the sources whose <copy>", () => {
      const make = COPIES[variables.copy];
      expect(make, `a known copy: ${variables.copy}`).toBeDefined();
      copy = make();
    });
    When("the import runs on that copy", runOnCopy);
    Then('it exits non-zero, naming "<named>"', () => failsNaming(variables.named));
    And("nothing was written to any table", nothingWritten);
    And("the stored sources hash is the committed sources'", hashKept);
  });

  ScenarioOutline("The import fails, naming the file, when an Ayah translation source is broken", ({ Given, When, Then, And }, { file, defect }) => {
    Given("the committed sources with <file> <defect>", () => {
      if (defect === "removed") {
        copy = sourceCopy({ omit: file });
        return;
      }
      const breakIt = DEFECTS[defect];
      expect(breakIt, `a known defect: ${defect}`).toBeDefined();
      copy = sourceCopy({ replace: { [file]: breakIt(readSource<TranslationSource>(file)) } });
    });
    When("the import runs on that copy", runOnCopy);
    Then('it exits non-zero, naming "<file>"', () => failsNaming(file));
    And("nothing was written to any table", nothingWritten);
    And("the stored sources hash is the committed sources'", hashKept);
  });
});
