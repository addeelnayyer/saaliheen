import { createHash } from "node:crypto";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { afterAll, expect } from "vitest";
import { buildDataset, type BuildResult, type Passage } from "@saaliheen/dataset";
import { manifestOf, publishedFile, type Manifest } from "@saaliheen/dataset/published";
import { withPassagesAndPhrases } from "@/passages/served-surah";
import { readPassageEntries, toPassage, type PassageEntry } from "./passage-support";
import { buildFromCommittedSources, removeSourceCopies, sourceCopy } from "./support";

const feature = await loadFeature("./published-files.feature");

const SURAH = 18;

/** The Passages as last committed with one of Surah 18's edited as an Examples row names it. */
const EDITS: Record<string, (entries: PassageEntry[]) => PassageEntry[]> = {
  "89–91 in Surah 18 retitled in English": (entries) =>
    entries.map((e) => (at(e, 89) ? { ...e, title_en: `${e.title_en} (retitled)` } : e)),
  "89–91 in Surah 18 retitled in Urdu": (entries) =>
    entries.map((e) => (at(e, 89) ? { ...e, title_ur: `${e.title_ur} (نیا)` } : e)),
  "83–88 in Surah 18 split at 86": (entries) =>
    entries.flatMap((e) => (at(e, 83) ? [{ ...e, ayah_till: 85 }, { ...e, ayah_from: 86 }] : [e])),
  "the start of 95–98 in Surah 18 moved to 96": (entries) =>
    entries.map((e) => (at(e, 92) ? { ...e, ayah_till: 95 } : at(e, 95) ? { ...e, ayah_from: 96 } : e)),
};
const at = (e: PassageEntry, from: number) => e.surah_no === SURAH && e.ayah_from === from;

const manifestFrom = (result: BuildResult) => manifestOf(result.dataset);

/** The manifest of the committed sources' dataset with Surah 18 served, as /data/v1 serves it, with `entries`' Passages for it. */
function manifestServing(entries: PassageEntry[]): Manifest {
  const { dataset } = buildFromCommittedSources();
  const passages: Passage[] = entries.filter((e) => e.surah_no === SURAH).map(toPassage);
  const surahs = dataset.surahs.map((s) => (s.number === SURAH ? withPassagesAndPhrases(s, passages, []) : s));
  return manifestOf({ ...dataset, surahs });
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline }) => {
  let manifest: Manifest;
  let other: Manifest;

  afterAll(removeSourceCopies);

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(buildFromCommittedSources().dataset.surahs).toHaveLength(114);
    });
  });

  const makeManifest = () => {
    manifest = manifestFrom(buildFromCommittedSources());
  };

  Scenario("The manifest lists every Surah file with the hash of its content", ({ When, Then, And }) => {
    When("I make the manifest", makeManifest);
    Then("it lists {int} Surah files, Surah 1 first, each at {string}", (_, count: number, template: string) => {
      expect(manifest.surahs.map((s) => s.number)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      for (const s of manifest.surahs) expect(s.url).toBe(template.replace("<n>", String(s.number)));
    });
    And("each Surah file's hash is the SHA-256 of that Surah's published file, in hex", () => {
      const { surahs } = buildFromCommittedSources().dataset;
      for (const s of manifest.surahs) {
        const body = publishedFile(surahs[s.number - 1]);
        expect(JSON.parse(body)).toEqual(surahs[s.number - 1]);
        expect(s.hash, `Surah ${s.number}`).toBe(createHash("sha256").update(body).digest("hex"));
      }
    });
    And("it names the minimum app version {string}", (_, version: string) => {
      expect(manifest.minAppVersion).toBe(version);
    });
    And("it names a dataset version", () => {
      expect(manifest.datasetVersion).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  Scenario("The same dataset always gives the same manifest", ({ When, And, Then }) => {
    When("I make the manifest", makeManifest);
    And("I make the manifest of the dataset built again from the same sources", () => {
      other = manifestFrom(buildDataset({ sourceDir: sourceCopy({}) }));
    });
    Then("the two manifests are the same", () => {
      expect(other).toEqual(manifest);
    });
  });

  ScenarioOutline("<edit> changes Surah 18's hash and no other Surah's", ({ When, And, Then }, variables) => {
    When("I make the manifest with Surah 18 served with its Passages as last committed", () => {
      manifest = manifestServing(readPassageEntries());
    });
    And("I make the manifest with Surah 18 served with those Passages after <edit>", () => {
      const edit = EDITS[variables.edit];
      expect(edit, `no such edit: ${variables.edit}`).toBeDefined();
      const edited = edit(readPassageEntries());
      expect(edited).not.toEqual(readPassageEntries());
      other = manifestServing(edited);
    });
    Then("Surah 18's hash differs between the two manifests", () => {
      expect(other.surahs[SURAH - 1].hash).not.toBe(manifest.surahs[SURAH - 1].hash);
    });
    And("every other Surah's hash is the same in both", () => {
      const others = (m: Manifest) => m.surahs.filter((s) => s.number !== SURAH);
      expect(others(other)).toEqual(others(manifest));
    });
    And("the dataset versions differ", () => {
      expect(other.datasetVersion).not.toBe(manifest.datasetVersion);
    });
  });
});
