// Quran Analysis as the mobile app reads it (#72): everything the app's
// screens show, read from the versioned dataset (/data/v1) on the app's
// origin, and the Arabic size and Meaning size this device keeps. The screens
// (React Native) only lay this out; this module imports nothing from React
// Native or Expo, so the app's scenarios (features/) run it in Node.
//
// Every request goes to the app's origin under /data/v1 (ADR 0008; its URLs and
// shapes kept for the app by ADR 0020), and the
// origin comes from the app's config, never from this module. Sizes stay in
// the given DeviceStorage and are never sent anywhere.
//
// Offline Surahs (#73, ADR 0025): a Surah downloads the first time a reader
// opens it, is kept in the given DeviceFiles under its /data/v1 path, beside
// the SHA-256 of its bytes, and opens from there with no connection. The
// Surah index is kept the same way, so it lists every Surah offline and gives
// a Surah's skeleton while the Surah downloads. When online, checkForUpdates
// compares /data/v1/manifest.json's hashes with the kept Surahs' and downloads
// again only those that changed, and says whether this app's version is below
// the manifest's minAppVersion.
//
// Allah references (#151, ADR 0034): opening a Surah also asks
// /api/v1/allah-references/{surah} (ADR 0028) and marks the Word cards at the
// Word locations it answers. The answer is kept in DeviceFiles beside the
// Surah, written again only when its version differs from the kept one; with
// no connection, a 503, or no answer within 3 seconds, the kept answer marks
// the Words, and nothing is ever kept as "none". The Allah reference colour
// switch is kept in DeviceStorage under the website's key, never sent anywhere.
// So is the Hide Word meanings switch (#247), off unless kept on; which Word
// meanings a Surah screen reveals is ./word-meanings.ts's.
//
// The Tafsir (#236, ADR 0053): while the build's release switch is on,
// opening a Surah also asks /api/v1/tafsir/{surah}?lang= (#233) for its Tafsir
// in the Language, and each Passage's Tafsir follows its last Ayah (./tafsir.ts).
// The answer is kept in DeviceFiles beside the Surah, one file per Language
// (#238, ADR 0055), written again only when it is not the kept one. With no
// connection, any answer but 200, an answer that is no Tafsir, or none within
// 3 seconds, the kept Tafsir in that Language shows, else none: a missing or
// unreadable file never stops a Surah opening, and nothing is kept as "none".
// checkForUpdates asks again for every Tafsir kept, so a reloaded Tafsir
// reaches a kept Surah the reader has not opened since.
//
// Particles offline (#255, ADR 0062): a Word card with no Root carries its
// particle's Particle tag, and the Particle dialog reads
// /data/v1/particles/<number>.json. Whenever a Surah is kept (downloaded the
// first time, or again for a changed hash) the particle file of every particle
// its Words name is kept beside it, and then a note of the Surah hash they were
// kept for, so the Particle dialogs open with no connection. checkForUpdates
// keeps them for each kept Surah whose note is not its hash: a Surah an app
// before this release kept, or one whose particle files did not all download.
// A Surah kept before its file carried particles shows no Particle tag; the
// deploy that adds them changes its hash, so it is downloaded again. Every
// particle, /data/v1/particles.json, is kept as the Root list is, for the
// Known words page's Particles tab.
//
// Section marks (#194, ADR 0020): a Surah's screen marks the reader's chosen
// division, Hizb quarters (where every reader starts) or Rukus, from the
// Surah file's sectionMarks, each directly above its Ayah and above any
// Passage heading there. The choice is kept in DeviceStorage under the
// website's key and value, never sent anywhere and never synced.

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Manifest } from "@saaliheen/dataset/published";
import type {
  JuzLists,
  Language,
  ListedParticle,
  ListedRoot,
  Particle,
  ParticleKind,
  ParticleTag,
  Root,
  Script,
  SectionMark,
  Surah,
  SurahSummary,
} from "@saaliheen/dataset/types";
import { compareRootLetters } from "@saaliheen/known-words";
import { LANGUAGES, written } from "@saaliheen/passages";
import type { ListedParticleIn, ListedRootIn } from "./known-words";
import { juzIndex, searchIndex, type IndexSearch, type JuzIndexEntry } from "./surah-index";
import { isTafsirAnswer, tafsirByAyah, type PassageTafsir, type TafsirAnswer } from "./tafsir";

export type { Language, Script };
export type { PassageTafsir, TafsirEntryView, TafsirRun } from "./tafsir";

/** Where the app keeps downloaded files on this device (its document directory on a phone): text files by name (#73). */
export interface DeviceFiles {
  /** The file `name`'s text, or null when the device has no such file. */
  read(name: string): Promise<string | null>;
  write(name: string, body: string): Promise<void>;
}

/** What stays on this device (AsyncStorage on a phone): string values by key. */
export interface DeviceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface QuranAnalysisOptions {
  /** The origin the app reads `/data/v1` (and later `/api/v1`) from, e.g. https://saaliheen.com. */
  origin: string;
  /** This device's storage. */
  device: DeviceStorage;
  /** The Passage headings release switch (src/release.ts): when off or left out, a Surah shows no Passage heading. */
  passageHeadings?: boolean;
  /** The Tafsir release switch (src/release.ts, #236): when off or left out, a Surah shows no Tafsir and the app never asks for it. */
  tafsir?: boolean;
  /** Where downloaded Surahs, and the Surah index, are kept (#73). */
  files: DeviceFiles;
  /** This app's version, app.json's `version` (#73), compared with the manifest's minAppVersion. */
  appVersion: string;
}

/** What a Surah's screen shows while the Surah downloads (#73): a skeleton of its Ayahs, one placeholder per Ayah. */
export interface SurahSkeleton {
  number: number;
  nameArabic: string;
  nameLatin: string;
  /** The Ayah numbers whose placeholders show, 1 to the Surah's Ayah count. */
  ayahs: number[];
}

/** What checking the manifest found (#73). */
export interface UpdateCheck {
  /** Whether the app shows its update prompt: its version is below the manifest's minAppVersion. */
  updatePrompt: boolean;
}

/** Opening a Surah that is not on the device while there is no connection (#73): `message` is what the screen says, in the Language. */
export class SurahNotDownloaded extends Error {
  constructor(
    readonly surah: number,
    message: string,
  ) {
    super(message);
    this.name = "SurahNotDownloaded";
  }
}

/** One row of the Surah index. */
export type SurahIndexEntry = Pick<SurahSummary, "number" | "nameArabic" | "nameLatin" | "revelationPlace" | "ayahCount">;

/** How a Surah is opened: in which Script and Language, with the Ayah translation on or off. */
export interface SurahOptions {
  script: Script;
  language: Language;
  ayahTranslation: boolean;
}

/** A Word card's Particle tag (#255): its particle as the Surah file names it (its kind and text are what a Known particle is kept by), and its text in the chosen Script. */
export interface ParticleTagView extends ParticleTag {
  arabic: string;
}

/** A Word card: its Arabic in the chosen Script, its Word meaning in the Language and its Root tag, or its Particle tag when it has no Root. */
export interface WordCard {
  /** Identifies the card (and a Root dialog's links); never shown on it. */
  location: string;
  arabic: string;
  meaning: string;
  root: { id: number; letters: string } | null;
  /** Null when the Word has a Root, or its Surah was kept before its file carried particles (#255). */
  particle: ParticleTagView | null;
  /** Whether the Word is an Allah reference (#151): its Arabic is shown in Allah reference colour while the switch is on. */
  allahReference: boolean;
}

export interface PassageHeading {
  kind: "passage-heading";
  /** The Passage title in the Language. */
  title: string;
  /** "83–88", or one number for a one-Ayah Passage. */
  range: string;
}

export interface AyahView {
  kind: "ayah";
  number: number;
  wordCards: WordCard[];
  /** The Ayah translation in the Language, or null while the Ayah translation is off. */
  translation: string | null;
}

/** Which Section marks a Surah's screen shows (#194): Hizb quarters ("hizb", where every reader starts) or Rukus ("ruku"). */
export type SectionMarksChoice = "hizb" | "ruku";

/** A Section mark (#194): its medallion sign, ۞ for a Hizb quarter and ع for a Ruku, and its label ("¼ Hizb 56", "Ruku 2 of 2 · 3 Ayahs"). */
export interface SectionMarkView {
  kind: "section-mark";
  sign: "۞" | "ع";
  label: string;
}

/** A Surah as its screen shows it, top to bottom: each chosen Section mark above its Ayah, over each Passage heading (while switched on) above its first Ayah, and each Passage's Tafsir (while switched on) after its last. */
export interface SurahScreen {
  number: number;
  nameArabic: string;
  nameLatin: string;
  items: (SectionMarkView | PassageHeading | AyahView | PassageTafsir)[];
}

export interface RootDialogSpelling {
  /** The Spelling in the chosen Script only. */
  text: string;
  meaning: string;
  /** Its Word locations in Quran order. */
  locations: string[];
}

export interface RootDialogLemma {
  /** The Lemma, or null for the Root's Word locations QUL gives no Lemma. */
  text: string | null;
  occurrences: number;
  /** The Lemma's representative meaning in the Language. */
  meaning: string;
  /** Most frequent first. */
  spellings: RootDialogSpelling[];
  /** Whether the dialog opens with its Spellings shown: only the tapped Word's Lemma (#323). */
  openAtFirst: boolean;
}

/** Where a Root or Particle dialog marks the tapped Word (#323, #326): its Spelling's index in a list of Spellings, and its Word location. */
export interface SpellingMark {
  spelling: number;
  location: string;
}

/** Where a Root dialog marks the tapped Word (#323): its Lemma's index in `lemmas`, and its Spelling's in that Lemma's `spellings`. */
export interface RootDialogMark extends SpellingMark {
  lemma: number;
}

export interface RootDialog {
  letters: string;
  transliteration: string;
  occurrences: number;
  uniqueWords: number;
  /** Most frequent first. */
  lemmas: RootDialogLemma[];
  /** The tapped Word (#323); null when no Word was named, or the Root's file does not hold its Word location. */
  marked: RootDialogMark | null;
}

/** A particle file as its Particle dialog shows it (#255): the particle in the chosen Script, its count, and its Spellings as a Root dialog's are. */
export interface ParticleDialog {
  id: number;
  kind: ParticleKind;
  text: string;
  arabic: string;
  occurrences: number;
  /** Most frequent first. */
  spellings: RootDialogSpelling[];
  /** The tapped Word (#326); null when no Word was named, or the particle's file does not hold its Word location. */
  marked: SpellingMark | null;
}

/** Arabic size and Meaning size, in percent. */
export interface Sizes {
  arabicSize: number;
  meaningSize: number;
}

export type SizeSetting = keyof Sizes;

/** A Surah as a Share page reads it (#76): its whole file, and whether its Passage titles show. */
export interface SharedSurah {
  surah: Surah;
  passageTitles: boolean;
}

export interface QuranAnalysis {
  surahIndex(): Promise<SurahIndexEntry[]>;
  /** The Juz tab's rows in `script` (#193): /data/v1/juz.json's Juz of that Script, each saying where it runs; kept for offline like the Surah index. */
  juzIndex(script: Script, surahs?: Promise<SurahIndexEntry[]>): Promise<JuzIndexEntry[]>;
  /** What the Read screen's one search box finds on the Surahs and Juz tabs, the Juz in `script` (#193). */
  searchIndex(query: string, script: Script): Promise<IndexSearch>;
  /**
   * Surah `number`'s screen: from the device when it is kept there, else
   * downloaded and kept (#73). Rejects with SurahNotDownloaded when it is not
   * on the device and there is no connection.
   */
  surah(number: number, options: SurahOptions): Promise<SurahScreen>;
  /** What Surah `number`'s screen shows while it downloads (#73). */
  surahSkeleton(number: number): Promise<SurahSkeleton>;
  /**
   * Surah `number` as a Share page reads it (#76): its file, from the device
   * or downloaded and kept as `surah` reads it, and whether this build shows
   * Passage titles. Rejects as `surah` does.
   */
  sharedSurah(number: number, language: Language): Promise<SharedSurah>;
  /**
   * Reads /data/v1/manifest.json, when online, at launch and when the
   * connection comes back (#73): downloads again each kept Surah whose hash
   * changed, and only those, keeps the particle files a kept Surah lacks
   * (#255), asks again for each Tafsir kept while the
   * Tafsir is switched on (#238), and says whether to show the update prompt.
   * With no connection it changes nothing and shows no prompt.
   */
  checkForUpdates(): Promise<UpdateCheck>;
  /** Root `rootId`'s dialog, opened on the tapped Word at Word location `word` when one is named (#323). */
  rootDialog(rootId: number, options: { script: Script; language: Language; word?: string }): Promise<RootDialog>;
  /** Particle `id`'s dialog (#255): its file downloaded and kept, or with no connection the kept file; opened on the tapped Word at Word location `word` when one is named (#326). */
  particleDialog(id: number, options: { script: Script; language: Language; word?: string }): Promise<ParticleDialog>;
  sizes(): Promise<Sizes>;
  /** One step larger or smaller; at either end the size stays. */
  changeSize(setting: SizeSetting, direction: "larger" | "smaller"): Promise<Sizes>;
  /** Whether Larger or Smaller can still change `setting`. */
  canChangeSize(setting: SizeSetting, direction: "larger" | "smaller"): Promise<boolean>;
  resetSizes(): Promise<Sizes>;
  /** Whether the Allah reference colour switch is on (#151): on unless this device kept it off. */
  allahReferenceColour(): Promise<boolean>;
  /** Keeps the Allah reference colour switch on or off on this device, and answers whether it is now on. */
  setAllahReferenceColour(on: boolean): Promise<boolean>;
  /** Whether the Known words colour switch is on (#253): off unless this device kept it on. */
  knownWordsColour(): Promise<boolean>;
  /** Keeps the Known words colour switch on or off on this device, and answers whether it is now on. */
  setKnownWordsColour(on: boolean): Promise<boolean>;
  /** Every Root, in Arabic letter order, with its Lemmas' meanings in `language` (#253): /data/v1/roots.json, kept for when there is no connection. */
  rootList(language: Language): Promise<ListedRootIn[]>;
  /** Every particle, most frequent first, with its Spellings' meanings in `language` (#255): /data/v1/particles.json, kept for when there is no connection. */
  particleList(language: Language): Promise<ListedParticleIn[]>;
  /** Whether the Hide Word meanings switch is on (#247): off unless this device kept it on. */
  hideWordMeanings(): Promise<boolean>;
  /** Keeps the Hide Word meanings switch on or off on this device, and answers whether it is now on. */
  setHideWordMeanings(on: boolean): Promise<boolean>;
  /** Which Section marks a Surah's screen shows (#194): Hizb quarters unless this device kept Rukus. */
  sectionMarks(): Promise<SectionMarksChoice>;
  /** Keeps the Section marks choice on this device, and answers the choice now kept. */
  setSectionMarks(choice: SectionMarksChoice): Promise<SectionMarksChoice>;
}

/** The steps of Arabic size and Meaning size, in percent, as on the website. */
export const SIZES = [85, 100, 115, 130, 150] as const;
/** The size a device starts at, and what a missing or unknown saved size reads as. */
export const DEFAULT_SIZE = 100;
/** Where each size is kept on the device: the website's own storage keys. */
const STORED_AS: Record<SizeSetting, string> = { arabicSize: "qwt-arabic-size", meaningSize: "qwt-meaning-size" };

/** Where the Allah reference colour switch is kept (#151): the website's key, "off" or "on"; anything but "off" reads as on. */
const ALLAH_REFERENCE_COLOUR = "qwt-allah-reference-colour";

/** Where the Known words colour switch is kept (#253): "on" or "off"; anything but "on" reads as off. */
const KNOWN_WORDS_COLOUR = "qwt-known-words-colour";

/** Where the Hide Word meanings switch is kept (#247): the website's key, "on" or "off"; anything but "on" reads as off. */
const HIDE_WORD_MEANINGS = "qwt-hide-word-meanings";

/** Where the Section marks choice is kept (#194): the website's key, "hizb" or "ruku"; anything but "ruku" reads as Hizb quarters. */
const SECTION_MARKS = "qwt-section-marks";
/** A kept Section marks value as a choice, by the website's rule. */
const parseSectionMarks = (value: string | null): SectionMarksChoice => (value === "ruku" ? "ruku" : "hizb");
/** Each choice's medallion sign. */
const MARK_SIGN: Record<SectionMarksChoice, SectionMarkView["sign"]> = { hizb: "۞", ruku: "ع" };

/** The chosen Section marks of `surah` by the Ayah each stands above. */
function marksByAyah(surah: Surah, choice: SectionMarksChoice): Map<number, SectionMarkView> {
  const marks: SectionMark[] = choice === "ruku" ? surah.sectionMarks.rukus : surah.sectionMarks.hizbQuarters;
  return new Map(marks.map(({ ayah, label }) => [ayah, { kind: "section-mark", sign: MARK_SIGN[choice], label }]));
}

/** A saved size as a step; anything else reads as the default. */
const parseSize = (value: string | null): number => SIZES.find((s) => String(s) === value) ?? DEFAULT_SIZE;

/** The step one `direction` from `size`, or `size` itself at that end. */
function stepFrom(size: number, direction: "larger" | "smaller"): number {
  const next = SIZES.indexOf(size as (typeof SIZES)[number]) + (direction === "larger" ? 1 : -1);
  return SIZES[Math.min(Math.max(next, 0), SIZES.length - 1)];
}

/** A /data/v1 file the device could not ask for: there is no connection (#73). */
class NoConnection extends Error {
  constructor(path: string, cause: unknown) {
    super(`/data/v1/${path}: no connection`, { cause });
    this.name = "NoConnection";
  }
}

/** The text of the /data/v1 file at `path` on `origin`; rejects with NoConnection when the request cannot be made. */
async function download(origin: string, path: string): Promise<string> {
  const response = await fetch(`${origin}/data/v1/${path}`).catch((cause: unknown) => {
    throw new NoConnection(path, cause);
  });
  if (!response.ok) throw new Error(`/data/v1/${path} answered ${response.status}`);
  return response.text();
}

/** A /data/v1 file on `origin`, parsed. */
const readPublished = async <T>(origin: string, path: string): Promise<T> => JSON.parse(await download(origin, path)) as T;

/** Where Surah `number`'s file is under /data/v1, and where the device keeps it. */
const surahPath = (number: number) => `surahs/${number}.json`;
const INDEX_PATH = "surahs.json";
/** Every Root's letters and meanings (#253), kept beside the Surah index. */
const ROOT_LIST_PATH = "roots.json";
/** Every particle (#255), kept beside the Root list. */
const PARTICLE_LIST_PATH = "particles.json";
/** Where particle `id`'s file is under /data/v1, and where the device keeps it (#255). */
const particlePath = (id: number) => `particles/${id}.json`;
/** How many particle files are downloaded at once while a Surah is kept. */
const PARTICLE_DOWNLOADS = 6;
/** Where the device notes the hash of Surah `number`'s file whose particle files it keeps (#255). */
const particlesKeptPath = (number: number) => `${surahPath(number)}.particles`;
/** Each Script's Juz list (#193), kept beside the Surah index. */
const JUZ_PATH = "juz.json";
/** Where the device keeps the hash of the file it keeps at `path`. */
const hashPath = (path: string) => `${path}.sha256`;
/** The SHA-256 of `body`'s UTF-8 bytes, in hex: what the manifest lists for a file of those bytes. */
const contentHash = (body: string) => bytesToHex(sha256(utf8ToBytes(body)));

/** The /data/v1 files this device keeps (#73): each under its path, with the hash of its bytes beside it. */
function keptFiles(origin: string, files: DeviceFiles) {
  /** Downloads the file at `path` and keeps it, replacing any copy kept before. */
  const keep = async (path: string) => {
    const body = await download(origin, path);
    await files.write(path, body);
    await files.write(hashPath(path), contentHash(body));
    return body;
  };
  return {
    keep,
    /** The kept copy of `path`, else a download of it, kept from then on. */
    keptOrDownloaded: async (path: string) => (await files.read(path)) ?? keep(path),
    /** A fresh download of `path`, kept; with no connection, the kept copy, if there is one. */
    async downloadedOrKept(path: string) {
      try {
        return await keep(path);
      } catch (error) {
        const kept = error instanceof NoConnection ? await files.read(path) : null;
        if (kept === null) throw error;
        return kept;
      }
    },
    /** The hash of the copy of `path` this device keeps, or null when it keeps none. */
    hashOf: (path: string) => files.read(hashPath(path)),
  };
}

/** A Surah's Allah references as GET /api/v1/allah-references/{surah} answers them (ADR 0028). */
export interface AllahReferences {
  surah: number;
  version: number;
  /** Word locations in Quran order. */
  locations: string[];
}

/** Where the device keeps Surah `number`'s Allah references (#151, ADR 0034): the endpoint's last answer, beside the Surah. */
const allahReferencesPath = (number: number) => `allah-references/${number}.json`;

/**
 * How long opening a Surah waits for its Allah references (ADR 0034) and its
 * Tafsir (#236): a kept Surah opens from its file (ADR 0025), so a network
 * that hangs must not hold it back for longer than this; the kept answers mark
 * the Words and give the Tafsir instead (ADR 0055).
 */
const API_WAIT_MS = 3000;

/** The answer to `path` under /api/v1 on `origin`, or null when it cannot be read now: no connection, no answer within API_WAIT_MS, any answer but 200, or one `is`, when given, does not take for a T. */
async function askApi<T>(origin: string, path: string, is?: (answer: unknown) => answer is T): Promise<T | null> {
  const giveUp = new AbortController();
  const timer = setTimeout(() => giveUp.abort(), API_WAIT_MS);
  try {
    const response = await fetch(`${origin}/api/v1/${path}`, { signal: giveUp.signal });
    if (!response.ok) return null;
    const answer: unknown = await response.json();
    return !is || is(answer) ? (answer as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Surah `number`'s Allah references as Word locations (#151): the endpoint's
 * answer, kept when its version differs from the kept one; when it cannot be
 * read, the kept answer, else none (and nothing is kept).
 */
async function allahReferencesOf(origin: string, files: DeviceFiles, number: number): Promise<Set<string>> {
  const path = allahReferencesPath(number);
  const [answer, kept] = await Promise.all([askApi<AllahReferences>(origin, `allah-references/${number}`), keptAllahReferences(files, path)]);
  if (answer && answer.version !== kept?.version) await files.write(path, JSON.stringify(answer));
  return new Set((answer ?? kept)?.locations);
}

/** The Allah references this device keeps at `path`, or null when it keeps none, or keeps a file it cannot read (the next answer replaces it). */
async function keptAllahReferences(files: DeviceFiles, path: string): Promise<AllahReferences | null> {
  const body = await files.read(path);
  try {
    return body === null ? null : (JSON.parse(body) as AllahReferences);
  } catch {
    return null;
  }
}

/** Where the device keeps Surah `number`'s Tafsir in `language` (#238, ADR 0055): the endpoint's last answer in that Language, beside the Surah. */
const tafsirPath = (number: number, language: Language) => `tafsir/${language}/${number}.json`;

/** `body`, a kept Tafsir file, as a Tafsir, or null when there is none, or it is no Tafsir (a file cut short, say; the next answer replaces it). */
function keptTafsir(body: string | null): TafsirAnswer | null {
  try {
    const tafsir: unknown = body === null ? null : JSON.parse(body);
    return isTafsirAnswer(tafsir) ? tafsir : null;
  } catch {
    return null;
  }
}

/** The kept Tafsir file of Surah `number` in `language`, or null when there is none or it cannot be read (it counts as none kept). */
const readKeptTafsir = (files: DeviceFiles, number: number, language: Language) => files.read(tafsirPath(number, language)).catch(() => null);

/** Surah `number`'s Tafsir in `language` as the endpoint answers it now, or null when it cannot be read. */
const askTafsir = (origin: string, number: number, language: Language) => askApi(origin, `tafsir/${number}?lang=${language}`, isTafsirAnswer);

/** Keeps `answer` as Surah `number`'s Tafsir in `language` when it is not, byte for byte, the `kept` file; a file that cannot be written leaves it unkept. */
async function keepTafsir(files: DeviceFiles, number: number, language: Language, answer: TafsirAnswer | null, kept: string | null) {
  const body = answer && JSON.stringify(answer);
  if (body && body !== kept) await files.write(tafsirPath(number, language), body).catch(() => undefined);
}

/** Surah `number`'s Tafsir in `language` (#236, #238): the endpoint's answer, kept; when it cannot be read, the kept answer, else none. */
async function surahTafsir(origin: string, files: DeviceFiles, number: number, language: Language): Promise<TafsirAnswer | null> {
  const [answer, kept] = await Promise.all([askTafsir(origin, number, language), readKeptTafsir(files, number, language)]);
  await keepTafsir(files, number, language, answer, kept);
  return answer ?? keptTafsir(kept);
}

/** Asks again for every Tafsir this device keeps, each Surah's in each Language it keeps (#238): a reloaded Tafsir reaches a kept Surah not opened since. */
const refreshKeptTafsir = (origin: string, files: DeviceFiles, manifest: Manifest) =>
  Promise.all(
    manifest.surahs.flatMap(({ number }) =>
      LANGUAGES.map(async (language) => {
        const kept = await readKeptTafsir(files, number, language);
        if (kept !== null) await keepTafsir(files, number, language, await askTafsir(origin, number, language), kept);
      }),
    ),
  );

/** A version's numeric parts: "1.10.0" is [1, 10, 0]. */
const versionParts = (version: string) => version.split(".").map(Number);

/** Whether `version` is below `minimum`, compared numerically part by part, a missing part being 0 (#73). */
export function isBelowVersion(version: string, minimum: string): boolean {
  const [have, need] = [versionParts(version), versionParts(minimum)];
  for (let k = 0; k < Math.max(have.length, need.length); k++) {
    const difference = (have[k] ?? 0) - (need[k] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}

/** `n` in Urdu's digits: 18 is ۱۸. */
const urduDigits = (n: number) => String(n).replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));

/** What a Surah's screen says when Surah `number` is not on the device and there is no connection, in `language`. */
const NOT_DOWNLOADED: Record<Language, (number: number) => string> = {
  en: (n) => `Surah ${n} is not downloaded yet. Connect to the internet to download it; after that it opens without a connection.`,
  ur: (n) => `سورۃ ${urduDigits(n)} ابھی ڈاؤن لوڈ نہیں ہوئی۔ اسے ڈاؤن لوڈ کرنے کے لیے انٹرنیٹ سے جڑیں؛ اس کے بعد یہ کنکشن کے بغیر بھی کھلے گی۔`,
};

/** Surah `number`'s skeleton from the Surah index (#73): its names over one placeholder per Ayah. */
function surahSkeleton(index: SurahSummary[], number: number): SurahSkeleton {
  const entry = index.find((s) => s.number === number);
  if (!entry) throw new Error(`Surah ${number} is not in the Surah index`);
  const { nameArabic, nameLatin, ayahCount } = entry;
  return { number, nameArabic, nameLatin, ayahs: Array.from({ length: ayahCount }, (_, k) => k + 1) };
}

/** What a Surah's screen shows beside its Ayahs: whether Passage headings show, its Allah references, the Section marks chosen and its Tafsir in the Language, if any. */
interface SurahMarkings {
  passageHeadings: boolean;
  allahReferences: Set<string>;
  sectionMarks: SectionMarksChoice;
  tafsir: TafsirAnswer | null;
}

/** A Surah file as its screen shows it in one Script and Language: each chosen Section mark above its Ayah, over each Passage heading above its first Ayah, when shown, and each Passage's Tafsir after its last. */
function surahScreen(surah: Surah, { script, language, ayahTranslation }: SurahOptions, { passageHeadings, allahReferences, sectionMarks, tafsir }: SurahMarkings): SurahScreen {
  const tafsirAfter = tafsir ? tafsirByAyah(surah, tafsir) : new Map<number, PassageTafsir>();
  const startingAt = new Map(passageHeadings ? surah.passages.map((p) => [p.from, p]) : []);
  const marks = marksByAyah(surah, sectionMarks);
  const items = surah.ayahs.flatMap((ayah): SurahScreen["items"] => {
    const passage = startingAt.get(ayah.number);
    const mark = marks.get(ayah.number);
    const view: AyahView = {
      kind: "ayah",
      number: ayah.number,
      wordCards: ayah.words.map((w) => ({
        location: w.location,
        arabic: w[script],
        meaning: w.meaning[language],
        root: w.root,
        particle: w.particle ? { ...w.particle, arabic: inScript(w.particle, script) } : null,
        allahReference: allahReferences.has(w.location),
      })),
      translation: ayahTranslation ? ayah.translation[language] : null,
    };
    const heading: PassageHeading[] = passage ? [{ kind: "passage-heading", title: passage[language], range: written(passage) }] : [];
    const after = tafsirAfter.get(ayah.number);
    return [...(mark ? [mark] : []), ...heading, view, ...(after ? [after] : [])];
  });
  return { number: surah.number, nameArabic: surah.nameArabic, nameLatin: surah.nameLatin, items };
}

/** A particle's text in `script`: its Uthmani text, or its Indo-Pak. */
export const inScript = (particle: { text: string; indopak: string }, script: Script) => (script === "indopak" ? particle.indopak : particle.text);

/** A Spelling as a Root or Particle dialog lists it: in the chosen Script only, its meaning in the Language. */
const spellingIn =
  (script: Script, language: Language) =>
  (s: { uthmani: string; indopak: string; meaning: Record<Language, string>; locations: string[] }): RootDialogSpelling => ({
    text: s[script],
    meaning: s.meaning[language],
    locations: s.locations,
  });

/** A particle file as its Particle dialog shows it: the particle and its Spellings in the chosen Script only, meanings in the Language, opened on the Word at `word`. */
function particleDialog(particle: Particle, { script, language, word }: { script: Script; language: Language; word?: string }): ParticleDialog {
  const { id, kind, text, occurrences, spellings } = particle;
  return {
    id,
    kind,
    text,
    arabic: inScript(particle, script),
    occurrences,
    spellings: spellings.map(spellingIn(script, language)),
    marked: spellingMarkOf(spellings, word),
  };
}

/** The particles Surah file `body` names, each once. */
const particlesOf = (body: string) =>
  new Set((JSON.parse(body) as Surah).ayahs.flatMap((ayah) => ayah.words.flatMap((w) => (w.particle ? [w.particle.id] : []))));

/** Which of `spellings` holds Word location `word`, if a Word was named and one does. */
function spellingMarkOf(spellings: { locations: string[] }[], word: string | undefined): SpellingMark | null {
  if (!word) return null;
  const spelling = spellings.findIndex((s) => s.locations.includes(word));
  return spelling >= 0 ? { spelling, location: word } : null;
}

/** Where Root file `root` holds Word location `word`: a Word location sits under one Spelling of one Lemma, or of the Words with no Lemma. */
function markOf(root: Root, word: string | undefined): RootDialogMark | null {
  for (const [lemma, { spellings }] of root.lemmas.entries()) {
    const mark = spellingMarkOf(spellings, word);
    if (mark) return { lemma, ...mark };
  }
  return null;
}

/** A Root file as its Root dialog shows it: Spellings in the chosen Script only, meanings in the Language, opened on the Word at `word`. */
function rootDialog(root: Root, { script, language, word }: { script: Script; language: Language; word?: string }): RootDialog {
  const marked = markOf(root, word);
  return {
    letters: root.letters,
    transliteration: root.transliteration,
    occurrences: root.occurrences,
    uniqueWords: root.uniqueWords,
    lemmas: root.lemmas.map((lemma, i) => ({
      text: lemma.text,
      occurrences: lemma.occurrences,
      meaning: lemma.meaning[language],
      spellings: lemma.spellings.map(spellingIn(script, language)),
      openAtFirst: i === marked?.lemma,
    })),
    marked,
  };
}

/** The app's Quran Analysis on `origin`, keeping its sizes in `device` and its downloaded Surahs in `files`. */
export function openQuranAnalysis({ origin, device, files, appVersion, passageHeadings = false, tafsir = false }: QuranAnalysisOptions): QuranAnalysis {
  const sizes = async (): Promise<Sizes> => {
    const [arabicSize, meaningSize] = await Promise.all([device.getItem(STORED_AS.arabicSize), device.getItem(STORED_AS.meaningSize)]);
    return { arabicSize: parseSize(arabicSize), meaningSize: parseSize(meaningSize) };
  };
  const allahReferenceColour = async () => (await device.getItem(ALLAH_REFERENCE_COLOUR)) !== "off";
  const hideWordMeanings = async () => (await device.getItem(HIDE_WORD_MEANINGS)) === "on";
  const knownWordsColour = async () => (await device.getItem(KNOWN_WORDS_COLOUR)) === "on";
  const sectionMarks = async () => parseSectionMarks(await device.getItem(SECTION_MARKS));
  const save = async (setting: SizeSetting, size: number) => device.setItem(STORED_AS[setting], String(size));
  const kept = keptFiles(origin, files);
  /**
   * Keeps the particle file of each particle Surah `number`'s kept `body`
   * names, then notes the Surah's hash beside it (#255); a particle file that
   * cannot be had now leaves the note unwritten, for the next update check.
   * One already kept is downloaded again only when `fresh`, for a changed hash.
   */
  const keepParticles = async (number: number, body: string, fresh: boolean) => {
    const keep = fresh ? kept.keep : kept.keptOrDownloaded;
    const hash = await kept.hashOf(surahPath(number));
    const ids = [...particlesOf(body)];
    let failed = false;
    // A few at a time: Surah 2 names over a hundred particles.
    const next = async (): Promise<void> => {
      const id = ids.shift();
      if (id === undefined) return;
      await keep(particlePath(id)).catch(() => void (failed = true));
      return next();
    };
    await Promise.all(Array.from({ length: PARTICLE_DOWNLOADS }, next));
    if (hash !== null && !failed) await files.write(particlesKeptPath(number), hash);
  };
  /** Downloads Surah `number` and keeps it, with its particle files, downloaded again when `fresh`. */
  const keepSurah = async (number: number, fresh: boolean) => {
    const body = await kept.keep(surahPath(number));
    await keepParticles(number, body, fresh);
    return body;
  };
  /** Downloads again each kept Surah whose hash in `manifest` is not the kept copy's, and only those; keeps the particle files of every other kept Surah that lacks them. */
  const refreshChanged = (manifest: Manifest) =>
    Promise.all(
      manifest.surahs.map(async ({ number, hash }) => {
        const keptHash = await kept.hashOf(surahPath(number));
        if (keptHash === null) return;
        if (keptHash !== hash) await keepSurah(number, true);
        else if ((await files.read(particlesKeptPath(number))) !== keptHash) {
          const body = await files.read(surahPath(number));
          if (body !== null) await keepParticles(number, body, false);
        }
      }),
    );

  const surahIndex = async (): Promise<SurahIndexEntry[]> =>
    (JSON.parse(await kept.downloadedOrKept(INDEX_PATH)) as SurahSummary[]).map(({ number, nameArabic, nameLatin, revelationPlace, ayahCount }) => ({
      number,
      nameArabic,
      nameLatin,
      revelationPlace,
      ayahCount,
    }));
  /** Surah `number`'s file, kept or downloaded; SurahNotDownloaded, in `language`, when neither can be had. */
  const surahFile = async (number: number, language: Language) =>
    (await files.read(surahPath(number))) ??
    keepSurah(number, false).catch((error: unknown) => {
      if (error instanceof NoConnection) throw new SurahNotDownloaded(number, NOT_DOWNLOADED[language](number));
      throw error;
    });
  const juzOf = async (script: Script) => (JSON.parse(await kept.downloadedOrKept(JUZ_PATH)) as JuzLists)[script];

  return {
    surahIndex,
    juzIndex: async (script, surahs = surahIndex()) => juzIndex(...(await Promise.all([juzOf(script), surahs]))),
    searchIndex: async (query, script) => {
      const [surahs, juz] = await Promise.all([surahIndex(), juzOf(script)]);
      return searchIndex(query, surahs, juz);
    },
    async surah(number, options) {
      const [body, allahReferences, marks, answer] = await Promise.all([
        surahFile(number, options.language),
        allahReferencesOf(origin, files, number),
        sectionMarks(),
        tafsir ? surahTafsir(origin, files, number, options.language) : null,
      ]);
      return surahScreen(JSON.parse(body) as Surah, options, { passageHeadings, allahReferences, sectionMarks: marks, tafsir: answer });
    },
    sharedSurah: async (number, language) => ({ surah: JSON.parse(await surahFile(number, language)) as Surah, passageTitles: passageHeadings }),
    surahSkeleton: async (number) => surahSkeleton(JSON.parse(await kept.keptOrDownloaded(INDEX_PATH)) as SurahSummary[], number),
    async checkForUpdates() {
      const manifest = await readPublished<Manifest>(origin, "manifest.json").catch((error: unknown) => {
        if (error instanceof NoConnection) return null;
        throw error;
      });
      if (manifest === null) return { updatePrompt: false };
      await Promise.all([refreshChanged(manifest), tafsir ? refreshKeptTafsir(origin, files, manifest) : null]);
      return { updatePrompt: isBelowVersion(appVersion, manifest.minAppVersion) };
    },
    rootDialog: async (rootId, options) => rootDialog(await readPublished<Root>(origin, `roots/${rootId}.json`), options),
    particleDialog: async (id, options) => particleDialog(JSON.parse(await kept.downloadedOrKept(particlePath(id))) as Particle, options),
    sizes,
    async changeSize(setting, direction) {
      await save(setting, stepFrom((await sizes())[setting], direction));
      return sizes();
    },
    async canChangeSize(setting, direction) {
      const size = (await sizes())[setting];
      return stepFrom(size, direction) !== size;
    },
    async resetSizes() {
      await Promise.all([save("arabicSize", DEFAULT_SIZE), save("meaningSize", DEFAULT_SIZE)]);
      return sizes();
    },
    allahReferenceColour,
    async setAllahReferenceColour(on) {
      await device.setItem(ALLAH_REFERENCE_COLOUR, on ? "on" : "off");
      return allahReferenceColour();
    },
    knownWordsColour,
    async setKnownWordsColour(on) {
      await device.setItem(KNOWN_WORDS_COLOUR, on ? "on" : "off");
      return knownWordsColour();
    },
    rootList: async (language) =>
      (JSON.parse(await kept.downloadedOrKept(ROOT_LIST_PATH)) as ListedRoot[])
        .map(({ letters, meanings }) => ({ letters, meanings: meanings[language] }))
        .sort((a, b) => compareRootLetters(a.letters, b.letters)),
    particleList: async (language) =>
      (JSON.parse(await kept.downloadedOrKept(PARTICLE_LIST_PATH)) as ListedParticle[]).map(({ kind, text, indopak, meanings }) => ({
        kind,
        text,
        indopak,
        meanings: meanings[language],
      })),
    hideWordMeanings,
    async setHideWordMeanings(on) {
      await device.setItem(HIDE_WORD_MEANINGS, on ? "on" : "off");
      return hideWordMeanings();
    },
    sectionMarks,
    async setSectionMarks(choice) {
      await device.setItem(SECTION_MARKS, choice);
      return sectionMarks();
    },
  };
}
