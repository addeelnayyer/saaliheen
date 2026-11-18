// #173 AC-1: the Roots, their Lemmas and Spellings, and each Script's Juz
// list, as the import writes them, read back through the site's own reads of
// Neon (src/quran/roots.ts) and held to what the builder makes of the
// committed sources.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { Pool } from "pg";
import { expect } from "vitest";
import type { Dataset } from "@saaliheen/dataset";
import { publishedHash } from "@saaliheen/dataset/published";
import { readJuz, readRoot, readRootHashes } from "../../src/quran/roots.ts";
import { buildFromCommittedSources } from "../dataset/support.ts";
import { importedCopy, readImported } from "./import-support.ts";

const feature = await loadFeature("./roots-import.feature");

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios, AfterAllScenarios }) => {
  let built: Dataset;
  let url: string;
  let pool: Pool | undefined;
  const db = () => (pool ??= new Pool({ connectionString: url, max: 4 }));

  BeforeAllScenarios(() => {
    built = buildFromCommittedSources().dataset;
  });
  AfterAllScenarios(() => pool?.end());

  Background(({ Given }) => {
    Given("a Postgres holding the import of the committed sources", async () => {
      url ??= await importedCopy("roots_import");
    });
  });

  Scenario("Every Root is imported with its Lemmas and Spellings, as the builder gives it", ({ Then, And }) => {
    Then("the database holds the builder's 1642 Roots, by QUL id", async () => {
      const ids = (await readRootHashes(db())).map((r) => r.id);
      expect(built.roots).toHaveLength(1642);
      expect(ids).toEqual(built.roots.map((r) => r.id).sort((a, b) => a - b));
    });
    And("each Root read back from the database is the builder's, with its Lemmas and Spellings in order and their meanings in both Languages", async () => {
      for (const root of built.roots) expect(await readRoot(root.id, db()), `Root ${root.id}`).toEqual(root);
    });
    And("the Root of ر ح م read back has 9 Lemmas, 84 Spellings and 339 Word locations", async () => {
      const id = built.roots.find((r) => r.letters === "ر ح م")!.id;
      const root = (await readRoot(id, db()))!;
      const spellings = root.lemmas.flatMap((l) => l.spellings);
      expect([root.lemmas.length, spellings.length, spellings.flatMap((s) => s.locations).length]).toEqual([9, 84, 339]);
    });
  });

  Scenario("Each Root's stored hash is the hash of the Root file it publishes", ({ Then }) => {
    Then("each Root's stored hash is the SHA-256 of the builder's Root as /data/v1 publishes it", async () => {
      const stored = await readRootHashes(db());
      const byId = new Map(built.roots.map((r) => [r.id, publishedHash(r)]));
      expect(stored.length).toBe(byId.size);
      for (const { id, hash } of stored) expect(hash, `Root ${id}`).toBe(byId.get(id));
    });
  });

  Scenario("Each Word's Root tag names an imported Root", ({ Then }) => {
    Then("every imported Word with a Root tag names a Root the database holds, with that Root's letters", async () => {
      const letters = new Map(built.roots.map((r) => [r.id, r.letters]));
      const tagged = (await readImported(url)).surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words)).filter((w) => w.root);
      expect(tagged.length).toBeGreaterThan(0);
      const stray = tagged.filter((w) => letters.get(w.root!.id) !== w.root!.letters).map((w) => w.location);
      expect(stray, "Words whose Root tag names no imported Root, or other letters").toEqual([]);
    });
  });

  Scenario("Each Script's Juz list is imported, as the builder gives it", ({ Then }) => {
    Then("each Script's Juz list read back from the database is the builder's, Juz 1 to 30", async () => {
      const juz = await readJuz(db());
      expect(juz.uthmani.map((j) => j.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(juz).toEqual(built.juz);
    });
  });
});
