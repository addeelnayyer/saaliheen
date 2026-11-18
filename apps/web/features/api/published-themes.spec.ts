// The published Surah files keep each Ayah's Themes (#170): /data/v1 fetched
// over HTTP, as the mobile app fetches it, from the server ./serve-api.ts
// serves, compared with each Ayah's Themes as last committed before Themes
// moved into Neon, and with the Surah files the dataset build writes, those
// Themes put back in (../site/committed-output.ts), and each rootless Word its
// particle (./built-surah.ts, #249).

import { createHash } from "node:crypto";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { publishedFile } from "@saaliheen/dataset/published";
import { expect } from "vitest";
import { committedSurah } from "../site/committed-output.ts";
import { servedSurahBeforeTheMove } from "./built-surah.ts";
import { baseURL } from "./support";

const feature = await loadFeature("./published-themes.feature");

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

interface ManifestEntry {
  number: number;
  url: string;
  hash: string;
}

/** One Surah file as a client fetched it. */
interface Fetched {
  entry: ManifestEntry;
  status: number;
  type: string;
  text: string;
}

/**
 * GET `address` from the server, once more if the connection was reset: after
 * a hundred-odd requests the server may close a kept-alive connection as the
 * next request goes out, which is the transport's doing, not the answer's.
 */
async function get(address: string): Promise<Response> {
  try {
    return await fetch(`${baseURL()}${address}`);
  } catch {
    return fetch(`${baseURL()}${address}`);
  }
}

/** Fetch the manifest, then each Surah file it lists. */
async function fetchSurahFiles(): Promise<Fetched[]> {
  const res = await get("/data/v1/manifest.json");
  expect(res.status, "the manifest answers").toBe(200);
  const entries = ((await res.json()) as { surahs: ManifestEntry[] }).surahs;
  const fetched: Fetched[] = [];
  for (const entry of entries) {
    const file = await get(entry.url);
    fetched.push({ entry, status: file.status, type: file.headers.get("content-type") ?? "", text: await file.text() });
  }
  return fetched;
}

describeFeature(feature, ({ Scenario }) => {
  let files: Fetched[] = [];

  const fetchStep = async (_: unknown, count: number) => {
    files = await fetchSurahFiles();
    expect(files.map((f) => f.entry.number), "the Surahs the manifest lists").toEqual(Array.from({ length: count }, (_, i) => i + 1));
  };

  Scenario("Every Surah file at /data/v1 is its committed Surah file, each Ayah's Themes included", ({ When, Then, And }) => {
    When("a client fetches each of the {int} Surah files the manifest lists", fetchStep);
    Then("each answers 200 with JSON", () => {
      const wrong = files.filter((f) => f.status !== 200 || !f.type.includes("application/json")).map((f) => `${f.entry.url}: ${f.status} ${f.type}`);
      expect(wrong).toEqual([]);
    });
    And("each Ayah of each Surah file has the Themes its committed Surah file gives it, in tagged order", () => {
      const wrong = files.flatMap((f) => {
        const served = JSON.parse(f.text) as { ayahs: { number: number; themes?: string[] }[] };
        const committed = committedSurah(f.entry.number).ayahs;
        expect(served.ayahs.length, `${f.entry.url}'s Ayahs`).toBe(committed.length);
        return committed.flatMap((a, i) => {
          const themes = served.ayahs[i]?.themes;
          return JSON.stringify(themes) === JSON.stringify(a.themes) ? [] : [`${f.entry.number}:${a.number} has ${JSON.stringify(themes)}, not ${JSON.stringify(a.themes)}`];
        });
      });
      expect(wrong).toEqual([]);
    });
    And("each Surah file holds what its committed Surah file holds, field for field", () => {
      for (const f of files) expect(JSON.parse(f.text), f.entry.url).toStrictEqual(servedSurahBeforeTheMove(f.entry.number));
    });
  });

  Scenario("The manifest names the hash of each Surah file as it is served, and as it was committed", ({ When, Then, And }) => {
    When("a client fetches each of the {int} Surah files the manifest lists", fetchStep);
    Then("the manifest's hash of each Surah file is the SHA-256 of the bytes that Surah file answers", () => {
      const wrong = files.filter((f) => sha256(f.text) !== f.entry.hash).map((f) => f.entry.url);
      expect(wrong, "Surah files whose bytes the manifest's hash does not name").toEqual([]);
    });
    And("the manifest's hash of each Surah file is the SHA-256 of its committed Surah file as /data/v1 published it", () => {
      const wrong = files.filter((f) => sha256(publishedFile(servedSurahBeforeTheMove(f.entry.number))) !== f.entry.hash).map((f) => f.entry.url);
      expect(wrong, "Surah files whose hash changed with the move").toEqual([]);
    });
  });
});
