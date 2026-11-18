// Each Script's 30 Juz (#193, ADR 0021, ADR 0035). Uthmani follows QUL's
// Madinah Juz file, data/qul/quran-metadata-juz.json. Indo-Pak starts where
// the Madinah Juz start, except the Juz Saaliheen's own Indo-Pak Juz starts
// file, data/indopak-juz-starts.json, starts elsewhere (QUL publishes no
// Indo-Pak Juz file). Each Juz ends at the Ayah just before the next starts,
// and Juz 30 at the Quran's last Ayah. A Juz is named by the opening Words of
// its first Ayah in its own Script, without the ۞ sign that marks a Hizb.

import path from "node:path";
import { isObject, readJson, readJsonObject } from "./source-json.ts";
import { SCRIPTS, type Juz, type JuzLists, type Script, type Surah } from "./types.ts";

const MADINAH_JUZ_SOURCE = "quran-metadata-juz.json";
const INDOPAK_JUZ_STARTS_FILE = "indopak-juz-starts.json";

const JUZ_COUNT = 30;
/** How many opening Words name a Juz. */
const NAME_WORDS = 2;
/** The sign QPC Hafs writes before the Word a Hizb starts at. */
const HIZB_SIGN = "۞";
const AYAH = /^\d+:\d+$/;

/** Each Juz's first Ayah ("s:a"), Juz 1 first, per Script. */
export type JuzStarts = Record<Script, string[]>;

const isJuzNumber = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= JUZ_COUNT;
const isAyah = (value: unknown): value is string => typeof value === "string" && AYAH.test(value);

/** QUL's Madinah first Ayahs, Juz 1 to 30. Throws, naming the file, when one is missing or malformed. */
function readMadinahStarts(qulDir: string): string[] {
  const json = readJsonObject(qulDir, MADINAH_JUZ_SOURCE);
  return Array.from({ length: JUZ_COUNT }, (_, k) => {
    const entry = json[String(k + 1)];
    if (!isObject(entry) || !isAyah(entry.first_verse_key)) {
      throw new Error(`${MADINAH_JUZ_SOURCE}: malformed or missing entry for Juz ${k + 1}`);
    }
    return entry.first_verse_key;
  });
}

const isIndopakStart = (entry: unknown): entry is { juz: number; firstAyah: string } =>
  isObject(entry) && isJuzNumber(entry.juz) && isAyah(entry.firstAyah);

/** Saaliheen's Indo-Pak first Ayahs where they differ from Madinah's, by Juz number. */
function readIndopakStarts(dataDir: string): Map<number, string> {
  const json = readJson(dataDir, INDOPAK_JUZ_STARTS_FILE);
  if (!Array.isArray(json)) throw new Error(`${INDOPAK_JUZ_STARTS_FILE}: malformed — expected a JSON array of Juz starts`);
  return new Map(
    json.map((entry: unknown, i) => {
      if (!isIndopakStart(entry)) throw new Error(`${INDOPAK_JUZ_STARTS_FILE}: malformed entry ${i + 1}`);
      return [entry.juz, entry.firstAyah] as const;
    }),
  );
}

/** Each Script's Juz starts, read from QUL's Madinah file and Saaliheen's Indo-Pak starts file. */
export function readJuzStarts(dataDir: string): JuzStarts {
  const madinah = readMadinahStarts(path.join(dataDir, "qul"));
  const indopak = readIndopakStarts(dataDir);
  return { uthmani: madinah, indopak: madinah.map((start, k) => indopak.get(k + 1) ?? start) };
}

/** Every Ayah of `surahs` as "s:a", in Quran order. */
const ayahKeys = (surahs: Surah[]) => surahs.flatMap((s) => s.ayahs.map((a) => `${s.number}:${a.number}`));

/** The opening Words of Ayah `key` in `script`, without the Hizb sign, joined by spaces. */
function nameAt(surahs: Surah[], key: string, script: Script): string {
  const [s, a] = key.split(":").map(Number);
  const words = surahs[s - 1].ayahs[a - 1].words.map((w) => w[script].replaceAll(HIZB_SIGN, "").trim());
  return words.filter((w) => w !== "").slice(0, NAME_WORDS).join(" ");
}

/** Where each start sits among `ayahs`; throws, naming `source`, when one is not an Ayah or they are out of order. */
function startIndexes(starts: string[], ayahs: string[], source: string): number[] {
  const indexes = starts.map((start) => ayahs.indexOf(start));
  indexes.forEach((at, k) => {
    if (at < 0) throw new Error(`${source}: Juz ${k + 1} starts at ${starts[k]}, which is not an Ayah`);
    if (at <= (indexes[k - 1] ?? -1)) throw new Error(`${source}: Juz ${k + 1} does not start after Juz ${k}`);
  });
  if (indexes[0] !== 0) throw new Error(`${source}: Juz 1 starts at ${starts[0]}, not at the Quran's first Ayah`);
  return indexes;
}

/** One Script's Juz list: each Juz from its start to the Ayah before the next. */
function juzList(starts: string[], surahs: Surah[], script: Script, source: string): Juz[] {
  const ayahs = ayahKeys(surahs);
  const indexes = startIndexes(starts, ayahs, source);
  return indexes.map((at, k) => ({
    number: k + 1,
    name: nameAt(surahs, ayahs[at], script),
    firstAyah: ayahs[at],
    lastAyah: ayahs[(indexes[k + 1] ?? ayahs.length) - 1],
  }));
}

const SOURCE_OF: Record<Script, string> = { uthmani: MADINAH_JUZ_SOURCE, indopak: INDOPAK_JUZ_STARTS_FILE };

/** Both Scripts' Juz lists. Throws, naming the source, when a start is not an Ayah or the starts are out of order. */
export const buildJuz = (starts: JuzStarts, surahs: Surah[]): JuzLists =>
  Object.fromEntries(SCRIPTS.map((script) => [script, juzList(starts[script], surahs, script, SOURCE_OF[script])])) as JuzLists;
