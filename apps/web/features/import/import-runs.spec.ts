// #172 AC-1, AC-8: the import's runs: the first into an empty Postgres, what
// it reports, a second run that writes nothing, and a changed source that
// loads again under a new sources hash.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import fs from "node:fs";
import path from "node:path";
import { expect } from "vitest";
import { readJuz, readRoot, readRootHashes } from "../../src/quran/roots.ts";
import { DATA, URDU, buildFromCommittedSources, readSource, removeSourceCopies, sourceCopy, type MeaningSource } from "../dataset/support.ts";
import {
  builtExpected,
  expectSucceeded,
  dropDatabase,
  freshDatabase,
  importedCopy,
  query,
  readImported,
  runImport,
  snapshot,
  storedSourcesHash,
  throughSite,
  writtenSince,
  type ImportRun,
  type Snapshot,
} from "./import-support.ts";

const feature = await loadFeature("./import-runs.feature");

/** The sources with `suffix` added to the Urdu Word meaning of `location`. */
const withChangedMeaning = (location: string, suffix: string) => {
  const urdu = readSource<MeaningSource>(URDU);
  return sourceCopy({ replace: { [URDU]: JSON.stringify({ ...urdu, [location]: urdu[location] + suffix }) } });
};

/** roots.json: each Root's letters, and the meanings it gives at its Word locations. */
type RootsJson = Record<string, { word: string; urdu: string; english: string; count: number; locations: string[] }[]>;

/** The sources with `suffix` added to roots.json's English meaning at `location` under Root `letters`. */
const withChangedRootMeaning = (letters: string, location: string, suffix: string) => {
  const roots = JSON.parse(fs.readFileSync(path.join(DATA, "roots.json"), "utf8")) as RootsJson;
  const changed = { ...roots, [letters]: roots[letters].map((e) => (e.locations.includes(location) ? { ...e, english: e.english + suffix } : e)) };
  return sourceCopy({ replaceData: { "roots.json": JSON.stringify(changed) } });
};

describeFeature(feature, ({ Scenario, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario, AfterEachScenario }) => {
  let url: string;
  let run: ImportRun;
  let before: Snapshot;
  let hashBefore: string | undefined;
  let copy: string;
  let scenario = 0;

  BeforeAllScenarios(() => {
    buildFromCommittedSources();
  });
  BeforeEachScenario(() => {
    scenario++;
  });
  AfterEachScenario(() => dropDatabase(name()));
  AfterAllScenarios(() => removeSourceCopies());

  const name = () => `import_runs_${scenario}`;
  const runOn = async (sourceDir?: string) => {
    before = await snapshot(url);
    hashBefore = await storedSourcesHash(url);
    run = runImport(url, sourceDir);
  };
  const exitsZero = () => expectSucceeded(run);
  const nothingWritten = async () => {
    expect(await writtenSince(url, before), "the import wrote to the database").toEqual([]);
  };

  Scenario("The first run into an empty Postgres loads the Quran and stores the sources' hash", ({ Given, When, Then, And }) => {
    Given("an empty Postgres", async () => {
      url = await freshDatabase(name());
    });
    When("the import runs on the committed sources", () => runOn());
    Then("it exits 0", exitsZero);
    And("the database holds {int} Surahs, {int} Ayahs and a Word for every Word location the builder gives", async (_, surahs: number, ayahs: number) => {
      const [counts] = await query<{ surahs: number; ayahs: number }>(url, "select (select count(*) from surah)::int as surahs, (select count(*) from ayah)::int as ayahs");
      expect(counts).toEqual({ surahs, ayahs });
      const locations = (await query<{ location: string }>(url, "select location from word order by surah, ayah, position")).map((w) => w.location);
      expect(locations).toEqual(builtExpected().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words.map((w) => w.location))));
    });
    And("it stores a hash of the sources", async () => {
      expect(hashBefore).toBeUndefined();
      expect((await storedSourcesHash(url)) ?? "", "the stored sources hash").toMatch(/\S/);
    });
  });

  Scenario("The import reports what QUL lacks, as the builder does", ({ Given, When, Then, And }) => {
    const { report } = buildFromCommittedSources();
    Given("an empty Postgres", async () => {
      url = await freshDatabase(name());
    });
    When("the import runs on the committed sources", () => runOn());
    Then("it exits 0", exitsZero);
    And("its output names every Word meaning gap the builder's report lists, {int} in all", (_, count: number) => {
      expect(report.wordMeaningGaps).toHaveLength(count);
      for (const gap of report.wordMeaningGaps) expect(run.output, `the gap at ${gap.location} (${gap.language})`).toContain(gap.location);
    });
    And(
      "its output names the untimed Words {string}, {string}, {string}, {string} and {string}",
      (_, a: string, b: string, c: string, d: string, e: string) => {
        expect(report.untimedWords).toEqual([a, b, c, d, e]);
        for (const location of [a, b, c, d, e]) expect(run.output).toContain(location);
      },
    );
    And("its output names every Root disagreement the builder's report lists, {int} in all, with QUL's letters and roots.json's", (_, count: number) => {
      expect(report.rootDisagreements).toHaveLength(count);
      for (const { location, qul, rootsJson } of report.rootDisagreements) {
        expect(run.output, `the Root disagreement at ${location}`).toContain(`${location} (${qul ?? "none"} / ${rootsJson ?? "none"})`);
      }
    });
    And("each Word with a Word meaning gap is imported with the builder's Word meanings", async () => {
      const gaps = new Set(report.wordMeaningGaps.map((g) => g.location));
      const imported = (await readImported(url)).surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words)).filter((w) => gaps.has(w.location));
      const built = builtExpected().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words)).filter((w) => gaps.has(w.location));
      expect(imported.length).toBe(gaps.size);
      expect(imported).toEqual(built);
    });
  });

  Scenario("A second run with unchanged sources writes nothing", ({ Given, When, Then, And }) => {
    Given("a Postgres holding the import of the committed sources", async () => {
      url = await importedCopy(name());
    });
    When("the import runs on the committed sources again", () => runOn());
    Then("it exits 0", exitsZero);
    And("nothing was written to any table", nothingWritten);
    And("the stored sources hash is the same", async () => {
      expect(hashBefore ?? "", "the stored sources hash before").toMatch(/\S/);
      expect(await storedSourcesHash(url)).toBe(hashBefore);
    });
  });

  Scenario("A changed source loads again, and stores the new sources' hash", ({ Given, And, When, Then }) => {
    const urdu = readSource<MeaningSource>(URDU);
    let suffix: string;
    Given("a Postgres holding the import of the committed sources", async () => {
      url = await importedCopy(name());
    });
    And("a copy of the sources whose Urdu Word meaning of 1:1:1 has {string} added to it", (_, added: string) => {
      suffix = added;
      copy = withChangedMeaning("1:1:1", added);
    });
    When("the import runs on that copy", () => runOn(copy));
    Then("it exits 0", exitsZero);
    And("Word 1:1:1's Urdu Word meaning in the database is QUL's with {string} added to it", async (_, added: string) => {
      expect(await query(url, "select meaning_ur from word where location = '1:1:1'")).toEqual([{ meaning_ur: urdu["1:1:1"] + added }]);
    });
    And("every other Word's Word meanings in the database are the builder's", async () => {
      const others = (words: { location: string; meaning: unknown }[]) => words.filter((w) => w.location !== "1:1:1").map((w) => ({ location: w.location, meaning: w.meaning }));
      const imported = (await readImported(url)).surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words));
      expect(others(imported)).toEqual(others(builtExpected().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words))));
      expect(suffix).toBeTruthy();
    });
    And("the stored sources hash differs from the committed sources'", async () => {
      expect(hashBefore ?? "", "the stored sources hash before").toMatch(/\S/);
      const after = await storedSourcesHash(url);
      expect(after ?? "", "the stored sources hash after").toMatch(/\S/);
      expect(after).not.toBe(hashBefore);
    });
  });

  Scenario("Running the changed copy again writes nothing", ({ Given, When, Then, And }) => {
    Given("a Postgres holding the import of a copy of the sources whose Urdu Word meaning of 1:1:1 has {string} added to it", async (_, added: string) => {
      copy = withChangedMeaning("1:1:1", added);
      url = await importedCopy(name());
      expectSucceeded(runImport(url, copy));
    });
    When("the import runs on that copy again", () => runOn(copy));
    Then("it exits 0", exitsZero);
    And("nothing was written to any table", nothingWritten);
  });

  Scenario("A changed Root meaning in roots.json loads again, into the Root's Spelling", ({ Given, And, When, Then }) => {
    const roots = JSON.parse(fs.readFileSync(path.join(DATA, "roots.json"), "utf8")) as RootsJson;
    let entry: RootsJson[string][number];
    Given("a Postgres holding the import of the committed sources", async () => {
      url = await importedCopy(name());
    });
    And(
      "a copy of the sources whose roots.json English meaning at {string} under {string} has {string} added to it",
      (_, location: string, letters: string, added: string) => {
        const found = roots[letters]?.find((e) => e.locations.includes(location));
        expect(found, `roots.json gives ${location} under ${letters}`).toBeDefined();
        entry = found!;
        copy = withChangedRootMeaning(letters, location, added);
      },
    );
    When("the import runs on that copy", () => runOn(copy));
    Then("it exits 0", exitsZero);
    And(
      "the Root {string} read back from the database gives the Spelling at {string} roots.json's English meaning with {string} added to it",
      async (_, letters: string, location: string, added: string) => {
        const id = buildFromCommittedSources().dataset.roots.find((r) => r.letters === letters)!.id;
        const root = await throughSite(url, (db) => readRoot(id, db));
        const spelling = root!.lemmas.flatMap((l) => l.spellings).find((s) => s.locations.includes(location));
        expect(spelling?.meaning.en).toBe(entry.english + added);
      },
    );
    And("the stored sources hash differs from the committed sources'", async () => {
      expect(hashBefore ?? "", "the stored sources hash before").toMatch(/\S/);
      expect(await storedSourcesHash(url)).not.toBe(hashBefore);
    });
  });

  Scenario("A Postgres the import loaded before the Roots moved into it loads again, with its Roots", ({ Given, When, Then, And }) => {
    Given(
      "a Postgres holding an import made before the Roots moved into it: Words carrying their Root's letters, and no Root or Juz tables",
      async () => {
        url = await importedCopy(name());
        // The tables as #172's import left them: Root letters on each Word row, under its check.
        await query(
          url,
          `alter table word drop constraint word_root_id_fkey;
           alter table word add column root_letters text;
           update word w set root_letters = r.letters from root r where r.id = w.root_id;
           alter table word add check ((root_id is null) = (root_letters is null));
           drop table spelling_word, spelling, lemma, root, juz;
           update dataset_import set sources_hash = 'before #173'`,
        );
      },
    );
    When("the import runs on the committed sources", () => runOn());
    Then("it exits 0", exitsZero);
    And("the database holds the builder's Roots and both Scripts' Juz lists", async () => {
      const { dataset } = buildFromCommittedSources();
      const [hashes, juz] = await throughSite(url, (db) => Promise.all([readRootHashes(db), readJuz(db)]));
      expect(hashes.map((h) => h.id)).toEqual(dataset.roots.map((r) => r.id).sort((a, b) => a - b));
      expect(juz).toEqual(dataset.juz);
    });
    And("no Word row carries its Root's letters, which come from its Root", async () => {
      expect(await query(url, "select column_name from information_schema.columns where table_name = 'word' and column_name = 'root_letters'")).toEqual([]);
      const imported = (await readImported(url)).surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words));
      expect(imported).toEqual(builtExpected().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words)));
    });
  });
});
