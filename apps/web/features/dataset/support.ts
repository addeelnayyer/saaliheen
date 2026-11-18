// Seam 1 (#1 § Testing Decisions): shared by the dataset features' steps.
// The steps call the dataset builder's single entry point on the real committed
// sources and assert on the dataset it returns. Expected Arabic and Word
// meanings are read from the sources here, never typed.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { buildDataset, type BuildResult, type SectionMarks, type Word } from "@saaliheen/dataset";

export type { SectionMark, SectionMarks } from "@saaliheen/dataset";

export const DATA = fileURLToPath(new URL("../../data", import.meta.url));
const QUL = path.join(DATA, "qul");

export type TextSource = Record<string, { location: string; text: string }>;
export type MeaningSource = Record<string, string>;
export type SurahMeta = Record<string, Record<string, unknown>>;

/** Surah `n`'s Ayah count in QUL's Surah metadata; the field name is QUL's. */
export const metadataAyahCount = (meta: SurahMeta, n: number) => meta[String(n)]["verses_count"];

export const readSource = <T>(name: string): T =>
  JSON.parse(fs.readFileSync(path.join(QUL, name), "utf8")) as T;

// The sources #2's builder imports (issue #2 § Dataset builder).
export const UTHMANI = "qpc-hafs-word-by-word.json";
export const INDOPAK = "digital-khatt-indopak.json";
export const URDU = "urud-wbw.json";
export const ENGLISH = "english-wbw-translation.json";
export const SURAH_META = "quran-metadata-surah-name.json";
/** QUL resource 422's Word timings, the Recitation's source (#115). */
export const RECITATION = "yasser-ad-dussary-surah-by-surah.json";

/** The Recitation source as committed: per `surah:ayah`, its `[word, start ms, end ms]` timings and where the Ayah starts and ends in its Surah's audio. */
export type TimingSource = Record<string, { segments: [number, number, number][]; timestamp_from: number; timestamp_to: number }>;

/** The dataset built from the committed sources: built on first use, then reused,
 *  so each feature builds once and a scenario run alone (`-t`) still has it. */
let built: BuildResult | undefined;
export const buildFromCommittedSources = (): BuildResult => (built ??= buildDataset({ sourceDir: DATA }));

/** In the QPC Hafs text an Ayah-end marker is the Ayah number in Arabic-Indic
 *  digits, stored as the Ayah's last entry. It is not a Word (#1 § Data rules). */
export const isAyahEnd = (uthmani: TextSource, location: string) =>
  /^[٠-٩]+$/.test(uthmani[location].text);

export const allWords = (result: BuildResult): Word[] =>
  result.dataset.surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words));

export function wordAt(result: BuildResult, location: string): Word {
  const [s, a, w] = location.split(":").map(Number);
  const word = result.dataset.surahs[s - 1]?.ayahs[a - 1]?.words[w - 1];
  expect(word, `no Word at ${location}`).toBeDefined();
  expect(word!.location).toBe(location);
  return word!;
}

/** A throwaway source directory: every real source linked in, except `omit`,
 *  with `replace` written over the named files. `omitData` and `replaceData` do
 *  the same for the files beside `qul/` (the Passages file, roots.json).
 *  Remove it with `removeSourceCopies`. */
const tempDirs: string[] = [];
export function sourceCopy({
  omit,
  replace = {},
  omitData,
  replaceData = {},
}: {
  omit?: string;
  replace?: Record<string, string>;
  omitData?: string;
  replaceData?: Record<string, string>;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qwbw-sources-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, "qul"));
  for (const entry of fs.readdirSync(QUL)) {
    if (entry === omit) continue;
    const target = path.join(dir, "qul", entry);
    if (entry in replace) fs.writeFileSync(target, replace[entry]);
    else fs.symlinkSync(path.join(QUL, entry), target);
  }
  for (const entry of fs.readdirSync(DATA)) {
    if (entry === "qul" || entry === omitData) continue;
    if (entry in replaceData) fs.writeFileSync(path.join(dir, entry), replaceData[entry]);
    else fs.symlinkSync(path.join(DATA, entry), path.join(dir, entry));
  }
  // A file beside `qul/` the committed data does not hold yet is written too.
  for (const [entry, content] of Object.entries(replaceData)) {
    if (!fs.existsSync(path.join(dir, entry))) fs.writeFileSync(path.join(dir, entry), content);
  }
  return dir;
}
export function removeSourceCopies() {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
}

/** QUL's Madinah Juz file (#193): per Juz number, its first and last Ayah (`first_verse_key`, QUL's names). */
export const JUZ_META = "quran-metadata-juz.json";
export type JuzMeta = Record<string, { juz_number: number; first_verse_key: string; last_verse_key: string }>;

/** One Juz of a Script's Juz list (#193): its number, its name in that Script and its first and last Ayah ("36:28"). */
export interface Juz {
  number: number;
  name: string;
  firstAyah: string;
  lastAyah: string;
}
export type JuzScript = "uthmani" | "indopak";

/** `script`'s Juz list in the built dataset (`dataset.juz.<script>`), looked up
 *  loosely so the features compile before the builder makes it, and fail on
 *  this assertion instead. */
export function juzListOf(result: BuildResult, script: JuzScript): Juz[] {
  const juz = (result.dataset as unknown as { juz?: Partial<Record<JuzScript, Juz[]>> }).juz;
  expect(juz, "the dataset holds each Script's Juz list (dataset.juz)").toBeDefined();
  expect(juz![script], `the dataset holds the ${script} Juz list`).toBeDefined();
  return juz![script]!;
}

/** QUL's Rub' al-Hizb file (#194): per Hizb quarter number (1–240), its first and last Ayah (QUL's field names). */
export const RUB_META = "quran-metadata-rub.json";
export type RubMeta = Record<string, { rub_number: number; verses_count: number; first_verse_key: string; last_verse_key: string }>;
/** QUL's Ruku file (#194): per Ruku number (1–558), its number in its Surah, its Ayah count and its first Ayah. */
export const RUKU_META = "quran-metadata-ruku.json";
export type RukuMeta = Record<
  string,
  { ruku_number: number; surah_ruku_number: number; verses_count: number; first_verse_key: string; last_verse_key: string }
>;

/** Hizb quarter `q`'s label by its place in its Hizb (CONTEXT.md: Hizb quarter): Hizb N, ¼ Hizb N, ½ Hizb N, ¾ Hizb N. */
export const hizbQuarterLabel = (q: number) => `${["", "¼ ", "½ ", "¾ "][(q - 1) % 4]}Hizb ${Math.ceil(q / 4)}`;
/** A Ruku's label: "Ruku 2 of 2 · 3 Ayahs", or "· 1 Ayah" for one Ayah. */
export const rukuLabel = (n: number, of: number, ayahs: number) => `Ruku ${n} of ${of} · ${ayahs} ${ayahs === 1 ? "Ayah" : "Ayahs"}`;

/** A Surah's Section marks (`surah.sectionMarks`), from a built Surah or a written Surah file, asserted present. */
export function sectionMarksOf(surah: unknown, what = "the Surah"): SectionMarks {
  const marks = (surah as { sectionMarks?: Partial<SectionMarks> }).sectionMarks;
  expect(marks, `${what} carries its Section marks (sectionMarks)`).toBeDefined();
  expect(marks!.hizbQuarters, `${what} carries its Hizb quarter marks`).toBeInstanceOf(Array);
  expect(marks!.rukus, `${what} carries its Ruku marks`).toBeInstanceOf(Array);
  return marks as SectionMarks;
}

/** A QPC Hafs Word's text as the dataset shows it (ADR 0020): without the printed ۞ and the space after it. */
export const withoutHizbSign = (text: string) => text.replace(/^۞ /, "");
/** A Digital Khatt Ayah-end text as the dataset shows it (ADR 0020): without the Ruku sign U+08D6. */
export const withoutRukuSign = (text: string) => text.replaceAll("ࣖ", "");
