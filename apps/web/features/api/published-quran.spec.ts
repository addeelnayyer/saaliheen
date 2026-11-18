// /data/v1 keeps its addresses and shapes with the Quran read from Neon (#172,
// AC-4's parity check, and AC-10's CDN cache lifetime): the Surah index, the
// Surah files, the Recitation files and the manifest fetched over HTTP, as the
// mobile app fetches them, from the server ./serve-api.ts serves, compared
// with the generated output as committed before the Quran moved into Neon
// (../site/committed-output.ts, BEFORE_QURAN_MOVED), read from git. The
// hashes are computed here, apart from the dataset package, as a client would.

import { createHash } from "node:crypto";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { committedJuz, committedRecitation, committedRoots, committedSurahIndex, quranOf } from "../site/committed-output.ts";
import { servedBuiltSurah } from "./built-surah.ts";
import { expectKeptByACdnForADay, fetched, published, servedParticles, type Fetched } from "./support";

const feature = await loadFeature("./published-quran.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The Surahs, 1 to 114. */
const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

/** The SHA-256 of `body`, in hex. */
const sha256 = (body: string | Buffer) => createHash("sha256").update(body).digest("hex");

/** Surah `n`'s Recitation file's address. */
const recitationAddress = (n: number) => `/data/v1/recitations/${n}.json`;

/** Surah `n`'s Surah file's address. */
const surahAddress = (n: number) => `/data/v1/surahs/${n}.json`;

/** The manifest's shape. */
interface Manifest {
  datasetVersion: string;
  minAppVersion: string;
  surahs: { number: number; url: string; hash: string }[];
  recitations: { number: number; url: string; hash: string }[];
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  /** The files fetched in this scenario, the last one last. */
  let files: Fetched[] = [];
  /** The Surah files fetched for the manifest's hashes, by Surah. */
  let surahFiles = new Map<number, Fetched>();

  BeforeEachScenario(() => {
    files = [];
    surahFiles = new Map();
  });

  const last = () => {
    const file = files.at(-1);
    if (!file) throw new Error("nothing fetched yet in this scenario");
    return file;
  };
  const manifest = () => JSON.parse(last().text) as Manifest;

  /** Fetch every file the manifest lists under `kind`. */
  async function fetchListed(kind: "surahs" | "recitations", count: number) {
    const listed = JSON.parse((await fetched("/data/v1/manifest.json")).text) as Manifest;
    expect(listed[kind].map((e) => e.number), `the ${kind} the manifest lists`).toEqual(Array.from({ length: count }, (_, i) => i + 1));
    files = [];
    for (const { url } of listed[kind]) files.push(await fetched(url));
  }

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("a client fetches {string}", async (_, address: string) => {
      files = [await fetched(address)];
    });

    step("a client fetches each of the {int} Surah files the manifest lists", async (_, count: number) => {
      await fetchListed("surahs", count);
    });

    step("a client fetches each of the {int} Recitation files the manifest lists", async (_, count: number) => {
      await fetchListed("recitations", count);
    });

    step("it answers 200 with JSON", () => {
      const file = last();
      expect(file.status, `${file.address}: ${file.text.slice(0, 200)}`).toBe(200);
      expect(file.headers.get("content-type") ?? "").toContain("application/json");
    });

    step("each answers 200 with JSON", () => {
      const wrong = files
        .filter((f) => f.status !== 200 || !(f.headers.get("content-type") ?? "").includes("application/json"))
        .map((f) => `${f.address}: ${f.status} ${f.headers.get("content-type")}`);
      expect(wrong).toEqual([]);
    });

    step("its bytes are the committed Surah index's, published as JSON", () => {
      expect(committedSurahIndex()).toHaveLength(114);
      expect(last().text).toBe(published(committedSurahIndex()));
    });

    step(
      "each Surah file, its Passages, Phrases, Phrase colours and Themes set aside, is its committed Surah file, key for key and in order",
      () => {
        const wrong = files.flatMap((f, i) => {
          const n = SURAHS[i];
          const served = JSON.stringify(quranOf(JSON.parse(f.text)));
          const committed = JSON.stringify(quranOf(servedBuiltSurah<Parameters<typeof quranOf>[0]>(n)));
          if (served === committed) return [];
          let at = 0;
          while (served[at] === committed[at]) at++;
          return [`${f.address} differs at character ${at}: served …${served.slice(Math.max(0, at - 80), at + 80)}… committed …${committed.slice(Math.max(0, at - 80), at + 80)}…`];
        });
        expect(wrong.slice(0, 5), `${wrong.length} Surah files differ from their committed files`).toEqual([]);
      },
    );

    step("each Recitation file's bytes are its committed Recitation file's, published as JSON", () => {
      const wrong = files.filter((f, i) => f.text !== published(committedRecitation(SURAHS[i]))).map((f) => f.address);
      expect(wrong, "Recitation files that differ from their committed files").toEqual([]);
    });

    step(
      'the manifest lists Surahs 1 to 114, each at /data/v1/surahs/ and its Recitation at /data/v1/recitations/',
      () => {
        const { surahs, recitations } = manifest();
        expect(surahs.map((e) => [e.number, e.url])).toEqual(SURAHS.map((n) => [n, surahAddress(n)]));
        expect(recitations.map((e) => [e.number, e.url])).toEqual(SURAHS.map((n) => [n, recitationAddress(n)]));
      },
    );

    step("each Recitation's hash is the SHA-256 of its committed Recitation file, published as JSON", () => {
      const wrong = manifest()
        .recitations.filter((e) => e.hash !== sha256(published(committedRecitation(e.number))))
        .map((e) => `${e.url}: ${e.hash}`);
      expect(wrong, "Recitations whose hash is not their committed file's").toEqual([]);
    });

    step("each Surah's hash is the SHA-256 of the bytes its Surah file serves", async () => {
      const wrong: string[] = [];
      for (const e of manifest().surahs) {
        const file = await fetched(e.url);
        surahFiles.set(e.number, file);
        expect(file.status, e.url).toBe(200);
        if (sha256(file.text) !== e.hash) wrong.push(`${e.url}: the manifest names ${e.hash}, its bytes hash to ${sha256(file.text)}`);
      }
      expect(wrong, "Surahs whose hash is not that of the file served").toEqual([]);
    });

    step(
      "the dataset version is the hash over the committed Surah index, the Surah files served, the committed Roots, the committed Recitations, the committed Juz file and the particle files served",
      async () => {
        const roots = committedRoots();
        expect(roots.length, "the committed Root files").toBe(1642);
        const hashes = [
          sha256(published(committedSurahIndex())),
          ...SURAHS.map((n) => sha256(surahFiles.get(n)!.text)),
          ...roots.map((r) => sha256(published(r.root))),
          ...SURAHS.map((n) => sha256(published(committedRecitation(n)))),
          sha256(published(committedJuz())),
          ...(await servedParticles()).map((f) => sha256(f.text)),
        ];
        expect(manifest().datasetVersion).toBe(sha256(hashes.join("\n")));
      },
    );

    step("the manifest's minimum app version is {string}", (_, version: string) => {
      expect(manifest().minAppVersion).toBe(version);
    });

    step("it tells a CDN to keep it for at least a day", () => {
      expectKeptByACdnForADay(last());
    });
  });

  Scenario("The Surah index is the committed Surah index", () => {});
  Scenario("Every Surah file holds the committed Quran text, Word meanings and translations, in the committed shape", () => {});
  Scenario("Every Recitation file is the committed Recitation file", () => {});
  Scenario("The manifest names each file by the hash of what it serves, and the dataset version over every published file", () => {});
  ScenarioOutline("<file> is served with a long CDN cache lifetime", () => {});
});
