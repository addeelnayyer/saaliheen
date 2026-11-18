// Dataset builder (#1 § Architecture, module 1): the single entry point that
// takes the committed sources and returns the site dataset and its report.
// Only this module (with the source readers it imports) reads `data/qul/` or
// `data/roots.json`, and, beside them, Saaliheen's own Indo-Pak Juz starts
// `data/indopak-juz-starts.json` (#193). Themes live in Neon (#170, ADR 0041):
// each Ayah keeps an empty list of them. Passages and Phrases live in Neon too
// (#171, ADR 0046): each Surah keeps empty lists of them and no Word a Phrase
// colour, which /data/v1 and the pages fill from Neon. The Recitation's Word
// timings (#115) and the Section marks' Hizb quarters and Rukus (#194) are more
// QUL sources.

import path from "node:path";
import { buildRecitations, RECITATION_SOURCE } from "./recitation-source.ts";
import { readRootSources, type RootSources } from "./root-sources.ts";
import { readSectionMarks, sectionMarksOf, withoutHizbSign, withoutRukuSign, type SectionMarkSources } from "./section-marks.ts";
import { buildJuz, readJuzStarts, type JuzStarts } from "./juz.ts";
import { buildParticles, buildRoots, rootDisagreements, rootTag, tagParticleWords } from "./roots.ts";
import { isObject, readJsonObject } from "./source-json.ts";
import {
  LANGUAGES,
  type Ayah,
  type BuildResult,
  type Language,
  type Surah,
  type SurahSummary,
  type Word,
  type WordMeaningGap,
} from "./types.ts";

export type * from "./types.ts";

export interface BuildOptions {
  /** Directory holding `qul/` and `roots.json`: the website's `data/`. */
  sourceDir: string;
}

const SOURCES = {
  uthmani: "qpc-hafs-word-by-word.json",
  indopak: "digital-khatt-indopak.json",
  surahMeta: "quran-metadata-surah-name.json",
  meaning: { ur: "urud-wbw.json", en: "english-wbw-translation.json" } satisfies Record<Language, string>,
  translation: {
    ur: "ur-fatah-muhammad-jalandhari-simple.json",
    en: "en-sahih-international-inline-footnotes.json",
  } satisfies Record<Language, string>,
};

type ScriptText = Map<string, string>;

/** An Ayah-end marker in the QPC Hafs text: the Ayah number in Arabic-Indic digits. */
const isAyahEnd = (uthmani: string) => /^[٠-٩]+$/.test(uthmani);
/** The number an Ayah-end marker's Arabic-Indic digits write. */
const markerNumber = (uthmani: string) => Number(uthmani.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)));

const LOCATION = /^(\d+):(\d+):(\d+)$/;
/** An Ayah as `surah:ayah`. */
const AYAH = /^\d+:\d+$/;

/** Saheeh International's inline footnotes; single-bracket insertions like "[All]" are the translator's and stay. */
const FOOTNOTE = /\[\[[\s\S]*?\]\]/g;
const withoutFootnotes = (text: string) => text.replace(FOOTNOTE, "").replace(/\s+/g, " ").trim();

/** How each Language's Ayah translation source is turned into the dataset's text. */
const TRANSLATION_TEXT: Record<Language, (text: string) => string> = {
  ur: (text) => text,
  en: withoutFootnotes,
};

type ByLanguage = Record<Language, Map<string, string>>;

/** The committed sources, each parsed once into a typed shape, read in a fixed
 *  order so the first broken file is the one named. */
interface Sources {
  uthmani: ScriptText;
  indopak: ScriptText;
  meanings: ByLanguage;
  translations: ByLanguage;
  meta: Map<number, SurahSummary>;
  roots: RootSources;
  /** QUL's Recitation timings, checked once the Ayahs they time are known. */
  recitation: Record<string, unknown>;
  /** Each Script's Juz starts (#193): QUL's Madinah file and Saaliheen's Indo-Pak starts. */
  juzStarts: JuzStarts;
  /** QUL's Hizb quarters and Rukus, as each Surah's Section marks (#194). */
  sectionMarks: SectionMarkSources;
}

/** A Surah before its Passages and Phrases are added. */
type SurahText = Omit<Surah, "passages" | "phrases">;

/** A Word location split into its Surah, Ayah and Word numbers. */
interface LocationEntry {
  location: string;
  s: number;
  a: number;
  w: number;
}

/**
 * Build the site dataset from the committed sources. Throws, naming the file,
 * when a source is missing or malformed, and when the two Script texts'
 * Word locations differ (ADR 0002), and, naming the Ayah, when the
 * Recitation's timings miss or mistime one (#115).
 */
export function buildDataset({ sourceDir }: BuildOptions): BuildResult {
  const sources = readSources(sourceDir);
  assertSameLocations(sources.uthmani, sources.indopak);
  const gaps: WordMeaningGap[] = [];
  const texts = assembleSurahs(groupIntoAyahs(sources, gaps), sources.meta, sources.sectionMarks);
  assertTranslationsCoverEveryAyah(sources.translations, texts);
  const surahs = withoutPassages(texts);
  const words = new Map(surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words)).map((w) => [w.location, w]));
  const { recitations, untimedWords } = buildRecitations(sources.recitation, surahs);
  const particles = buildParticles(sources.roots, words);
  // Each rootless Word's Particle tag follows its Root tag, null for it (#249).
  tagParticleWords(particles, words);
  return {
    dataset: {
      surahs,
      roots: buildRoots(sources.roots, words),
      particles,
      recitations,
      juz: buildJuz(sources.juzStarts, surahs),
    },
    report: { wordMeaningGaps: gaps, rootDisagreements: rootDisagreements(sources.roots), untimedWords },
  };
}

function readSources(dataDir: string): Sources {
  const qul = path.join(dataDir, "qul");
  const read = (name: string) => readJsonObject(qul, name);
  const byLanguage = (readOne: (language: Language) => Map<string, string>) =>
    Object.fromEntries(LANGUAGES.map((language) => [language, readOne(language)])) as ByLanguage;
  const uthmani = readScriptText(SOURCES.uthmani, read(SOURCES.uthmani));
  const indopak = readScriptText(SOURCES.indopak, read(SOURCES.indopak));
  const meanings = byLanguage((language) => readMeanings(SOURCES.meaning[language], read(SOURCES.meaning[language])));
  const translations = byLanguage((language) => {
    const name = SOURCES.translation[language];
    return readTranslation(name, read(name), TRANSLATION_TEXT[language]);
  });
  const meta = readSurahMeta(SOURCES.surahMeta, read(SOURCES.surahMeta));
  const roots = readRootSources(qul, dataDir);
  const recitation = read(RECITATION_SOURCE);
  const juzStarts = readJuzStarts(dataDir);
  const sectionMarks = readSectionMarks(qul);
  return { uthmani, indopak, meanings, translations, meta, roots, recitation, juzStarts, sectionMarks };
}

/** Group the Uthmani entries into Surahs and Ayahs in numeric order,
 *  never trusting the order of the source's entries. */
function groupIntoAyahs(sources: Sources, gaps: WordMeaningGap[]): Map<number, Ayah[]> {
  const ayahsBySurah = new Map<number, Ayah[]>();
  for (const entry of sortedLocations(sources.uthmani)) {
    const text = sources.uthmani.get(entry.location)!;
    const ayah = ayahFor(ayahsBySurah, entry, sources.translations);
    if (isAyahEnd(text)) {
      if (markerNumber(text) !== entry.a) {
        throw new Error(`${SOURCES.uthmani}: the Ayah-end marker at ${entry.location} does not number Ayah ${entry.s}:${entry.a}`);
      }
      ayah.indopakEnd = withoutRukuSign(sources.indopak.get(entry.location)!);
      continue;
    }
    const word: Word = {
      location: entry.location,
      uthmani: withoutHizbSign(text),
      indopak: sources.indopak.get(entry.location)!,
      meaning: wordMeaning(sources.meanings, entry.location, gaps),
      root: rootTag(sources.roots, entry.location),
    };
    ayah.words.push(word);
  }
  return ayahsBySurah;
}

function sortedLocations(text: ScriptText): LocationEntry[] {
  const entries = [...text.keys()].map((location) => {
    const [, s, a, w] = LOCATION.exec(location)!.map(Number);
    return { location, s, a, w };
  });
  return entries.sort((x, y) => x.s - y.s || x.a - y.a || x.w - y.w);
}

/** The Ayah the Word at `entry` belongs to, opened (with its Ayah translation)
 *  when it is the Ayah's first Word. */
function ayahFor(ayahsBySurah: Map<number, Ayah[]>, entry: LocationEntry, translations: ByLanguage): Ayah {
  const ayahs = ayahsBySurah.get(entry.s) ?? [];
  ayahsBySurah.set(entry.s, ayahs);
  if (ayahs.length < entry.a) {
    ayahs.push({
      number: entry.a,
      words: [],
      indopakEnd: "", // until its Ayah-end marker
      translation: ayahTranslation(translations, `${entry.s}:${entry.a}`),
      themes: [], // Neon's, put in by the website as it serves the Surah (ADR 0041)
    });
  }
  const ayah = ayahs[ayahs.length - 1];
  assertNextWord(ayah, entry);
  return ayah;
}

function assertNextWord(ayah: Ayah, { location, s, a, w }: LocationEntry) {
  if (ayah.number !== a || ayah.words.length + 1 !== w) {
    throw new Error(`${SOURCES.uthmani}: Word locations are not numbered 1..n within Ayah ${s}:${a} (at ${location})`);
  }
}

/** QUL's Word meaning in each Language, "" (and a report gap) where QUL lacks one. */
function wordMeaning(
  meanings: Record<Language, Map<string, string>>,
  location: string,
  gaps: WordMeaningGap[],
): Record<Language, string> {
  const meaning = {} as Record<Language, string>;
  for (const language of LANGUAGES) meaning[language] = meaningIn(meanings[language], location, language, gaps);
  return meaning;
}

function meaningIn(meanings: Map<string, string>, location: string, language: Language, gaps: WordMeaningGap[]) {
  const value = meanings.get(location);
  if (value === undefined) gaps.push({ location, language, problem: "missing" });
  else if (!value.trim()) gaps.push({ location, language, problem: "empty" });
  return value ?? "";
}

function ayahTranslation(translations: ByLanguage, ayah: string): Record<Language, string> {
  const translation = {} as Record<Language, string>;
  for (const language of LANGUAGES) {
    const text = translations[language].get(ayah);
    if (text === undefined) throw new Error(`${SOURCES.translation[language]}: no Ayah translation for ${ayah}`);
    translation[language] = text;
  }
  return translation;
}

/** Surahs 1 to 114 with their Ayahs and Section marks, each checked against the metadata's Ayah count. */
function assembleSurahs(ayahsBySurah: Map<number, Ayah[]>, meta: Map<number, SurahSummary>, marks: SectionMarkSources): SurahText[] {
  const surahs: SurahText[] = [];
  for (let n = 1; n <= 114; n++) {
    const surah = surahWithAyahs(n, meta.get(n), ayahsBySurah.get(n) ?? []);
    surahs.push({ ...surah, sectionMarks: sectionMarksOf(marks, n, surah.ayahCount) });
  }
  const extra = [...ayahsBySurah.keys()].find((n) => n < 1 || n > 114);
  if (extra !== undefined) throw new Error(`${SOURCES.uthmani}: unexpected Surah ${extra}`);
  return surahs;
}

function surahWithAyahs(n: number, summary: SurahSummary | undefined, ayahs: Ayah[]): Omit<SurahText, "sectionMarks"> {
  if (!summary) throw new Error(`${SOURCES.surahMeta}: no entry for Surah ${n}`);
  if (ayahs.length !== summary.ayahCount) {
    throw new Error(
      `${SOURCES.surahMeta}: Surah ${n} has ${summary.ayahCount} Ayahs but ${SOURCES.uthmani} has ${ayahs.length}`,
    );
  }
  const unended = ayahs.find((a) => !a.indopakEnd);
  if (unended) throw new Error(`${SOURCES.uthmani}: no Ayah-end marker closes Ayah ${n}:${unended.number}`);
  return { ...summary, ayahs };
}

function assertTranslationsCoverEveryAyah(translations: ByLanguage, surahs: SurahText[]) {
  const ayahCount = surahs.reduce((n, s) => n + s.ayahs.length, 0);
  for (const language of LANGUAGES) {
    if (translations[language].size !== ayahCount) {
      throw new Error(
        `${SOURCES.translation[language]}: has ${translations[language].size} Ayahs but the Quran text has ${ayahCount}`,
      );
    }
  }
}

/** A Script text entry: its own Word location and a non-empty text. */
const isScriptEntry = (location: string, entry: unknown): entry is { location: string; text: string } =>
  LOCATION.test(location) &&
  isObject(entry) &&
  entry.location === location &&
  typeof entry.text === "string" &&
  entry.text !== "";

function readScriptText(name: string, json: Record<string, unknown>): ScriptText {
  const text: ScriptText = new Map();
  for (const [location, entry] of Object.entries(json)) {
    if (!isScriptEntry(location, entry)) throw new Error(`${name}: malformed entry at ${location}`);
    text.set(location, entry.text);
  }
  if (text.size === 0) throw new Error(`${name}: malformed — no Words`);
  return text;
}

function readMeanings(name: string, json: Record<string, unknown>): Map<string, string> {
  const meanings = new Map<string, string>();
  for (const [location, meaning] of Object.entries(json)) {
    if (!LOCATION.test(location) || typeof meaning !== "string") throw new Error(`${name}: malformed entry at ${location}`);
    meanings.set(location, meaning);
  }
  if (meanings.size === 0) throw new Error(`${name}: malformed — no Word meanings`);
  return meanings;
}

/** An Ayah translation source, keyed `surah:ayah`, each entry `{ t: text }`. */
function readTranslation(
  name: string,
  json: Record<string, unknown>,
  toText: (text: string) => string,
): Map<string, string> {
  const translation = new Map<string, string>();
  for (const [ayah, entry] of Object.entries(json)) translation.set(ayah, translationText(name, ayah, entry, toText));
  if (translation.size === 0) throw new Error(`${name}: malformed — no Ayah translations`);
  return translation;
}

/** One entry's Ayah translation text; throws, naming the file and Ayah, when it is malformed or empty. */
function translationText(name: string, ayah: string, entry: unknown, toText: (text: string) => string): string {
  if (!AYAH.test(ayah) || !isObject(entry) || typeof entry.t !== "string") {
    throw new Error(`${name}: malformed entry at ${ayah}`);
  }
  const text = toText(entry.t);
  if (!text) throw new Error(`${name}: empty Ayah translation at ${ayah}`);
  return text;
}

/** QUL's field name for the Ayah count. */
const QUL_AYAH_COUNT = "verses_count";

/** One Surah's entry in QUL's Surah metadata, as validated by `isQulSurah`. */
interface QulSurah {
  id: number;
  name_simple: string;
  name_arabic: string;
  revelation_place: "makkah" | "madinah";
  [QUL_AYAH_COUNT]: number;
  bismillah_pre: boolean;
}

/** What each field of a QUL Surah entry must hold. */
const QUL_SURAH_FIELDS: Record<Exclude<keyof QulSurah, "id">, (value: unknown) => boolean> = {
  name_simple: (value) => typeof value === "string",
  name_arabic: (value) => typeof value === "string",
  revelation_place: (value) => value === "makkah" || value === "madinah",
  [QUL_AYAH_COUNT]: Number.isInteger,
  bismillah_pre: (value) => typeof value === "boolean",
};

const REVELATION_PLACE = { makkah: "makki", madinah: "madani" } as const;

const isQulSurah = (entry: unknown, number: number): entry is QulSurah =>
  isObject(entry) &&
  entry.id === number &&
  Object.entries(QUL_SURAH_FIELDS).every(([field, valid]) => valid(entry[field]));

/** QUL's Surah metadata, renamed into the dataset's names at the boundary. */
function readSurahMeta(name: string, json: Record<string, unknown>): Map<number, SurahSummary> {
  const meta = new Map<number, SurahSummary>();
  for (const [id, entry] of Object.entries(json)) {
    const number = Number(id);
    if (!isQulSurah(entry, number)) throw new Error(`${name}: malformed entry for Surah ${id}`);
    meta.set(number, {
      number,
      nameArabic: entry.name_arabic,
      nameLatin: entry.name_simple,
      revelationPlace: REVELATION_PLACE[entry.revelation_place],
      ayahCount: entry[QUL_AYAH_COUNT],
      bismillah: entry.bismillah_pre,
    });
  }
  return meta;
}

/** ADR 0002: both Scripts must have exactly the same Word locations. */
function assertSameLocations(uthmani: ScriptText, indopak: ScriptText) {
  const onlyUthmani = [...uthmani.keys()].filter((l) => !indopak.has(l));
  const onlyIndopak = [...indopak.keys()].filter((l) => !uthmani.has(l));
  if (onlyUthmani.length || onlyIndopak.length) {
    const list = (ls: string[]) => `${ls.slice(0, 10).join(", ")}${ls.length > 10 ? `, … (${ls.length})` : ""}`;
    throw new Error(
      [
        `The Script texts' Word locations differ (ADR 0002):`,
        onlyUthmani.length ? `only in ${SOURCES.uthmani}: ${list(onlyUthmani)}` : "",
        onlyIndopak.length ? `only in ${SOURCES.indopak}: ${list(onlyIndopak)}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
}

/** `surahs` each with empty lists of Passages and Phrases, between its summary and its Ayahs: Neon holds them (#171). */
const withoutPassages = (surahs: SurahText[]): Surah[] =>
  surahs.map(({ ayahs, ...summary }) => ({ ...summary, passages: [], phrases: [], ayahs }));
