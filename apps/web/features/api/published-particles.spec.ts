// /data/v1 publishes each particle's file beside the Root files (#249, AC-2
// and AC-3): each particle file, at /data/v1/particles/ and at /particles/,
// the manifest, the Surah files and Surah parts fetched over HTTP, as the
// website's Particle dialog and the mobile app fetch them, from the server
// ./serve-api.ts serves, and held to what the dataset builder makes of the
// committed sources. The hashes are computed here, apart from the dataset
// package, as a client would.

import { createHash } from "node:crypto";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Particle, Word } from "@saaliheen/dataset";
import { buildFromCommittedSources } from "../dataset/support.ts";
import { committedRoots } from "../site/committed-output.ts";
import { builtParticleList, particleAt } from "./built-surah.ts";
import { expectKeptByACdnForADay, fetched, published, servedParticles, type Fetched } from "./support";

const feature = await loadFeature("./published-particles.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The SHA-256 of `body`, in hex. */
const sha256 = (body: string) => createHash("sha256").update(body).digest("hex");

/** The manifest's shape: the parts read here. */
interface Manifest {
  datasetVersion: string;
  surahs: { url: string }[];
  recitations: { url: string }[];
}

/** A served Word: its location, Root tag and any particle, among the rest. */
type ServedWord = Pick<Word, "location" | "root" | "particle">;

const LANGUAGE = { Urdu: "ur", English: "en" } as const;

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  const particles = (): Particle[] => buildFromCommittedSources().dataset.particles;
  /** The files fetched in this scenario, the last one last. */
  let files: Fetched[] = [];

  BeforeEachScenario(() => {
    files = [];
  });

  const last = () => {
    const file = files.at(-1);
    if (!file) throw new Error("nothing fetched yet in this scenario");
    return file;
  };

  /** Fetch each of the builder's particles' files under `dir`, as many at once as a client might. */
  async function fetchParticles(dir: string, count: number) {
    expect(particles(), "the builder's particles").toHaveLength(count);
    files = [];
    for (let i = 0; i < count; i += 16) {
      files.push(...(await Promise.all(particles().slice(i, i + 16).map((p) => fetched(`${dir}${p.id}.json`)))));
    }
  }

  /** Expect each Word of `words` to carry the builder's particle exactly when it has no Root, its key right after `root`. */
  function expectParticles(words: ServedWord[]) {
    const wrong: string[] = [];
    for (const w of words) {
      const keys = Object.keys(w);
      if (w.root === null) {
        if (keys.indexOf("particle") !== keys.indexOf("root") + 1) wrong.push(`${w.location}: keys ${keys.join(", ")}`);
        if (JSON.stringify(w.particle) !== JSON.stringify(particleAt(w.location))) wrong.push(`${w.location}: ${JSON.stringify(w.particle)}`);
      } else if ("particle" in w) wrong.push(`${w.location} has a Root and a particle`);
    }
    expect(words.filter((w) => w.root === null).length, "rootless Words").toBeGreaterThan(0);
    expect(wrong.slice(0, 10), `${wrong.length} Words`).toEqual([]);
  }

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("a client fetches {string}", async (_, address: string) => {
      files = [await fetched(address)];
    });

    step("a client fetches \\/data\\/v1\\/particles\\/<number>.json for each of the builder's {int} particles", async (_, count: number) => {
      await fetchParticles("/data/v1/particles/", count);
    });

    step("a client fetches \\/particles\\/<number>.json for each of the builder's {int} particles", async (_, count: number) => {
      await fetchParticles("/particles/", count);
    });

    step("it answers 200 with JSON", () => {
      const file = last();
      expect(file.status, `${file.address}: ${file.text.slice(0, 200)}`).toBe(200);
      expect(file.headers.get("content-type") ?? "").toContain("application/json");
    });

    step("it answers 404", () => {
      expect(last().status, last().address).toBe(404);
    });

    step("each answers 200 with JSON", () => {
      const wrong = files
        .filter((f) => f.status !== 200 || !(f.headers.get("content-type") ?? "").includes("application/json"))
        .map((f) => `${f.address}: ${f.status} ${f.headers.get("content-type")}`);
      expect(wrong.slice(0, 10), `${wrong.length} files not served`).toEqual([]);
    });

    step("each particle file's bytes are the builder's particle, published as JSON", () => {
      const wrong = files.filter((f, i) => f.text !== published(particles()[i])).map((f) => f.address);
      expect(wrong.slice(0, 10), `${wrong.length} particle files differ from the builder's particles`).toEqual([]);
    });

    step("the dataset version is the hash over the Surah index, Surah files, Recitation files and Juz file served, the committed Roots and the particle files served, last", async () => {
      const manifest = JSON.parse(last().text) as Manifest;
      const served = async (address: string) => {
        const file = await fetched(address);
        expect(file.status, address).toBe(200);
        return sha256(file.text);
      };
      const particleFiles = await servedParticles();
      expect(particleFiles.map((f) => f.text)).toEqual(particles().map(published));
      const hashes = [
        await served("/data/v1/surahs.json"),
        ...(await Promise.all(manifest.surahs.map((s) => served(s.url)))),
        ...committedRoots().map((r) => sha256(published(r.root))),
        ...(await Promise.all(manifest.recitations.map((r) => served(r.url)))),
        await served("/data/v1/juz.json"),
        ...particleFiles.map((f) => sha256(f.text)),
      ];
      expect(manifest.datasetVersion).toBe(sha256(hashes.join("\n")));
    });

    step(
      "it lists the builder's {int} particles by number, each with its kind, text, Indo-Pak text and its Spellings' meanings in each Language, most frequent first, empty and repeated ones left out",
      (_, count: number) => {
        const listed = builtParticleList();
        expect(listed).toHaveLength(count);
        expect(JSON.parse(last().text)).toEqual(listed);
      },
    );

    step("it tells a CDN to keep it for at least a day", () => {
      expectKeptByACdnForADay(last());
    });

    step("a client fetches each Surah file the manifest lists", async () => {
      const manifest = JSON.parse((await fetched("/data/v1/manifest.json")).text) as Manifest;
      files = [];
      for (let i = 0; i < manifest.surahs.length; i += 16) {
        files.push(...(await Promise.all(manifest.surahs.slice(i, i + 16).map((s) => fetched(s.url)))));
      }
      expect(files.map((f) => f.status)).toEqual(manifest.surahs.map(() => 200));
    });

    step(
      "every Word with no Root carries its particle's number, kind, text and Indo-Pak text, as the builder gives it, right after its Root tag",
      () => {
        expectParticles(files.flatMap((f) => (JSON.parse(f.text) as { ayahs: { words: ServedWord[] }[] }).ayahs.flatMap((a) => a.words)));
      },
    );

    step("no Word with a Root carries a particle", () => {
      const words = files.flatMap((f) => (JSON.parse(f.text) as { ayahs: { words: ServedWord[] }[] }).ayahs.flatMap((a) => a.words));
      expect(words.filter((w) => w.root !== null && "particle" in w).map((w) => w.location)).toEqual([]);
    });

    step("a client fetches part {int} of Surah {int} in {any}", async (_, part: number, surah: number, language: keyof typeof LANGUAGE) => {
      files = [await fetched(`/parts/${LANGUAGE[language]}/${surah}/${part}.json`)];
    });

    step("every Word with no Root carries its particle, as the builder gives it, right after its Root tag", () => {
      expectParticles((JSON.parse(last().text) as { words: ServedWord[] }[]).flatMap((a) => a.words));
    });
  });

  Scenario("Every particle file is the builder's particle", () => {});
  Scenario("The Particle dialog's file for each particle is the builder's particle", () => {});
  Scenario("The manifest's dataset version covers the particle files", () => {});
  ScenarioOutline("<address> names no particle, and is not found", () => {});
  Scenario("A particle file is served with a long CDN cache lifetime", () => {});
  Scenario("The particle list lists every particle, with its Spellings' meanings", () => {});
  Scenario("Each Surah file carries each rootless Word's particle next to its Root tag", () => {});
  ScenarioOutline("A Surah part in <Language> carries each rootless Word's particle", () => {});
});
