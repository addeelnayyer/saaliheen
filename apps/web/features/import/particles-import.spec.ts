// #249 AC-1: the particles, their Spellings and each rootless Word's particle,
// as the import writes them, read back through the site's own reads of Neon
// (src/quran/particles.ts, src/quran/quran.ts) and held to what the builder
// makes of the committed sources.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { Pool } from "pg";
import { expect } from "vitest";
import type { Dataset } from "@saaliheen/dataset";
import { publishedHash } from "@saaliheen/dataset/published";
import { readParticle, readParticleHashes } from "../../src/quran/particles.ts";
import { readSurahs } from "../../src/quran/quran.ts";
import { qulAnalysis } from "../dataset/root-support.ts";
import { buildFromCommittedSources } from "../dataset/support.ts";
import { dropDatabase, expectSucceeded, throughSite, importedCopy, query, runImport, snapshot, writtenSince, type ImportRun } from "./import-support.ts";

const feature = await loadFeature("./particles-import.feature");

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios, AfterAllScenarios }) => {
  let built: Dataset;
  let url: string;
  let pool: Pool | undefined;
  const db = () => (pool ??= new Pool({ connectionString: url, max: 4 }));
  const builtWords = () => built.surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words));
  /** The databases a scenario changes, each its own copy, dropped after. */
  const own: string[] = [];
  let ownUrl: string;
  let run: ImportRun;
  const exitsZero = () => expectSucceeded(run);

  BeforeAllScenarios(() => {
    built = buildFromCommittedSources().dataset;
  });
  AfterAllScenarios(async () => {
    await pool?.end();
    for (const name of own) await dropDatabase(name);
  });

  Background(({ Given }) => {
    Given("a Postgres holding the import of the committed sources", async () => {
      url ??= await importedCopy("particles_import");
    });
  });

  Scenario("Every particle is imported with its Spellings, as the builder gives it", ({ Then, And }) => {
    Then(
      "the database holds the builder's {int} particles: {int} Lemma particles and {int} Spelling particles",
      async (_, count: number, lemmas: number, spellings: number) => {
        expect([built.particles.length, ...["lemma", "spelling"].map((k) => built.particles.filter((p) => p.kind === k).length)]).toEqual([
          count,
          lemmas,
          spellings,
        ]);
        expect(await readParticleHashes(db())).toHaveLength(count);
      },
    );
    And(
      "each particle read back from the database is the builder's, with its Spellings in order and their meanings in both Languages",
      async () => {
        for (const particle of built.particles) expect(await readParticle(particle.id, db()), `particle ${particle.id}`).toEqual(particle);
        expect(await readParticle(built.particles.length + 1, db())).toBeUndefined();
      },
    );
    And("the particles' Spellings hold the {int} Word locations QUL gives no Root, each once", async (_, count: number) => {
      const rows = await query<{ location: string }>(url, "select location from particle_word");
      const rootless = builtWords().filter((w) => !qulAnalysis().rootOf.has(w.location));
      expect(rootless).toHaveLength(count);
      expect(rows.map((r) => r.location).sort()).toEqual(rootless.map((w) => w.location).sort());
    });
  });

  Scenario("Each particle's stored hash is the hash of the particle file it publishes", ({ Then }) => {
    Then("each particle's stored hash is the SHA-256 of the builder's particle as /data/v1 publishes it", async () => {
      expect(await readParticleHashes(db())).toEqual(built.particles.map(publishedHash));
    });
  });

  Scenario("Every Word has a Root or a particle, never both", ({ Then, And }) => {
    Then("every imported Word read back has a Root tag or a particle, never both, as the builder gives it", async () => {
      const words = (await readSurahs(db())).flatMap((s) => s.ayahs.flatMap((a) => a.words));
      const both = words.filter((w) => (w.root === null) === (w.particle === undefined)).map((w) => w.location);
      expect(both, "Words with both a Root and a particle, or neither").toEqual([]);
      expect(words).toEqual(builtWords());
    });
    And("the database refuses a Word with both a Root and a particle", async () => {
      const rooted = `(select location from word where root_id is not null order by location limit 1)`;
      await expect(query(url, `update word set particle_id = 1 where location = ${rooted}`)).rejects.toThrow(/word_root_or_particle/);
      await expect(query(url, `update word set root_id = null where location = ${rooted}`)).rejects.toThrow(/word_root_or_particle/);
    });
  });

  Scenario("A second run with unchanged sources writes no particle", ({ When, Then, And }) => {
    let before: Awaited<ReturnType<typeof snapshot>>;
    When("the import runs on the committed sources again", async () => {
      own.push("particles_rerun");
      ownUrl = await importedCopy("particles_rerun");
      before = await snapshot(ownUrl);
      run = runImport(ownUrl);
    });
    Then("it exits 0", exitsZero);
    And("nothing was written to any table", async () => {
      expect(Object.keys(before.rows)).toEqual(expect.arrayContaining(["particle", "particle_spelling", "particle_word"]));
      expect(await writtenSince(ownUrl, before)).toEqual([]);
    });
  });

  Scenario("A Postgres the import loaded before particles loads again, with its particles", ({ Given, When, Then, And }) => {
    Given("the import's tables as they were before particles: no particle tables, and no particle on any Word row", async () => {
      own.push("particles_upgrade");
      ownUrl = await importedCopy("particles_upgrade");
      await query(
        ownUrl,
        `alter table word drop constraint word_root_or_particle;
         alter table word drop column particle_id;
         drop table particle_word, particle_spelling, particle;
         update dataset_import set sources_hash = 'before #249'`,
      );
    });
    When("the import runs on the committed sources", () => {
      run = runImport(ownUrl);
    });
    Then("it exits 0", exitsZero);
    And("the database holds the builder's particles, and each Word with no Root names its particle", async () => {
      const [hashes, surahs] = await throughSite(ownUrl, (db) => Promise.all([readParticleHashes(db), readSurahs(db)]));
      expect(hashes).toEqual(built.particles.map(publishedHash));
      expect(surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words))).toEqual(builtWords());
    });
  });
});
