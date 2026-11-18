// The published Surah files keep their Passages and Phrases (#171, AC-7's
// parity check): /data/v1 fetched over HTTP, as the mobile app fetches it, from
// the server ./serve-api.ts serves, compared with the Passages file, the
// Phrases file and the generated Surah files as last committed before
// Passages and Phrases moved into Neon (../site/committed-output.ts).

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { committedPassageSurah, committedPassages, committedPhrases } from "../site/committed-output.ts";
import { baseURL } from "./support";

const feature = await loadFeature("./published-passages.feature");

/** A Surah file as /data/v1 serves it, the parts this feature reads. */
interface ServedSurah {
  passages?: { from: number; till: number; en: string; ur: string }[];
  phrases?: { first: string; last: string }[];
  ayahs: { words: { location: string; phraseColour?: string }[] }[];
}

/** One Surah file as a client fetched it. */
interface Fetched {
  number: number;
  url: string;
  status: number;
  type: string;
  text: string;
}

/** GET `address` from the server, once more if a kept-alive connection was reset. */
async function get(address: string): Promise<Response> {
  try {
    return await fetch(`${baseURL()}${address}`);
  } catch {
    return fetch(`${baseURL()}${address}`);
  }
}

describeFeature(feature, ({ Scenario }) => {
  let files: Fetched[] = [];
  const served = (f: Fetched) => JSON.parse(f.text) as ServedSurah;

  Scenario(
    "Every Surah file at /data/v1 carries the committed Passages and Phrases, and each Word its committed Phrase colour",
    ({ When, Then, And }) => {
      When("a client fetches each of the {int} Surah files the manifest lists", async (_, count: number) => {
        const res = await get("/data/v1/manifest.json");
        expect(res.status, "the manifest answers").toBe(200);
        const entries = ((await res.json()) as { surahs: { number: number; url: string }[] }).surahs;
        expect(entries.map((e) => e.number), "the Surahs the manifest lists").toEqual(Array.from({ length: count }, (_, i) => i + 1));
        files = [];
        for (const { number, url } of entries) {
          const file = await get(url);
          files.push({ number, url, status: file.status, type: file.headers.get("content-type") ?? "", text: await file.text() });
        }
      });

      Then("each answers 200 with JSON", () => {
        const wrong = files.filter((f) => f.status !== 200 || !f.type.includes("application/json")).map((f) => `${f.url}: ${f.status} ${f.type}`);
        expect(wrong).toEqual([]);
      });

      And(
        "each Surah file's Passages are its committed Surah file's, in order, each with its first and last Ayah and its English and Urdu Passage titles",
        () => {
          const wrong = files.filter((f) => JSON.stringify(served(f).passages) !== JSON.stringify(committedPassageSurah(f.number).passages));
          expect(wrong.map((f) => `${f.url}: ${JSON.stringify(served(f).passages)?.slice(0, 200)}`), "Surah files whose Passages differ").toEqual([]);
        },
      );

      And("each Surah file's Passages are the committed Passages file's for that Surah", () => {
        const wrong = files.filter((f) => {
          const filed = committedPassages()
            .filter((p) => p.surah_no === f.number)
            .map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur }));
          expect(filed.length, `the committed Passages file has Passages in Surah ${f.number}`).toBeGreaterThan(0);
          return JSON.stringify(served(f).passages) !== JSON.stringify(filed);
        });
        expect(wrong.map((f) => f.url), "Surah files whose Passages are not the committed Passages file's").toEqual([]);
      });

      And("each Surah file's Phrases are its committed Surah file's, in Quran order, and those of the committed Phrases file in that Surah", () => {
        const wrong = files.flatMap((f) => {
          const phrases = served(f).phrases;
          const committed = committedPassageSurah(f.number).phrases;
          const filed = committedPhrases().filter((p) => Number(p.first.split(":")[0]) === f.number);
          const problems: string[] = [];
          if (JSON.stringify(phrases) !== JSON.stringify(committed)) problems.push(`${f.url}: ${JSON.stringify(phrases)} is not its committed Surah file's`);
          const key = (ps: { first: string; last: string }[] = []) => ps.map((p) => `${p.first}–${p.last}`).sort();
          if (JSON.stringify(key(phrases)) !== JSON.stringify(key(filed))) problems.push(`${f.url}: not the committed Phrases file's`);
          return problems;
        });
        expect(wrong, "Surah files whose Phrases differ").toEqual([]);
      });

      And("each Word of each Surah file carries the Phrase colour its committed Surah file gives it, or none where that gives none", () => {
        const wrong = files.flatMap((f) => {
          const committed = new Map(committedPassageSurah(f.number).ayahs.flatMap((a) => a.words).map((w) => [w.location, w.phraseColour]));
          const words = served(f).ayahs.flatMap((a) => a.words);
          expect(words.length, `${f.url}'s Words`).toBe(committed.size);
          return words.filter((w) => w.phraseColour !== committed.get(w.location)).map((w) => `${w.location}: ${w.phraseColour}, not ${committed.get(w.location)}`);
        });
        expect(wrong.slice(0, 40), `${wrong.length} Words whose Phrase colour differs`).toEqual([]);
      });
    },
  );
});
