// /data/v1 keeps its Root files and Juz file with the Roots read from Neon
// (#173, AC-2's parity check): each Root file, at /data/v1/roots/ and at
// /roots/, the Juz file and the manifest fetched over HTTP, as the website's
// Root dialog and the mobile app fetch them, from the server ./serve-api.ts
// serves, compared with the generated files as last committed, before they
// were deleted (../site/committed-output.ts, BEFORE_ROOTS_MOVED), read from
// git. The hashes are computed here, apart from the dataset package, as a
// client would.

import { createHash } from "node:crypto";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { committedJuz, committedRootList, committedRoots } from "../site/committed-output.ts";
import { expectKeptByACdnForADay, fetched, published, servedParticles, type Fetched } from "./support";

const feature = await loadFeature("./published-roots.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The SHA-256 of `body`, in hex. */
const sha256 = (body: string) => createHash("sha256").update(body).digest("hex");

/** The manifest's shape: the parts read here. */
interface Manifest {
  datasetVersion: string;
  surahs: { url: string }[];
  recitations: { url: string }[];
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
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

  /** Fetch each committed Root's file under `dir`, as many at once as a client might. */
  async function fetchRoots(dir: string, count: number) {
    const roots = committedRoots();
    expect(roots, "the committed Root files").toHaveLength(count);
    files = [];
    for (let i = 0; i < roots.length; i += 16) files.push(...(await Promise.all(roots.slice(i, i + 16).map((r) => fetched(`${dir}${r.id}.json`)))));
  }

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("a client fetches {string}", async (_, address: string) => {
      files = [await fetched(address)];
    });

    step("a client fetches \\/data\\/v1\\/roots\\/<id>.json for each of the {int} committed Root files", async (_, count: number) => {
      await fetchRoots("/data/v1/roots/", count);
    });

    step("a client fetches \\/roots\\/<id>.json for each of the {int} committed Root files", async (_, count: number) => {
      await fetchRoots("/roots/", count);
    });

    step("it answers 200 with JSON", () => {
      const file = last();
      expect(file.status, `${file.address}: ${file.text.slice(0, 200)}`).toBe(200);
      expect(file.headers.get("content-type") ?? "").toContain("application/json");
    });

    step("it answers 404", () => {
      const file = last();
      expect(file.status, file.address).toBe(404);
    });

    step("each answers 200 with JSON", () => {
      const wrong = files
        .filter((f) => f.status !== 200 || !(f.headers.get("content-type") ?? "").includes("application/json"))
        .map((f) => `${f.address}: ${f.status} ${f.headers.get("content-type")}`);
      expect(wrong.slice(0, 10), `${wrong.length} Root files not served`).toEqual([]);
    });

    step("each Root file's bytes are its committed Root file's, published as JSON", () => {
      const roots = committedRoots();
      const wrong = files.filter((f, i) => f.text !== published(roots[i].root)).map((f) => f.address);
      expect(wrong.slice(0, 10), `${wrong.length} Root files differ from their committed files`).toEqual([]);
    });

    step("its bytes are the committed Juz file's, published as JSON", () => {
      expect(last().text).toBe(published(committedJuz()));
    });

    step(
      "it lists the {int} committed Roots by ascending id, each with its letters and its Lemmas' meanings in each Language, most frequent first, empty ones left out",
      (_, count: number) => {
        const listed = committedRootList();
        expect(listed).toHaveLength(count);
        expect(JSON.parse(last().text)).toEqual(listed);
      },
    );

    step(
      "the dataset version is the hash over the Surah index, Surah files and Recitation files served, the committed Roots, the committed Juz file and the particle files served",
      async () => {
        const manifest = JSON.parse(last().text) as Manifest;
        const served = async (address: string) => {
          const file = await fetched(address);
          expect(file.status, address).toBe(200);
          return sha256(file.text);
        };
        const hashes = [
          await served("/data/v1/surahs.json"),
          ...(await Promise.all(manifest.surahs.map((s) => served(s.url)))),
          ...committedRoots().map((r) => sha256(published(r.root))),
          ...(await Promise.all(manifest.recitations.map((r) => served(r.url)))),
          sha256(published(committedJuz())),
          ...(await servedParticles()).map((f) => sha256(f.text)),
        ];
        expect(manifest.datasetVersion).toBe(sha256(hashes.join("\n")));
      },
    );

    step("it tells a CDN to keep it for at least a day", () => {
      expectKeptByACdnForADay(last());
    });
  });

  Scenario("Every Root file is its committed Root file", () => {});
  Scenario("The Root dialog's file for each Root is its committed Root file", () => {});
  Scenario("The Juz file is the committed Juz file", () => {});
  Scenario("The Root list lists every committed Root, with its Lemmas' meanings", () => {});
  Scenario("The manifest's dataset version is over the committed Root files and Juz file", () => {});
  ScenarioOutline("<address> names no Root, and is not found", () => {});
  ScenarioOutline("<file> is served with a long CDN cache lifetime", () => {});
});
