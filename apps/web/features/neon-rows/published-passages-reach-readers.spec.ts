// #171 AC-5 (the Publish's side) and AC-6 (warmed after each Publish): an
// Admin's Publish through POST /api/v1/passages/{surah} reaches every page and
// file showing the Surah's Passages and Phrases, asked for over HTTP as a
// browser, the app or a client does, or opened in Chromium where what counts
// is how the page groups its Ayahs. Surah 87, its Passages and the Theme are
// checked against the files as last committed (../site/committed-output.ts).

import { createHash } from "node:crypto";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { chromium, type Browser, type Page } from "@playwright/test";
import { surahParts } from "@saaliheen/dataset/parts";
import { expect, vi } from "vitest";
import { baseURL, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "../api/support";
import { committedPassages, committedPassageSurah, committedPhrases, committedThemes } from "../site/committed-output.ts";
import { ayahGroups, get, LANGS, langOf, metaContent, notedHash, putBackAsLoaded, shownGroups, type Lang, type PartAyah } from "./neon-passages";

vi.setConfig({ testTimeout: 300_000 });

const feature = await loadFeature("./published-passages-reach-readers.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const SURAH = 87;
const THEME = "remembrance-of-allah";
/** The merged Passage, 9–13 with 14–19 joined into it; the phrased Passage, 6–8. */
const MERGED = { from: 9, till: 19, mergedAwayFrom: 14 };
const PHRASED = { from: 6, till: 8 };
const sha256 = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

/** The manifest as /data/v1 serves it (#172). */
interface Manifest {
  datasetVersion: string;
  surahs: { number: number; hash: string }[];
  recitations: { number: number; hash: string }[];
}

const loaded = () =>
  committedPassages()
    .filter((p) => p.surah_no === SURAH)
    .sort((a, b) => a.ayah_from - b.ayah_from)
    .map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur }));
const loadedAt = (from: number) => loaded().find((p) => p.from === from)!;

/** Surah 87's Words, by Ayah, as last committed. */
const surahWords = () => committedPassageSurah(SURAH).ayahs;
/** The Word locations of the phrased Passage, in order. */
const phrasedWords = () =>
  surahWords()
    .filter((a) => a.number >= PHRASED.from && a.number <= PHRASED.till)
    .flatMap((a) => a.words.map((w) => w.location));
const thePhrase = () => ({ first: phrasedWords()[0], last: phrasedWords().at(-1)! });
const partAddresses = (lang: Lang) =>
  surahParts(surahWords().map((a) => a.words.length)).map((_, i) => `/parts/${lang}/${SURAH}/${i + 1}.json`);
/** The Theme's Ayahs in Surah 87, as the committed Themes give them. */
const themeAyahs = () =>
  committedThemes()
    .themes.find((t) => t.slug === THEME)!
    .groups.filter((g) => g.surah === SURAH)
    .flatMap((g) => g.ayahs);

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let browser: Browser;
  let page: Page | undefined;
  let signedIn: SignedIn | undefined;
  let published: Answer | undefined;
  let publishedAt = 0;
  let scenario = 0;
  let lang: Lang = "en";
  let status: number | undefined;
  let html = "";
  let parts: { address: string; status: number; ayahs: PartAyah[] | undefined }[] = [];
  let surahFile: { status: number; bytes: Buffer; json: unknown } | undefined;
  /** The manifest as a client fetched it before this scenario's Publish (#172). */
  let manifestBefore: Manifest | undefined;

  /** The merged Passage's titles as this scenario's Publish makes them. */
  const marker = () => ` (Published ${scenario})`;
  const publishedTitles = () => ({ en: loadedAt(MERGED.from).en + marker(), ur: loadedAt(MERGED.from).ur + marker() });
  const publishedPassages = () => [
    ...loaded().filter((p) => p.from < MERGED.from),
    { from: MERGED.from, till: MERGED.till, ...publishedTitles() },
  ];

  BeforeAllScenarios(async () => {
    browser = await chromium.launch();
  });
  AfterAllScenarios(async () => {
    await browser.close();
  });
  BeforeEachScenario(() => {
    scenario += 1;
    published = undefined;
    status = undefined;
    html = "";
    parts = [];
    surahFile = undefined;
    manifestBefore = undefined;
  });
  AfterEachScenario(async () => {
    await page?.close();
    page = undefined;
    await putBackAsLoaded(SURAH);
  });

  const fetchPage = async (address: string) => {
    const res = await get(address);
    status = res.status;
    html = await res.text();
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("the Admin publishes the merged Passage and the phrased Passage", async () => {
      const edits = [
        { kind: "join", from: MERGED.mergedAwayFrom },
        { kind: "retitle", from: MERGED.from, ...publishedTitles() },
        { kind: "mark", ...thePhrase() },
      ];
      published = await send("POST", `/api/v1/passages/${SURAH}`, credentialHeaders("session cookie", signedIn), JSON.stringify({ base: 1, edits }));
      publishedAt = Date.now();
    });

    step("the Publish is answered {int}", (_, expected: number) => {
      expect(published?.status, published?.json ? JSON.stringify(published.json).slice(0, 500) : `${published?.status}, not JSON`).toBe(expected);
    });

    step("the page answers {int}", (_, expected: number) => {
      expect(status).toBe(expected);
    });

    // -------------------------------------------------- warmed after the Publish

    step("{int} seconds have passed since the Publish was answered, with no request for Surah 87's page or parts", async (_, seconds: number) => {
      const left = publishedAt + seconds * 1000 - Date.now();
      if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
    });

    step("Surah 87's page in Urdu and in English answers 200 from Next's cache on its first request", async () => {
      const wrong: string[] = [];
      for (const l of LANGS) {
        const res = await get(`/${l}/${SURAH}`);
        await res.arrayBuffer();
        if (res.status !== 200 || res.headers.get("x-nextjs-cache") !== "HIT") wrong.push(`/${l}/${SURAH} ${res.status} ${res.headers.get("x-nextjs-cache")}`);
      }
      expect(wrong).toEqual([]);
    });

    step(
      "every Surah part of Surah 87 in Urdu and in English answers 200 from Next's cache on its first request, the merged Passage beginning at Ayah 9 with its published Passage title",
      async () => {
        const wrong: string[] = [];
        for (const l of LANGS) {
          const ayahs: PartAyah[] = [];
          for (const address of partAddresses(l)) {
            const res = await get(address);
            const cache = res.headers.get("x-nextjs-cache");
            if (res.status !== 200 || cache !== "HIT") wrong.push(`${address} ${res.status} ${cache}`);
            if (res.status === 200) ayahs.push(...((await res.json()) as PartAyah[]));
          }
          const passage = ayahs.find((a) => a.number === MERGED.from)?.passage;
          const expected = { from: MERGED.from, till: MERGED.till, title: publishedTitles()[l] };
          if (JSON.stringify(passage) !== JSON.stringify(expected)) wrong.push(`${l}: the Passage at ${SURAH}:${MERGED.from} is ${JSON.stringify(passage)}`);
        }
        expect(wrong).toEqual([]);
      },
    );

    // -------------------------------------------------- the Surah page

    step("its Ayahs are grouped as published: 1–5, 6–8 and 9–19, none beginning at Ayah 14", async () => {
      if (!page) throw new Error("no page open in this scenario");
      expect(await ayahGroups(page, SURAH)).toEqual(publishedPassages().map(({ from, till }) => ({ from, till })));
    });

    // -------------------------------------------------- the parts

    step("each part answers 200 with JSON", () => {
      expect(parts.length, "parts of Surah 87").toBeGreaterThan(0);
      expect(parts.filter((p) => p.status !== 200 || !p.ayahs).map((p) => `${p.address} ${p.status}`)).toEqual([]);
    });

    step("no Ayah of any part begins a Passage at Ayah 14", () => {
      const ayah = parts.flatMap((p) => p.ayahs ?? []).find((a) => a.number === MERGED.mergedAwayFrom);
      expect(ayah, `Ayah ${SURAH}:${MERGED.mergedAwayFrom} in a part`).toBeDefined();
      expect(ayah!.passage).toBeUndefined();
    });

    step('every Word of the phrased Passage has Phrase colour "a"', () => {
      const colours = new Map(parts.flatMap((p) => p.ayahs ?? []).flatMap((a) => a.words.map((w) => [w.location, w.phraseColour] as const)));
      expect(phrasedWords().filter((l) => colours.get(l) !== "a").map((l) => `${l}: ${colours.get(l)}`)).toEqual([]);
    });

    // -------------------------------------------------- the Share page

    step("its Link preview title names Surah 87's Ayahs 9–19", () => {
      for (const key of ["og:title", "twitter:title"]) expect(metaContent(html, key), key).toContain(`${SURAH}:${MERGED.from}–${MERGED.till}`);
    });

    // -------------------------------------------------- the /data/v1 files

    step("a client fetches Surah 87's file from /data/v1", async () => {
      const res = await get(`/data/v1/surahs/${SURAH}.json`);
      const bytes = Buffer.from(await res.arrayBuffer());
      surahFile = { status: res.status, bytes, json: res.status === 200 ? JSON.parse(bytes.toString("utf8")) : undefined };
    });

    step("it answers 200 with JSON", () => {
      expect(surahFile?.status).toBe(200);
      expect(surahFile?.json).toBeTypeOf("object");
    });

    const file = () => surahFile!.json as { passages: unknown[]; phrases: unknown[]; ayahs: { words: { location: string; phraseColour?: string }[] }[] };

    step("its Passages are 1–5 and 6–8 as loaded and the merged Passage 9–19 with its published English and Urdu Passage titles", () => {
      expect(file().passages).toEqual(publishedPassages());
    });

    step("its Phrases are exactly the phrased Passage's one Phrase", () => {
      expect(file().phrases).toEqual([thePhrase()]);
    });

    step('each Word of the phrased Passage has Phrase colour "a", and no other Word of the Surah has one', () => {
      const phrased = new Set(phrasedWords());
      const wrong = file()
        .ayahs.flatMap((a) => a.words)
        .filter((w) => (phrased.has(w.location) ? w.phraseColour !== "a" : w.phraseColour !== undefined))
        .map((w) => `${w.location}: ${w.phraseColour}`);
      expect(wrong).toEqual([]);
    });

    step("a client fetches the manifest from /data/v1", async () => {
      await fetchPage("/data/v1/manifest.json");
    });

    step("the manifest names, for Surah 87, the SHA-256 of the Surah file /data/v1 just served", () => {
      expect(status, "the manifest answers").toBe(200);
      const entry = (JSON.parse(html) as { surahs: { number: number; hash: string }[] }).surahs.find((s) => s.number === SURAH);
      expect(entry?.hash).toBe(sha256(surahFile!.bytes));
    });

    // -------------------------------------------------- #172: the manifest answered from stored hashes

    step("a client fetches the manifest from /data/v1, before the Publish", async () => {
      await fetchPage("/data/v1/manifest.json");
      expect(status, "the manifest answers").toBe(200);
      manifestBefore = JSON.parse(html) as Manifest;
    });

    const manifestAfter = () => {
      expect(status, "the manifest answers").toBe(200);
      return JSON.parse(html) as Manifest;
    };

    step("the manifest names, for Surah 87, the hash Neon now stores for it, not the one it named before the Publish", async () => {
      const { rows } = await database().query<{ hash: string }>(`select hash from surah_content_hash where surah = $1`, [SURAH]);
      const named = manifestAfter().surahs.find((s) => s.number === SURAH)?.hash;
      expect(named, "the hash Neon stores for Surah 87").toBe(rows[0]?.hash);
      expect(named, "the hash named before the Publish").not.toBe(manifestBefore!.surahs.find((s) => s.number === SURAH)?.hash);
    });

    step("every other Surah's hash and every Recitation's hash is the one the manifest named before the Publish", () => {
      const others = (m: Manifest) => ({ surahs: m.surahs.filter((s) => s.number !== SURAH), recitations: m.recitations });
      expect(others(manifestAfter())).toEqual(others(manifestBefore!));
    });

    step("the dataset version is not the one the manifest named before the Publish", () => {
      expect(manifestAfter().datasetVersion).not.toBe(manifestBefore!.datasetVersion);
    });

    step("Neon stores that hash for Surah 87, in place of the one it stored before the Publish", async () => {
      const { rows } = await database().query<{ hash: string }>(`select hash from surah_content_hash where surah = $1`, [SURAH]);
      expect(rows.map((r) => r.hash)).toEqual([sha256(surahFile!.bytes)]);
      expect(rows[0].hash, "the hash stored before the Publish").not.toBe(notedHash(SURAH));
    });

    // -------------------------------------------------- the Theme page

    step("it shows one Passage group for Surah 87's merged Passage, its heading linking to Ayah 87:9, with the Theme's Ayahs of 9–19 under it", () => {
      const href = `/${lang}/${SURAH}#${SURAH}:${MERGED.from}`;
      const ayahs = themeAyahs()
        .filter((a) => a >= MERGED.from && a <= MERGED.till)
        .map((a) => `/${lang}/${SURAH}#${SURAH}:${a}`);
      expect(shownGroups(html).filter((g) => g.href === href)).toEqual([{ href, ayahs }]);
    });

    step("it shows no Passage group headed at Ayah 87:14", () => {
      expect(shownGroups(html).map((g) => g.href)).not.toContain(`/${lang}/${SURAH}#${SURAH}:${MERGED.mergedAwayFrom}`);
    });
  });

  Background(({ Given }) => {
    Given("Surah 87 holds its Passages as loaded, no Phrase and its seed Passage revision only", async () => {
      // What the feature says of Surah 87, checked against the files as last committed.
      expect(loaded().map((p) => [p.from, p.till])).toEqual([[1, 5], [6, 8], [9, 13], [14, 19]]);
      expect(committedPhrases().filter((p) => p.first.startsWith(`${SURAH}:`))).toEqual([]);
      const ayahs = themeAyahs();
      expect(ayahs.some((a) => a >= 9 && a <= 13) && ayahs.some((a) => a >= 14 && a <= 19), `${THEME} has Ayahs in 87:9–13 and 87:14–19`).toBe(true);
      await putBackAsLoaded(SURAH);
    });
  });

  Scenario("After a Publish, the Surah's page and every Surah part in Urdu and English are warmed again, served from Next's cache on their first request", () => {});

  ScenarioOutline("Within moments of a Publish, Surah 87's page in <Language> groups its Ayahs by the published Passages", ({ When }, variables) => {
    When("I open Surah 87's page in <Language> in a browser", async () => {
      lang = langOf(variables.Language);
      await page?.close();
      page = await browser.newPage({ baseURL: baseURL() });
      status = (await page.goto(`/${lang}/${SURAH}`))?.status();
    });
  });

  ScenarioOutline("Within moments of a Publish, Surah 87's parts in <Language> carry the published Passages and Phrase colours", ({ When, And }, variables) => {
    When("I fetch every Surah part of Surah 87 in <Language>", async () => {
      lang = langOf(variables.Language);
      for (const address of partAddresses(lang)) {
        const res = await get(address);
        parts.push({ address, status: res.status, ayahs: res.status === 200 ? ((await res.json()) as PartAyah[]) : undefined });
      }
    });
    And("the merged Passage begins at Ayah 9, running to Ayah 19, with its published Passage title in <Language>", () => {
      const ayah = parts.flatMap((p) => p.ayahs ?? []).find((a) => a.number === MERGED.from);
      expect(ayah?.passage).toEqual({ from: MERGED.from, till: MERGED.till, title: publishedTitles()[lang] });
    });
  });

  ScenarioOutline("Within moments of a Publish, the merged Passage, longer than 10 Ayahs, can be shared whole in <Language>", ({ When }, variables) => {
    When("I fetch the Share page of Surah 87's Ayahs 9–19 in <Language> in Uthmani", async () => {
      lang = langOf(variables.Language);
      await fetchPage(`/${lang}/share/${SURAH}/${MERGED.from}-${MERGED.till}/uthmani`);
    });
  });

  Scenario("Within moments of a Publish, Surah 87's /data/v1 file carries the published Passages and Phrase, and the manifest names its new stored hash", () => {});

  ScenarioOutline("Within moments of a Publish, the Theme page of remembrance-of-allah in <Language> groups its Ayahs by the published Passages", ({ When }, variables) => {
    When("I fetch the Theme page of remembrance-of-allah in <Language>", async () => {
      lang = langOf(variables.Language);
      await fetchPage(`/${lang}/themes/${THEME}`);
    });
  });
  Scenario("A Publish changes its own Surah's hash in the manifest, and no other file's", () => {});
});
