// #171 AC-5 (reads) and AC-6: every page and file that shows a Surah's
// Passages and Phrases reads them from Neon. One Surah's rows are changed by
// SQL before any page reads them (the Background), and each address is then
// asked for over HTTP, as a browser, the app or a client does, or opened in
// Chromium where what counts is what is drawn (a Word card's tint, the edit
// strip). The Surah, its Passages and the Theme are chosen from the files as
// last committed (../site/committed-output.ts), never typed.
// #172 AC-3, AC-4 and AC-5: the chosen Surah's Quran rows are changed too (the
// Background's second step), and every page, part, Share page and file showing
// it, the Admin's Allah reference Publish and the seed must read them; the
// expected text is the generated output as committed before the Quran moved
// (BEFORE_QURAN_MOVED), with those changes made to it.

import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { chromium, type Browser, type Page } from "@playwright/test";
import { surahParts, type SurahPart } from "@saaliheen/dataset/parts";
import { expect, vi } from "vitest";
import { servedBuiltSurah } from "../api/built-surah.ts";
import { baseURL, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "../api/support";
import {
  committedJuz,
  committedRecitation,
  committedRoots,
  committedSurahIndex,
  quranOf,
  committedPassages,
  committedPassageSurah,
  committedPhrases,
  committedThemes,
  type CommittedPassage,
} from "../site/committed-output.ts";
import { testDatabase } from "../site/test-database.ts";
import { ayahGroups, get, LANGS, langOf, metaContent, shownGroups, type Lang, type PartAyah } from "./neon-passages";

// The warm-up renders 744 pages cold, and the last scenario asks for every Surah part.
vi.setConfig({ testTimeout: 900_000 });

const feature = await loadFeature("./passages-read-from-neon.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const WEB = path.join(__dirname, "..", "..");
const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);
const sha256 = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");

/** Each particle file's hash (#249), /data/v1/particles/1.json up to the first number not found. */
async function particleFiles(): Promise<string[]> {
  const hashes: string[] = [];
  for (let n = 1; ; n++) {
    const res = await get(`/data/v1/particles/${n}.json`);
    if (res.status === 404) return hashes;
    expect(res.status, `/data/v1/particles/${n}.json`).toBe(200);
    hashes.push(sha256(Buffer.from(await res.arrayBuffer())));
  }
}

// ---------------------------------------------------------------- the chosen Surah, Passages and Theme

interface Range {
  from: number;
  till: number;
}

/** What the Background changes, chosen from the committed files. */
interface Chosen {
  surah: number;
  /** The first of the two neighbouring Passages: it is retitled and runs on to the second's last Ayah. */
  merged: CommittedPassage;
  /** The second, deleted. */
  mergedAway: CommittedPassage;
  /** Another Passage of the Surah, made one Phrase from its first Word to its last. */
  phrased: CommittedPassage;
  /** A Theme with Ayahs in both the merged and the merged-away Passage. */
  theme: { slug: string; ayahs: number[] };
  /** The Surah's content hash as Neon is made to store it. */
  hash: string;
}

const NEON = " (Neon)";
const passagesOf = (surah: number) =>
  committedPassages()
    .filter((p) => p.surah_no === surah)
    .sort((a, b) => a.ayah_from - b.ayah_from);
const length = (p: CommittedPassage) => p.ayah_till - p.ayah_from + 1;
/** A Theme's Ayahs in `surah`, as the committed Themes give them. */
const themeAyahs = (slug: string, surah: number) =>
  committedThemes()
    .themes.find((t) => t.slug === slug)!
    .groups.filter((g) => g.surah === surah)
    .flatMap((g) => g.ayahs);

let chosenOnce: Chosen | undefined;
/** The shortest Surah after Al-Fatihah with no Phrase, two neighbouring Passages of more than 10 Ayahs together that one Theme both uses, and a third Passage. */
function chosen(): Chosen {
  if (chosenOnce) return chosenOnce;
  const phrasedSurahs = new Set(committedPhrases().map((p) => Number(p.first.split(":")[0])));
  const bySize = SURAHS.slice(1)
    .filter((s) => !phrasedSurahs.has(s))
    .map((s) => ({ s, ayahs: committedPassageSurah(s).ayahs.length }))
    .sort((a, b) => a.ayahs - b.ayahs || a.s - b.s);
  for (const { s } of bySize) {
    const passages = passagesOf(s);
    if (passages.length < 3) continue;
    for (let i = 0; i + 1 < passages.length; i++) {
      const [merged, mergedAway] = [passages[i], passages[i + 1]];
      if (length(merged) + length(mergedAway) <= 10) continue;
      const within = (ayahs: number[], p: CommittedPassage) => ayahs.some((a) => a >= p.ayah_from && a <= p.ayah_till);
      const theme = committedThemes()
        .themes.map((t) => ({ slug: t.slug, ayahs: themeAyahs(t.slug, s) }))
        .filter((t) => within(t.ayahs, merged) && within(t.ayahs, mergedAway))
        .sort((a, b) => a.slug.localeCompare(b.slug))[0];
      if (!theme) continue;
      const phrased = passages.filter((p) => p !== merged && p !== mergedAway).sort((a, b) => length(a) - length(b) || a.ayah_from - b.ayah_from)[0];
      chosenOnce = { surah: s, merged, mergedAway, phrased, theme, hash: sha256(`#171: Surah ${s}'s content hash as Neon stores it`) };
      return chosenOnce;
    }
  }
  throw new Error("no Surah fits the Background's changes");
}

/** The chosen Surah's Passages as Neon holds them once changed, in Ayah order. */
function neonPassages(): { from: number; till: number; en: string; ur: string }[] {
  const { surah, merged, mergedAway } = chosen();
  return passagesOf(surah)
    .filter((p) => p !== mergedAway)
    .map((p) =>
      p === merged
        ? { from: p.ayah_from, till: mergedAway.ayah_till, en: p.title_en + NEON, ur: p.title_ur + NEON }
        : { from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur },
    );
}

/** The chosen Surah's Words, by Ayah, as last committed. */
const surahWords = () => committedPassageSurah(chosen().surah).ayahs;
/** The Word locations of the phrased Passage, in order. */
const phrasedWords = () => {
  const { phrased } = chosen();
  return surahWords()
    .filter((a) => a.number >= phrased.ayah_from && a.number <= phrased.ayah_till)
    .flatMap((a) => a.words.map((w) => w.location));
};
/** The one Phrase the Background adds: the phrased Passage's first Word to its last. */
const neonPhrase = () => ({ first: phrasedWords()[0], last: phrasedWords().at(-1)! });
/** The chosen Surah's parts, cut by Word count as every Surah's are. */
const partsOf = (surah: number): SurahPart[] => surahParts(committedPassageSurah(surah).ayahs.map((a) => a.words.length));
const partAddresses = (lang: Lang, surah: number) => partsOf(surah).map((_, i) => `/parts/${lang}/${surah}/${i + 1}.json`);
const mergedRange = (): Range => ({ from: chosen().merged.ayah_from, till: chosen().mergedAway.ayah_till });
const shareAddress = (lang: Lang) => `/${lang}/share/${chosen().surah}/${mergedRange().from}-${mergedRange().till}/uthmani`;
const themeAddress = (lang: Lang) => `/${lang}/themes/${chosen().theme.slug}`;

// ---------------------------------------------------------------- the Background's SQL

let arranged: Promise<void> | undefined;
/** The Background's changes, made once for the feature, in one transaction. */
function arrange(): Promise<void> {
  return (arranged ??= (async () => {
    const { surah, merged, mergedAway, hash } = chosen();
    const { first, last } = neonPhrase();
    const db = await database().connect();
    try {
      await db.query("begin");
      await db.query(`delete from passage where surah = $1 and ayah_from = $2`, [surah, mergedAway.ayah_from]);
      const updated = await db.query(
        `update passage set ayah_till = $3, title_en = title_en || $4, title_ur = title_ur || $4 where surah = $1 and ayah_from = $2`,
        [surah, merged.ayah_from, mergedAway.ayah_till, NEON],
      );
      expect(updated.rowCount, `Neon holds the Passage ${surah}:${merged.ayah_from}`).toBe(1);
      await db.query(`insert into phrase (surah, first_word, last_word) values ($1, $2, $3)`, [surah, first, last]);
      await db.query(
        `insert into surah_content_hash (surah, hash) values ($1, $2) on conflict (surah) do update set hash = excluded.hash`,
        [surah, hash],
      );
      await db.query("commit");
    } catch (error) {
      await db.query("rollback");
      throw error;
    } finally {
      db.release();
    }
  })());
}

// ---------------------------------------------------------------- #172: the chosen Surah's Quran rows

/** A Word, Ayah and Surah of a Surah file as committed before the Quran moved, the parts the changes touch, among the rest. */
interface BaseWord {
  location: string;
  meaning: { ur: string | null; en: string | null };
}
interface BaseAyah {
  number: number;
  translation: { ur: string | null; en: string | null };
  words: BaseWord[];
}
interface BaseSurah {
  nameLatin: string;
  ayahs: BaseAyah[];
  passages?: unknown;
  phrases?: unknown;
}

/** The chosen Surah's file as committed before the Quran moved into Neon (#172), with its particles (#249). */
const baseSurah = () => servedBuiltSurah<BaseSurah>(chosen().surah);
/** `text` with the marker added, as SQL's `||` adds it: nothing to nothing. */
const marked = <T extends string | null>(text: T): T => (text === null ? text : ((text + NEON) as T));

/** The changed Ayah, its last Word and that Word's position; the grown Ayah, its last Word and the Word location it gains. */
interface Changed {
  ayah: number;
  last: string;
  position: number;
  grown: { ayah: number; last: string; added: string };
}
let changedOnce: Changed | undefined;
/**
 * The changed Ayah: the first of the chosen Theme's Ayahs in the merged
 * Passage with more than one Word whose last Word the committed Recitation
 * times. The grown Ayah: the first other Ayah of the Surah for which the
 * Surah's parts are cut the same with the changed Ayah a Word short and it a
 * Word longer.
 */
function changed(): Changed {
  if (changedOnce) return changedOnce;
  const { from, till } = mergedRange();
  const ayahs = baseSurah().ayahs;
  const counts = ayahs.map((a) => a.words.length);
  const timings = committedRecitation(chosen().surah).ayahs;
  for (const n of chosen().theme.ayahs.filter((a) => a >= from && a <= till).sort((a, b) => a - b)) {
    const words = ayahs[n - 1].words;
    if (words.length < 2 || !timings.find((a) => a.number === n)?.words.some((w) => w[0] === words.length)) continue;
    for (const g of ayahs.map((a) => a.number).filter((g) => g !== n)) {
      const changedCounts = counts.map((c, i) => (i === n - 1 ? c - 1 : i === g - 1 ? c + 1 : c));
      if (JSON.stringify(surahParts(changedCounts)) !== JSON.stringify(surahParts(counts))) continue;
      const grownWords = ayahs[g - 1].words;
      changedOnce = {
        ayah: n,
        last: words.at(-1)!.location,
        position: words.length,
        grown: { ayah: g, last: grownWords.at(-1)!.location, added: `${chosen().surah}:${g}:${grownWords.length + 1}` },
      };
      return changedOnce;
    }
  }
  throw new Error("no two Ayahs of the chosen Surah fit the Background's Quran changes");
}

/** The chosen Surah's file as Neon's changed rows make it: every meaning, translation and the Latin name marked, the changed Ayah's last Word gone, the grown Ayah's last Word copied after it. */
function neonSurah(): BaseSurah {
  const { ayah, last, grown } = changed();
  const base = baseSurah();
  const markedWord = (w: BaseWord): BaseWord => ({ ...w, meaning: { ...w.meaning, ur: marked(w.meaning.ur), en: marked(w.meaning.en) } });
  return {
    ...base,
    nameLatin: marked(base.nameLatin),
    ayahs: base.ayahs.map((a) => {
      const words = a.words.filter((w) => a.number !== ayah || w.location !== last).map(markedWord);
      if (a.number === grown.ayah) words.push({ ...words.at(-1)!, location: grown.added });
      return { ...a, translation: { ...a.translation, ur: marked(a.translation.ur), en: marked(a.translation.en) }, words };
    }),
  };
}

/** The chosen Surah's Recitation file as Neon's changed rows make it. */
function neonRecitation() {
  const { ayah, position } = changed();
  const base = committedRecitation(chosen().surah);
  return {
    ...base,
    ayahs: base.ayahs.map((a) => {
      if (a.number !== ayah) return a;
      const words = a.words.filter((w) => w[0] !== position).map((w) => [...w] as [number, number, number]);
      words[0][2] -= 1;
      return { ...a, words };
    }),
  };
}

/** Why the Background's Quran changes are not there, when they are not. */
let quranUnchanged: string | undefined;
let quranArranged: Promise<void> | undefined;
/** The Background's Quran changes, made once for the feature, in one transaction; none where Neon has no Quran table yet. */
function arrangeQuran(): Promise<void> {
  return (quranArranged ??= (async () => {
    const { surah } = chosen();
    const { ayah, last, position, grown } = changed();
    const db = await database().connect();
    try {
      const { rows } = await db.query(`select to_regclass('public.word') is not null as present`);
      if (!rows[0].present) {
        quranUnchanged = "Neon has no word table: the Background changed no Quran row";
        return;
      }
      await db.query("begin");
      await db.query(`update word set meaning_en = meaning_en || $2, meaning_ur = meaning_ur || $2 where surah = $1`, [surah, NEON]);
      await db.query(`update ayah set translation_en = translation_en || $2, translation_ur = translation_ur || $2 where surah = $1`, [surah, NEON]);
      await db.query(`update surah set name_latin = name_latin || $2 where number = $1`, [surah, NEON]);
      const copied = await db.query(
        `insert into word (location, surah, ayah, position, uthmani, indopak, meaning_ur, meaning_en, root_id)
         select $2, surah, ayah, position + 1, uthmani, indopak, meaning_ur, meaning_en, root_id from word where location = $1`,
        [grown.last, grown.added],
      );
      expect(copied.rowCount, `Neon holds the Word ${grown.last}`).toBe(1);
      const word = await db.query(`delete from word where location = $1`, [last]);
      expect(word.rowCount, `Neon holds the Word ${last}`).toBe(1);
      const timing = await db.query(`delete from recitation_timing where surah = $1 and ayah = $2 and word::text = any($3::text[])`, [
        surah,
        ayah,
        [String(position), last],
      ]);
      expect(timing.rowCount, `Neon holds a Recitation timing of ${last}`).toBeGreaterThan(0);
      await db.query(
        `update recitation_timing set end_ms = end_ms - 1
          where surah = $1 and ayah = $2 and position = (select min(position) from recitation_timing where surah = $1 and ayah = $2)`,
        [surah, ayah],
      );
      await db.query("commit");
    } catch (error) {
      await db.query("rollback");
      throw error;
    } finally {
      db.release();
    }
  })());
}

/** `html`'s text as a reader sees it: React's entities decoded and its text separators dropped. */
const shownText = (html: string) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** The rows of the chosen Surah's Allah references and their revisions, as text, to tell that nothing was written. */
async function allahReferenceRows(): Promise<string> {
  const surah = chosen().surah;
  const references = await database().query(`select * from "allahReference" where surah = $1 order by 1, 2`, [surah]);
  const revisions = await database().query(`select * from "allahReferenceRevision" where surah = $1 order by 1, 2`, [surah]);
  return JSON.stringify([references.rows, revisions.rows]);
}

/** Run the seed the owner runs, `pnpm db:seed-allah-references <file>`, with `locations`, against the run's own Postgres. */
async function runSeed(locations: string[]): Promise<{ code: number; output: string }> {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "allah-references-")), "allah-references.json");
  fs.writeFileSync(file, JSON.stringify(locations));
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", "db:seed-allah-references", file], { cwd: WEB, env, encoding: "utf8" });
    return { code: 0, output: stdout + stderr };
  } catch (error) {
    const { code, stdout = "", stderr = "" } = error as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof code === "number" ? code : 1, output: stdout + stderr };
  }
}

// ---------------------------------------------------------------- reading what a page shows

/** The colour drawn behind each element whose id is in `ids`, every background from the root down composited; "missing" for one the page lacks. */
async function tintsOf(page: Page, ids: string[]): Promise<string[]> {
  await page.mouse.move(0, 0);
  return page.evaluate((ids) => {
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    return ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return "missing";
      const chain: Element[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1, 1);
      for (const e of chain) {
        ctx.fillStyle = getComputedStyle(e).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
      }
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    });
  }, ids);
}

/** A number in Western or Urdu digits. */
const numberIn = (text: string) => Number(text.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0)).match(/\d+/)?.[0] ?? NaN);

// ---------------------------------------------------------------- the warm-up

/** Run `pnpm warm-up <origin>` as the deploy does, with the run's database. */
async function warmUp(): Promise<{ code: number | null; output: string }> {
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  const child = spawn("pnpm", ["warm-up", baseURL()], { cwd: WEB, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  return { code, output };
}

/** Of `addresses`, each asked for once, those that do not answer 200 from Next's cache, AT_ONCE at a time. */
async function notFromCache(addresses: string[]): Promise<string[]> {
  const AT_ONCE = 8;
  const wrong: string[] = [];
  for (let i = 0; i < addresses.length; i += AT_ONCE) {
    await Promise.all(
      addresses.slice(i, i + AT_ONCE).map(async (address) => {
        const res = await get(address);
        await res.arrayBuffer();
        const cache = res.headers.get("x-nextjs-cache");
        if (res.status !== 200 || cache !== "HIT") wrong.push(`${address} ${res.status} ${cache}`);
      }),
    );
  }
  return wrong;
}

// ---------------------------------------------------------------- the scenarios

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let browser: Browser;
  let page: Page | undefined;
  let status: number | undefined;
  let lang: Lang = "en";
  let parts: { address: string; status: number; ayahs: PartAyah[] | undefined }[] = [];
  let html = "";
  let surahFile: { status: number; json: unknown; text: string } | undefined;
  let signedIn: SignedIn | undefined;
  let answer: Answer | undefined;
  let rowsBefore = "";
  let seed: { code: number; output: string } | undefined;
  let bodies = new Map<string, string>();
  let warm: { code: number | null; output: string } | undefined;
  let cacheMisses: string[] = [];

  BeforeAllScenarios(async () => {
    browser = await chromium.launch();
  });
  AfterAllScenarios(async () => {
    await browser.close();
  });
  BeforeEachScenario(() => {
    status = undefined;
    parts = [];
    html = "";
    surahFile = undefined;
    signedIn = undefined;
    answer = undefined;
    rowsBefore = "";
    seed = undefined;
  });
  AfterEachScenario(async () => {
    await page?.close();
    page = undefined;
  });

  const newPage = async () => {
    await page?.close();
    page = await browser.newPage({ baseURL: baseURL() });
    return page;
  };
  const onPage = () => {
    if (!page) throw new Error("no page open in this scenario");
    return page;
  };
  /** GET `address` as a client of /data/v1, keeping its answer as the scenario's file. */
  const fetchFile = async (address: string) => {
    const res = await get(address);
    const text = await res.text();
    surahFile = { status: res.status, json: res.status === 200 ? JSON.parse(text) : undefined, text };
  };
  const fetchPage = async (address: string) => {
    const res = await get(address);
    status = res.status;
    html = await res.text();
  };

  // An outline's steps carry its placeholders, so those are defined in each outline; the rest here, under any keyword.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("the page answers {int}", (_, expected: number) => {
      expect(status).toBe(expected);
    });

    // -------------------------------------------------- the Surah page

    step(
      "its Ayahs are grouped Passage by Passage as Neon holds them: the merged Passage one group, and no group beginning at the merged-away Passage's first Ayah",
      async () => {
        const shown = await ayahGroups(onPage(), chosen().surah);
        expect(shown.length, "Ayahs on the page").toBeGreaterThan(0);
        expect(shown.map((g) => g.from), "no group begins at the merged-away Passage's first Ayah").not.toContain(chosen().mergedAway.ayah_from);
        expect(shown).toEqual(neonPassages().map(({ from, till }) => ({ from, till })));
      },
    );

    // -------------------------------------------------- the parts

    step("each part answers 200 with JSON", () => {
      expect(parts.length, "parts of the chosen Surah").toBeGreaterThan(0);
      expect(parts.filter((p) => p.status !== 200 || !p.ayahs).map((p) => `${p.address} ${p.status}`)).toEqual([]);
    });

    step("no Ayah of any part begins a Passage at the merged-away Passage's first Ayah", () => {
      const at = chosen().mergedAway.ayah_from;
      const ayah = parts.flatMap((p) => p.ayahs ?? []).find((a) => a.number === at);
      expect(ayah, `Ayah ${chosen().surah}:${at} in a part`).toBeDefined();
      expect(ayah!.passage, `the Passage beginning at ${chosen().surah}:${at}`).toBeUndefined();
    });

    step('every Word of the phrased Passage has Phrase colour "a"', () => {
      const colours = new Map(parts.flatMap((p) => p.ayahs ?? []).flatMap((a) => a.words.map((w) => [w.location, w.phraseColour] as const)));
      const wrong = phrasedWords().filter((l) => colours.get(l) !== "a").map((l) => `${l}: ${colours.get(l)}`);
      expect(wrong.slice(0, 10), `${wrong.length} of ${phrasedWords().length} Words of the phrased Passage not "a"`).toEqual([]);
    });

    // -------------------------------------------------- the Share page

    step("its Link preview title names the chosen Surah and the merged Passage's Ayahs", () => {
      const { from, till } = mergedRange();
      const label = `${chosen().surah}:${from}–${till}`;
      for (const key of ["og:title", "twitter:title"]) expect(metaContent(html, key), key).toContain(label);
    });

    step("its edit strip offers the merged Passage's last Ayah as the To Ayah from the merged Passage's first Ayah", async () => {
      expect(status, "the Share page opened from inside the app answers").toBe(200);
      const strip = onPage().getByRole("group", { name: "Choose Ayahs to share", exact: true });
      const list = (name: string) => strip.getByRole("combobox", { name, exact: true });
      await list("To Ayah").waitFor({ timeout: 30_000 });
      const chosenOf = (name: string) => list(name).evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.label ?? "");
      expect(numberIn(await chosenOf("From Ayah")), "the From Ayah").toBe(mergedRange().from);
      const offered = await list("To Ayah").evaluate((el) =>
        Array.from((el as HTMLSelectElement).options)
          .filter((o) => !o.disabled && !o.hidden)
          .map((o) => o.label || o.textContent || ""),
      );
      expect(offered.map(numberIn), "the To Ayahs offered").toContain(mergedRange().till);
      expect(numberIn(await chosenOf("To Ayah")), "the To Ayah").toBe(mergedRange().till);
    });

    // -------------------------------------------------- the /data/v1 files

    step("a client fetches the chosen Surah's file from /data/v1", async () => {
      await fetchFile(`/data/v1/surahs/${chosen().surah}.json`);
    });

    for (const text of ["it answers 200 with JSON", "the Surah index answers 200 with JSON", "the Recitation file answers 200 with JSON"])
      step(text, () => {
        expect(surahFile?.status).toBe(200);
        expect(surahFile?.json).toBeTypeOf("object");
      });

    const file = () => surahFile!.json as { passages: unknown[]; phrases: unknown[]; ayahs: { words: { location: string; phraseColour?: string }[] }[] };

    step("its Passages are the chosen Surah's Passages as Neon holds them, each with its English and Urdu Passage titles", () => {
      expect(file().passages).toEqual(neonPassages());
    });

    step("its Phrases are the chosen Surah's Phrases as Neon holds them", () => {
      expect(file().phrases).toEqual([neonPhrase()]);
    });

    step('each Word of the phrased Passage has Phrase colour "a", and no other Word of the Surah has one', () => {
      // The Phrase's Words as Neon's rows hold them: a Word the Background's Quran changes added within it is phrased too.
      const words = neonSurah().ayahs.flatMap((a) => a.words.map((w) => w.location));
      const { first, last } = neonPhrase();
      const phrased = new Set(words.slice(words.indexOf(first), words.indexOf(last) + 1));
      const wrong = file()
        .ayahs.flatMap((a) => a.words)
        .filter((w) => (phrased.has(w.location) ? w.phraseColour !== "a" : w.phraseColour !== undefined))
        .map((w) => `${w.location}: ${w.phraseColour}`);
      expect(wrong.slice(0, 10), `${wrong.length} Words with the wrong Phrase colour`).toEqual([]);
    });

    step("a client fetches the manifest from /data/v1", async () => {
      await fetchPage("/data/v1/manifest.json");
      surahFile = { status: status!, json: status === 200 ? JSON.parse(html) : undefined, text: html };
    });

    step("the manifest names, for the chosen Surah, the content hash Neon stores for it", () => {
      expect(status, "the manifest answers").toBe(200);
      const entry = (JSON.parse(html) as { surahs: { number: number; hash: string }[] }).surahs.find((s) => s.number === chosen().surah);
      expect(entry?.hash, `the manifest's hash of Surah ${chosen().surah}`).toBe(chosen().hash);
    });

    // -------------------------------------------------- the Theme page

    step(
      "it shows one Passage group for the merged Passage, its heading linking to the merged Passage's first Ayah, with the Theme's Ayahs of both Passages under it",
      () => {
        const { surah, theme } = chosen();
        const { from, till } = mergedRange();
        const groups = shownGroups(html).filter((g) => g.href === `/${lang}/${surah}#${surah}:${from}`);
        const ayahs = theme.ayahs.filter((a) => a >= from && a <= till).map((a) => `/${lang}/${surah}#${surah}:${a}`);
        expect(groups).toEqual([{ href: `/${lang}/${surah}#${surah}:${from}`, ayahs }]);
      },
    );

    step("it shows no Passage group headed at the merged-away Passage's first Ayah", () => {
      const { surah, mergedAway } = chosen();
      expect(shownGroups(html).map((g) => g.href)).not.toContain(`/${lang}/${surah}#${surah}:${mergedAway.ayah_from}`);
    });

    // -------------------------------------------------- cached by tag

    const cachedAddresses = () => {
      const { surah } = chosen();
      return [
        ...LANGS.flatMap((l) => [`/${l}/${surah}`, ...partAddresses(l, surah), shareAddress(l), themeAddress(l)]),
        `/data/v1/surahs/${surah}.json`,
        "/data/v1/manifest.json",
      ];
    };

    step("I ask for each of the chosen Surah's addresses twice", async () => {
      bodies = new Map();
      const wrong: string[] = [];
      for (const address of cachedAddresses()) {
        await (await get(address)).arrayBuffer();
        const second = await get(address);
        bodies.set(address, await second.text());
        if (second.status !== 200 || second.headers.get("x-nextjs-cache") !== "HIT") wrong.push(`${address} ${second.status} ${second.headers.get("x-nextjs-cache")}`);
      }
      // Kept for the next step, which says what is wrong.
      cacheMisses = wrong;
    });

    step("each answers 200 the second time, from Next's cache", () => {
      expect(cacheMisses, "addresses not answered 200 from the cache the second time").toEqual([]);
    });

    step("the merged Passage's Passage titles are changed again in Neon, by SQL and not by a Publish", async () => {
      const { surah, merged } = chosen();
      const updated = await database().query(`update passage set title_en = title_en || ' again', title_ur = title_ur || ' again' where surah = $1 and ayah_from = $2`, [
        surah,
        merged.ayah_from,
      ]);
      expect(updated.rowCount).toBe(1);
    });

    step("each of those addresses still answers from Next's cache, with the same body as before", async () => {
      const wrong: string[] = [];
      for (const [address, body] of bodies) {
        const res = await get(address);
        const text = await res.text();
        if (res.status !== 200 || res.headers.get("x-nextjs-cache") !== "HIT") wrong.push(`${address} ${res.status} ${res.headers.get("x-nextjs-cache")}`);
        else if (text !== body) wrong.push(`${address} answered a different body`);
      }
      expect(wrong).toEqual([]);
    });

    // -------------------------------------------------- the warm-up

    step("the warm-up runs against the site with the run's database", async () => {
      warm = await warmUp();
    });

    step("it finishes without failing", () => {
      expect(warm?.code, warm?.output.slice(-2000)).toBe(0);
    });

    step("every Surah page of the {int} Surahs in Urdu and in English answers 200 from Next's cache", async (_, count: number) => {
      const pages = SURAHS.slice(0, count).flatMap((n) => LANGS.map((l) => `/${l}/${n}`));
      const wrong = await notFromCache(pages);
      expect(wrong.slice(0, 10), `${wrong.length} of ${pages.length} Surah pages not from the cache`).toEqual([]);
    });

    step("every Surah part of the {int} Surahs in Urdu and in English answers 200 from Next's cache", async (_, count: number) => {
      const addresses = SURAHS.slice(0, count).flatMap((n) => LANGS.flatMap((l) => partAddresses(l, n)));
      const wrong = await notFromCache(addresses);
      expect(wrong.slice(0, 10), `${wrong.length} of ${addresses.length} Surah parts not from the cache`).toEqual([]);
    });
  });

  // #172's steps that carry no placeholder, under any keyword.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };
    /** Why an expected change may be missing. */
    const why = (what: string) => (quranUnchanged ? `${what} (${quranUnchanged})` : what);
    const json = <T>() => surahFile!.json as T;

    step("it has no Word card for the changed Ayah's last Word, and one for the Word the grown Ayah gained", () => {
      expect(status).toBe(200);
      expect(html, why(`a Word card with id ${changed().last}`)).not.toContain(`id="${changed().last}"`);
      expect(html, why(`a Word card with id ${changed().grown.added}`)).toContain(`id="${changed().grown.added}"`);
    });

    /** The Word locations of the changed and the grown Ayah in `ayahs`, and as Neon holds them. */
    const changedWords = (ayahs: { number: number; words: { location: string }[] }[]) => {
      const { ayah, grown } = changed();
      const of = (list: { number: number; words: { location: string }[] }[], n: number) => list.find((a) => a.number === n)?.words.map((w) => w.location);
      expect({ changed: of(ayahs, ayah), grown: of(ayahs, grown.ayah) }, why(`the Words of Ayahs ${chosen().surah}:${ayah} and ${chosen().surah}:${grown.ayah}`)).toEqual({
        changed: of(neonSurah().ayahs, ayah),
        grown: of(neonSurah().ayahs, grown.ayah),
      });
    };

    step("the changed Ayah and the grown Ayah hold their Words as Neon holds them", () => {
      changedWords(parts.flatMap((p) => p.ayahs ?? []));
    });

    step("the Passage editor fetches the chosen Surah's Ayahs", async () => {
      await fetchFile(`/ayahs/${chosen().surah}.json`);
    });

    step("every Ayah translation and every Word meaning in it is as Neon holds it, in English and Urdu", () => {
      const served = json<BaseAyah[]>().map((a) => ({ number: a.number, translation: a.translation, meanings: a.words.map((w) => w.meaning) }));
      const expected = neonSurah().ayahs.map((a) => ({ number: a.number, translation: a.translation, meanings: a.words.map((w) => w.meaning) }));
      expect(served, why("the Passage editor's Ayahs")).toEqual(expected);
    });

    step("its changed Ayah and grown Ayah hold their Words as Neon holds them", () => {
      changedWords(json<BaseAyah[]>());
    });

    step(
      "it is the chosen Surah's committed Surah file as Neon's rows now make it, its Passages, Phrases, Phrase colours and Themes set aside",
      () => {
        expect(JSON.stringify(quranOf(json<BaseSurah & { ayahs: never[] }>())), why("the chosen Surah's /data/v1 file")).toBe(
          JSON.stringify(quranOf(neonSurah() as BaseSurah & { ayahs: never[] })),
        );
      },
    );

    step("a client fetches the Surah index from /data/v1", async () => {
      await fetchFile("/data/v1/surahs.json");
    });

    step("it is the committed Surah index, the chosen Surah's Latin name as Neon holds it", () => {
      const expected = committedSurahIndex().map((s) => (s.number === chosen().surah ? { ...s, nameLatin: marked(s.nameLatin) } : s));
      expect(surahFile!.text, why("the Surah index")).toBe(JSON.stringify(expected));
    });

    step("a client fetches the chosen Surah's Recitation file from /data/v1", async () => {
      await fetchFile(`/data/v1/recitations/${chosen().surah}.json`);
    });

    step(
      "it is the chosen Surah's committed Recitation file with Neon's Recitation timings: the changed Ayah's last Word untimed, its first timing ending 1 ms earlier",
      () => {
        expect(surahFile!.text, why("the chosen Surah's Recitation file")).toBe(JSON.stringify(neonRecitation()));
      },
    );

    step("the manifest names, for the chosen Surah's Recitation, the SHA-256 of its committed Recitation file", () => {
      const entry = json<{ recitations: { number: number; hash: string }[] }>().recitations.find((r) => r.number === chosen().surah);
      expect(entry?.hash, "the manifest's hash of the chosen Surah's Recitation").toBe(sha256(JSON.stringify(committedRecitation(chosen().surah))));
    });

    step("that is not the SHA-256 of the Recitation file /data/v1 now serves for it", async () => {
      const entry = json<{ recitations: { number: number; hash: string }[] }>().recitations.find((r) => r.number === chosen().surah);
      const res = await get(`/data/v1/recitations/${chosen().surah}.json`);
      const served = Buffer.from(await res.arrayBuffer());
      expect(res.status).toBe(200);
      expect(entry?.hash, why("the hash of the Recitation file served, made from Neon's changed rows")).not.toBe(sha256(served));
    });

    // The dataset version over what /data/v1 now serves, as published-quran's AC-4 scenario makes it: the Surah index,
    // the Surah hashes the manifest names, the Roots and the Juz file (neither moves in #172), the Recitation files and the particle files.
    step("its dataset version is not one made from the Surah index and the Recitation files /data/v1 now serves", async () => {
      const manifest = json<{ datasetVersion: string; surahs: { hash: string }[]; recitations: { url: string }[] }>();
      const bytes = async (address: string) => {
        const res = await get(address);
        expect(res.status, address).toBe(200);
        return Buffer.from(await res.arrayBuffer());
      };
      const recitations: string[] = [];
      for (const r of manifest.recitations) recitations.push(sha256(await bytes(r.url)));
      const hashes = [
        sha256(await bytes("/data/v1/surahs.json")),
        ...manifest.surahs.map((s) => s.hash),
        ...committedRoots().map((r) => sha256(JSON.stringify(r.root))),
        ...recitations,
        sha256(JSON.stringify(committedJuz())),
        // The particle files (#249), /data/v1/particles/1.json up to the first not found.
        ...(await particleFiles()),
      ];
      expect(manifest.datasetVersion, why("the dataset version made from the Surah index and Recitations Neon's changed rows make")).not.toBe(sha256(hashes.join("\n")));
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step(
      "I publish, against the chosen Surah's latest Allah reference version, the changed Ayah's last Word as an Allah reference",
      async () => {
        const surah = chosen().surah;
        const { rows } = await database().query(`select coalesce(max(version), 0) as version from "allahReferenceRevision" where surah = $1`, [surah]);
        rowsBefore = await allahReferenceRows();
        answer = await send(
          "POST",
          `/api/v1/allah-references/${surah}`,
          credentialHeaders("session cookie", signedIn),
          JSON.stringify({ base: Number(rows[0].version), changes: [changed().last] }),
        );
      },
    );

    step("the Publish is refused {int}", (_, expected: number) => {
      expect(answer?.status, why(`the Publish of ${changed().last}: ${answer?.text.slice(0, 300)}`)).toBe(expected);
    });

    step("the seed runs with a file holding the changed Ayah's last Word", async () => {
      rowsBefore = await allahReferenceRows();
      seed = await runSeed([changed().last]);
    });

    step("it exits non-zero, refused, naming the changed Ayah's last Word", () => {
      expect(seed?.code, why(`the seed with ${changed().last}: ${seed?.output.slice(-1000)}`)).not.toBe(0);
      expect(seed?.output).toContain("refused");
      expect(seed?.output).toContain(changed().last);
    });

    step("nothing of the chosen Surah's Allah references or their revisions is written", async () => {
      expect(await allahReferenceRows()).toBe(rowsBefore);
    });
  });

  Background(({ Given, And }) => {
    Given("Neon's Passages, Phrases and content hash of the chosen Surah were changed by SQL, before any page read them", async () => {
      await arrange();
    });
    And(
      "Neon's Quran text, Word meanings, Word count and Recitation timings of the chosen Surah were changed by SQL, before any page read them",
      async () => {
        await arrangeQuran();
      },
    );
  });

  ScenarioOutline("The chosen Surah's page in <Language>, asked for the first time, shows Neon's Passages and Phrases", ({ When, And }, variables) => {
    When("I open the chosen Surah's page in <Language> in a browser", async () => {
      lang = langOf(variables.Language);
      status = (await (await newPage()).goto(`/${lang}/${chosen().surah}`))?.status();
    });
    And("every Word card of the phrased Passage is drawn in tint A, the tint of Al-Fatihah's first Word card in <Language>", async () => {
      expect(committedPassageSurah(1).ayahs[0].words[0].phraseColour, "Al-Fatihah's first Word's Phrase colour").toBe("a");
      const drawn = await tintsOf(onPage(), phrasedWords());
      const fatihah = await browser.newPage({ baseURL: baseURL() });
      await fatihah.goto(`/${lang}/1`);
      const [tintA] = await tintsOf(fatihah, ["1:1:1"]);
      const [paper] = await fatihah.evaluate(() => [getComputedStyle(document.body).backgroundColor]);
      await fatihah.close();
      expect(tintA, "tint A differs from the page's paper").not.toBe(paper);
      const wrong = phrasedWords()
        .map((l, i) => [l, drawn[i]])
        .filter(([, t]) => t !== tintA)
        .map(([l, t]) => `${l}: ${t}`);
      expect(wrong.slice(0, 10), `${wrong.length} of ${drawn.length} Word cards not in tint A (${tintA})`).toEqual([]);
    });
  });

  ScenarioOutline("The chosen Surah's parts in <Language> carry Neon's Passages and Phrase colours", ({ When, And }, variables) => {
    When("I fetch every Surah part of the chosen Surah in <Language>", async () => {
      lang = langOf(variables.Language);
      for (const address of partAddresses(lang, chosen().surah)) {
        const res = await get(address);
        parts.push({ address, status: res.status, ayahs: res.status === 200 ? ((await res.json()) as PartAyah[]) : undefined });
      }
    });
    And(
      "the merged Passage begins at its first Ayah, running to the merged-away Passage's last Ayah, with its Passage title in <Language> as Neon holds it",
      () => {
        const { from, till } = mergedRange();
        const ayah = parts.flatMap((p) => p.ayahs ?? []).find((a) => a.number === from);
        const title = neonPassages().find((p) => p.from === from)![lang];
        expect(ayah?.passage, `the Passage beginning at ${chosen().surah}:${from}`).toEqual({ from, till, title });
      },
    );
  });

  ScenarioOutline("The merged Passage, longer than 10 Ayahs, can be shared whole in <Language>, as only a Passage can", ({ When }, variables) => {
    When("I fetch the Share page of the merged Passage in <Language> in Uthmani", async () => {
      lang = langOf(variables.Language);
      expect(mergedRange().till - mergedRange().from + 1, "Ayahs in the merged Passage").toBeGreaterThan(10);
      await fetchPage(shareAddress(lang));
    });
    When("I open that Share page in <Language> from inside the app, in a browser", async () => {
      const res = await (await newPage()).goto(`${shareAddress(lang)}?edit`);
      // A Share page that is not found has no edit strip: say so, rather than wait for one.
      status = res?.status();
      expect(status, `${shareAddress(lang)}?edit answers`).toBe(200);
    });
  });

  Scenario("The chosen Surah's /data/v1 file carries Neon's Passages and Phrases, and the manifest names Neon's stored hash", () => {});

  ScenarioOutline("The chosen Theme's page in <Language> groups its Ayahs by Neon's Passages", ({ When }, variables) => {
    When("I fetch the chosen Theme's page in <Language>", async () => {
      lang = langOf(variables.Language);
      await fetchPage(themeAddress(lang));
    });
  });

  /** Expect the shown text of the last page fetched to hold `texts`, none missing. */
  const expectShown = (texts: (string | null)[], what: string) => {
    const shown = shownText(html);
    const missing = texts.filter((t): t is string => t !== null && t !== "" && !shown.includes(t));
    expect(missing.slice(0, 5), `${missing.length} of ${texts.length} ${what} not shown${quranUnchanged ? ` (${quranUnchanged})` : ""}`).toEqual([]);
  };
  const changedTranslation = () => neonSurah().ayahs[changed().ayah - 1].translation[lang];

  ScenarioOutline("The chosen Surah's page in <Language> shows Neon's Quran text, Word meanings and Ayah translations", ({ When, And }, variables) => {
    When("I fetch the chosen Surah's page in <Language>", async () => {
      lang = langOf(variables.Language);
      await fetchPage(`/${lang}/${chosen().surah}`);
    });
    And("it shows every Ayah translation and every Word meaning of the chosen Surah in <Language> as Neon holds them", () => {
      const ayahs = neonSurah().ayahs;
      expectShown(ayahs.map((a) => a.translation[lang]), "Ayah translations");
      expectShown(ayahs.flatMap((a) => a.words.map((w) => w.meaning[lang])), "Word meanings");
    });
  });

  ScenarioOutline("The chosen Surah's parts in <Language> carry Neon's Quran text and Word count", ({ When, And }, variables) => {
    When("I fetch every Surah part of the chosen Surah in <Language>, cut by Word count", async () => {
      lang = langOf(variables.Language);
      for (const address of partAddresses(lang, chosen().surah)) {
        const res = await get(address);
        parts.push({ address, status: res.status, ayahs: res.status === 200 ? ((await res.json()) as PartAyah[]) : undefined });
      }
    });
    And("every Ayah translation and every Word meaning of the parts in <Language> is as Neon holds it", () => {
      type Shown = { number: number; translation: string; words: { location: string; meaning: string }[] };
      const served = parts.flatMap((p) => (p.ayahs ?? []) as unknown as Shown[]).map((a) => ({ number: a.number, translation: a.translation, meanings: a.words.map((w) => w.meaning) }));
      const expected = neonSurah().ayahs.map((a) => ({ number: a.number, translation: a.translation[lang], meanings: a.words.map((w) => w.meaning[lang]) }));
      expect(served, `the parts' Ayahs${quranUnchanged ? ` (${quranUnchanged})` : ""}`).toEqual(expected);
    });
  });

  ScenarioOutline("The merged Passage's Share page in <Language> shows Neon's Ayah translations", ({ When, And }, variables) => {
    When("I fetch the Share page of the merged Passage in <Language> in Uthmani, for its Ayah translations", async () => {
      lang = langOf(variables.Language);
      await fetchPage(shareAddress(lang));
    });
    And("it shows the changed Ayah's translation in <Language> as Neon holds it", () => {
      expectShown([changedTranslation()], "Ayah translations");
    });
  });

  ScenarioOutline("The chosen Theme's page in <Language> shows Neon's Ayah translations", ({ When, And }, variables) => {
    When("I fetch the chosen Theme's page in <Language>, for its Ayah translations", async () => {
      lang = langOf(variables.Language);
      await fetchPage(themeAddress(lang));
    });
    And("it shows the changed Ayah's translation in <Language> as Neon holds it", () => {
      expectShown([changedTranslation()], "Ayah translations");
    });
  });

  Scenario("The Passage editor's Ayahs of the chosen Surah are Neon's", () => {});
  Scenario("The chosen Surah's /data/v1 file, the Surah index and its Recitation file are made from Neon's rows", () => {});
  Scenario("The manifest names the chosen Surah's Recitation by the hash stored at import, not one made from its rows", () => {});
  Scenario("An Admin's Allah reference Publish is checked against Neon's Words", () => {});
  Scenario("The Allah references seed is checked against Neon's Words", () => {});

  Scenario("The chosen Surah's pages, parts and files are served from Next's cache, until a Publish refreshes them", () => {});
  Scenario("After the warm-up, every Surah page and every Surah part in Urdu and English is served from Next's cache on its first request", () => {});
});
