// The mobile app's scenarios' world (#72): the committed dataset served as
// /data/v1 on a local origin, a record of every request the app makes, and a
// device's storage the app keeps its sizes in.
//
// The origin serves the website's generated dataset as the website publishes
// it under /data/v1 (the website's features/site/published-dataset.feature and
// features/api/published-quran.feature prove each published file is its
// committed file): the Surah index, Surah files and Recitation files as
// committed before the Quran moved into Neon (#172), read from git at
// QURAN_COMMITTED, and the Root files and Juz lists as committed before they
// moved into Neon (#173), read from git at ROOTS_COMMITTED (./served/ runs the
// app against the site itself): /data/v1/surahs.json,
// /data/v1/surahs/<n>.json, /data/v1/juz.json (#193), /data/v1/roots/<n>.json,
// /data/v1/roots.json (#253, every committed Root's letters and meanings, as
// the website lists them), /data/v1/recitations/<n>.json and
// /data/v1/manifest.json. Everything else
// answers 404. Each file is served as the website serves it (publishedFile:
// its JSON), and the manifest lists each Surah and Recitation file with the
// SHA-256 of exactly those bytes, as manifestOf does. Expected values are read
// from the same committed files, so no Arabic or meaning is typed into a
// scenario.
//
// Passages and Phrases live in Neon since #171, and the dataset build writes
// each Surah file with empty lists of them and no Phrase colour, which the
// website's /data/v1 fills from Neon. The origin stands in for that: each
// Surah file it serves (and datasetSurah) carries the Passages and Phrases the
// website loads (the Passage load's input) and every Word's Phrase colour, as
// the website places and colours them, by the dataset's Phrase rules.
//
// Since #249 every Surah file the website serves carries each rootless Word's
// particle right after its Root tag, and the website serves each particle's
// file, /data/v1/particles/<n>.json, and every particle, /data/v1/particles.json
// (#255): the origin gives them as the dataset builder makes them of the
// committed sources (apps/web/features/api/built-surah.ts). A scenario can
// serve /data/v1 as it was deployed before (#255): Surah files with no
// particle, and no particle file or list.
//
// For offline Surahs (#73) a scenario can deploy a revised Surah file (its
// manifest hash changes with it), set the manifest's minAppVersion, hold a
// file's answer back while the app waits for it, and take the device offline:
// every fetch then fails as it does in airplane mode.
//
// For Allah references (#151) the origin also answers
// /api/v1/allah-references/{surah} as the website does (ADR 0028) once the
// owner's seed has run: { surah, version, locations }, each Surah's Word
// locations from the owner's committed list (apps/web/data/allah-references.json)
// in Quran order at version 1, 404 { error } for a path that names no Surah. A
// scenario can write an Admin's Allah reference revision, which moves that
// Surah one version on, and make the endpoint answer 503 { error }, as when Neon
// cannot be reached.
//
// For the Tafsir (#236) the origin also answers /api/v1/tafsir/{surah}?lang=en|ur
// as the website does once the Tafsir is loaded (ADR 0053): { surah, language,
// credit, entries }, the English entries from the website's sample in QUL's
// format (apps/web/features/api/tafsir-sample.json) and the Urdu from
// ./tafsir-sample-ur.json, read as the website's loader reads them, each with
// the website's credit line; 404 for no Surah and 400 for another Language. A
// scenario can put a Surah's entries in a Language, and make the endpoint
// answer 503, as when Neon cannot be read, or 200 with entries that are no
// Tafsir entries. The origin keeps each Tafsir path
// asked for, with its query, in `tafsirAsked`.
//
// For Accounts (#75) the origin also answers the website's Account resources
// under /api/v1 (sign-in, sign-out, deleting the Account, the settings and
// the Reading places) as ./accounts-api.ts stands them in, and a Device has a
// keychain beside its storage, and a connection that tells the app when it
// goes offline and comes back.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { checkedPhrases, indexWords, phraseColours } from "@saaliheen/dataset/phrase-rules";
import { MIN_APP_VERSION, publishedFile, publishedRecitationUrl, publishedSurahUrl, type Manifest } from "@saaliheen/dataset/published";
import type { Language, ListedParticle, Particle, Recitation, RecitedAyah, Root, Surah, SurahSummary, WordTiming } from "@saaliheen/dataset/types";
import { buildVersion, configuredOrigin } from "../src/release.ts";
import type { Connection, Keychain } from "../src/account.ts";
import { AccountsApi } from "./accounts-api.ts";
import { QuranChatApi } from "./quran-chat-api.ts";
import { tafsirEntriesOf } from "../../web/src/tafsir/qul.ts";
import { TAFSIR_CREDITS } from "../../web/src/tafsir/tafsir.ts";
import type { TafsirAnswer, TafsirEntry } from "../src/tafsir.ts";
import { BEFORE_QURAN_MOVED, BEFORE_ROOTS_MOVED, committedFiles, committedRootList } from "../../web/features/site/committed-output.ts";
import { builtParticleList, withParticles } from "../../web/features/api/built-surah.ts";
import { buildFromCommittedSources } from "../../web/features/dataset/support.ts";
import {
  openQuranAnalysis,
  type AllahReferences,
  type AyahView,
  type DeviceFiles,
  type DeviceStorage,
  type PassageTafsir,
  type QuranAnalysis,
  type RootDialog,
  type Script,
  type SurahScreen,
  type TafsirRun,
  type WordCard,
} from "../src/quran-analysis.ts";
import { ayahAtTop, startRecitation, type AyahOnScreen, type NowPlaying, type PlayingRecitation, type RecitationAudio, type SeenArea } from "../src/recitation.ts";

/** Each commit the generated files are read at, with the files under data/generated read there: the Quran's before it moved into Neon (#172), the Roots' and Juz file's before they did (#173). */
const COMMITTED: [commit: string, files: string[]][] = [
  [BEFORE_QURAN_MOVED, ["surahs.json", "surahs/", "recitations/"]],
  [BEFORE_ROOTS_MOVED, ["juz.json", "roots/"]],
];
/** The Passage load's input (#171): every Passage and Phrase the website loads into Neon and serves. */
const PASSAGE_LOAD = fileURLToPath(new URL("../../web/scripts/content/0013-load-passages-and-phrases-files.json", import.meta.url));
const OWNERS_ALLAH_REFERENCES = fileURLToPath(new URL("../../web/data/allah-references.json", import.meta.url));
/** Each Language's sample of al-Mukhtasar in QUL's format, as the origin serves it (#236). */
const TAFSIR_SAMPLES: Record<Language, string> = {
  en: fileURLToPath(new URL("../../web/features/api/tafsir-sample.json", import.meta.url)),
  ur: fileURLToPath(new URL("./tafsir-sample-ur.json", import.meta.url)),
};

/** A Word location's Ayah and Word numbers. */
const ayahAndWord = (location: string) => location.split(":").slice(1).map(Number);

/** `locations` in Quran order: `2:9:2` before `2:10:5`, `2:30:3` before `2:30:20`. */
const inQuranOrder = (locations: Iterable<string>) =>
  [...locations].sort((a, b) => {
    const [[ayahA, wordA], [ayahB, wordB]] = [ayahAndWord(a), ayahAndWord(b)];
    return ayahA - ayahB || wordA - wordB;
  });

/** The owner's list of Word locations, read once. */
let ownersList: string[] | undefined;

/** Surah `surah`'s Word locations in the owner's list, as the seed loads them, in Quran order. */
const ownersAllahReferences = (surah: number): string[] => {
  ownersList ??= JSON.parse(readFileSync(OWNERS_ALLAH_REFERENCES, "utf8")) as string[];
  return inQuranOrder(ownersList.filter((l) => l.startsWith(`${surah}:`)));
};

/** The Surah a /api/v1/allah-references path segment names, as the website reads it; undefined when it names none. */
function surahNamed(segment: string): number | undefined {
  const surah = Number(segment);
  return /^[1-9]\d{0,2}$/.test(segment) && surah <= 114 ? surah : undefined;
}

/** Each Language's sample Tafsir entries, by Surah, read as the website's loader reads QUL's file. */
function loadTafsirSamples(): Record<Language, Map<number, TafsirEntry[]>> {
  const ayahCounts = new Map(readGenerated<SurahSummary[]>("surahs.json").map((s) => [s.number, s.ayahCount]));
  const bySurah = (language: Language) => {
    const entries = tafsirEntriesOf(JSON.parse(readFileSync(TAFSIR_SAMPLES[language], "utf8")), (n) => ayahCounts.get(n) ?? 0);
    const surahs = new Map<number, TafsirEntry[]>();
    for (const { surah: n, ...entry } of entries) surahs.set(n, [...(surahs.get(n) ?? []), entry]);
    return surahs;
  };
  return { en: bySurah("en"), ur: bySurah("ur") };
}

/** Ayah `ayah` of `recitation`, as its committed file times it. */
export function recitedAyah(recitation: Recitation, ayah: number): RecitedAyah {
  const found = recitation.ayahs.find((a) => a.number === ayah);
  if (!found) throw new Error(`Surah ${recitation.surah}'s Recitation has no Ayah ${ayah}`);
  return found;
}

/** Timing `n` (from 1) of Ayah `ayah`; timing 1 is the first Word the Reciter says in it. */
export function timingOf(recitation: Recitation, ayah: number, n = 1): WordTiming {
  const timing = recitedAyah(recitation, ayah).words[n - 1];
  if (!timing) throw new Error(`Ayah ${recitation.surah}:${ayah}'s Recitation has no timing ${n}`);
  return timing;
}

/** The Word location a timing of Ayah `ayah` times. */
export const timedLocation = (recitation: Recitation, ayah: number, [word]: WordTiming) => `${recitation.surah}:${ayah}:${word}`;

/** Every generated file's text as committed, by its path under the generated dataset, read at once on first use. */
let committedTexts: Map<string, string> | undefined;

/** Read every generated file at the commit in COMMITTED that holds it, one `git cat-file --batch` a commit. */
const readCommitted = () =>
  new Map(COMMITTED.flatMap(([commit, paths]) => [...committedFiles(commit, paths.map((p) => `data/generated/${p}`))]));

/** The text of `path` under the generated dataset, as last committed; null when there is none. */
function generatedText(path: string): string | null {
  committedTexts ??= readCommitted();
  return committedTexts.get(path) ?? null;
}

/** A committed dataset file, parsed. */
const readGenerated = <T>(path: string): T => {
  const text = generatedText(path);
  if (text === null) throw new Error(`the committed dataset has no ${path}`);
  return JSON.parse(text) as T;
};

const surahFile = (n: number) => `surahs/${String(n).padStart(3, "0")}.json`;

/** A Passage as the Passage load's input gives it. */
interface LoadedPassage {
  surah_no: number;
  ayah_from: number;
  ayah_till: number;
  title_en: string;
  title_ur: string;
}

let passageLoad: { passages: LoadedPassage[]; phrases: Surah["phrases"] } | undefined;

/** The Passage load's input, read once. */
const loaded = () => (passageLoad ??= JSON.parse(readFileSync(PASSAGE_LOAD, "utf8")) as { passages: LoadedPassage[]; phrases: Surah["phrases"] });

/** Surah `n`'s Passages as the website serves them from the Passage load, in the Surah file's shape. */
const servedPassages = (n: number): Surah["passages"] =>
  loaded()
    .passages.filter((p) => p.surah_no === n)
    .map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur }));

/**
 * Surah `n` as the origin serves it: its generated file with each rootless
 * Word's particle (#249, withParticles) unless `particles` is false,
 * as before that deploy, and the Passages and
 * Phrases the website loads (Surah 57's Passage Publish and Surah 2's Phrase
 * Publishes included), its Phrases in Quran order and each Word of a covered
 * Passage its Phrase colour, as the website serves them (withPassagesAndPhrases).
 */
function servedSurah(n: number, particles = true): Surah {
  const generated = readGenerated<Surah>(surahFile(n));
  const surah = particles ? withParticles<Surah>(generated) : generated;
  surah.passages = servedPassages(n);
  const index = indexWords([surah]);
  const sorted = checkedPhrases(index, loaded().phrases.filter((p) => Number(p.first.split(":")[0]) === n));
  const colours = phraseColours(sorted, index);
  surah.phrases = sorted.map((p) => p.phrase);
  for (const word of surah.ayahs.flatMap((a) => a.words)) {
    const colour = colours.get(word.location);
    if (colour) word.phraseColour = colour;
  }
  return surah;
}

export const datasetSurahIndex = () => readGenerated<SurahSummary[]>("surahs.json");
export const datasetSurah = (n: number) => servedSurah(n);
export const datasetRoot = (id: number) => readGenerated<Root>(`roots/${id}.json`);
/** Particle `id` as /data/v1/particles/<id>.json gives it (#249): the builder's particle; undefined when no particle has that number. */
export const datasetParticle = (id: number): Particle | undefined => buildFromCommittedSources().dataset.particles.find((p) => p.id === id);
/** Every particle as /data/v1/particles.json lists it (#255). */
export const datasetParticleList = (): ListedParticle[] => builtParticleList();
/** One Juz of a Script's Juz list, as /data/v1/juz.json gives it (#193). */
export interface DatasetJuz {
  number: number;
  name: string;
  firstAyah: string;
  lastAyah: string;
}
/** The committed Juz file, both Scripts' lists. */
export const datasetJuz = () => readGenerated<Record<"uthmani" | "indopak", DatasetJuz[]>>("juz.json");

/** Every committed Root as /data/v1/roots.json lists it (#253), read once. */
let rootList: ReturnType<typeof committedRootList> | undefined;
export const datasetRootList = () => (rootList ??= committedRootList());
export const datasetRecitation = (n: number) => readGenerated<Recitation>(`recitations/${String(n).padStart(3, "0")}.json`);

/** The generated dataset's path of the committed file a /data/v1 path publishes, or null for any other path. */
function publishedPath(pathname: string): string | null {
  if (pathname === "/data/v1/surahs.json") return "surahs.json";
  if (pathname === "/data/v1/juz.json") return "juz.json";
  const surah = /^\/data\/v1\/surahs\/(\d+)\.json$/.exec(pathname);
  if (surah) return `surahs/${surah[1].padStart(3, "0")}.json`;
  const root = /^\/data\/v1\/roots\/(\d+)\.json$/.exec(pathname);
  if (root) return `roots/${root[1]}.json`;
  const recitation = /^\/data\/v1\/recitations\/(\d+)\.json$/.exec(pathname);
  if (recitation) return `recitations/${recitation[1].padStart(3, "0")}.json`;
  return null;
}

/** The SHA-256 of `body`, in hex: a manifest hash. */
const sha256 = (body: string) => createHash("sha256").update(body).digest("hex");

/** A local origin serving /data/v1, recording the path of every request it gets. */
interface DataOrigin {
  origin: string;
  /** Every request path the origin received, in order. */
  received: string[];
  /** The paths the origin answers with a server error (500), as when it is down (#114). */
  failing: Set<string>;
  /** Deploys a revised Surah `number`: from now on its /data/v1 file, and its manifest hash, are `surah`'s. */
  deploySurah(surah: Surah): void;
  /** The manifest's minAppVersion from now on (MIN_APP_VERSION until set). */
  minAppVersion: string;
  /** Whether /data/v1 is as deployed since #249: Surah files carry particles, beside the particle files and list (#255). True until a scenario serves it as before. */
  particles: boolean;
  /** Holds back the answer to `path` until the returned function is called. */
  hold(path: string): () => void;
  /** The manifest the origin serves now, parsed. */
  manifest(): Manifest;
  /** Surah `surah`'s Allah references as /api/v1/allah-references/{surah} answers them now (#151). */
  allahReferences(surah: number): AllahReferences;
  /** Writes an Admin's Allah reference revision of Surah `surah`: adds and removes Word locations, moving it one version on. */
  reviseAllahReferences(surah: number, change: { added: string[]; removed: string[] }): void;
  /** Whether /api/v1/allah-references answers 503, as when Neon cannot be reached (ADR 0028). */
  allahReferencesUnread: boolean;
  /** Surah `surah`'s Tafsir in `language` as /api/v1/tafsir/{surah}?lang= answers it now (#236). */
  tafsir(surah: number, language: Language): TafsirAnswer;
  /** Puts Surah `surah`'s Tafsir entries in `language`, in place of the sample's. */
  putTafsir(surah: number, language: Language, entries: TafsirEntry[]): void;
  /** Whether /api/v1/tafsir answers 503, as when Neon cannot be read. */
  tafsirUnread: boolean;
  /** Whether /api/v1/tafsir answers 200 with entries that are no Tafsir entries: no text, and an Ayah as words. */
  tafsirMalformed: boolean;
  /** Every /api/v1/tafsir path asked for, with its query ("/api/v1/tafsir/2?lang=en"), in order. */
  tafsirAsked: string[];
  /** The Account resources of /api/v1 (#75), on this origin. */
  accounts: AccountsApi;
  /** Quran Chat's side of /api/v1 (#81), signed in through `accounts`. */
  quranChat: QuranChatApi;
  /** Undoes every deploy, hold, minAppVersion, /data/v1 served as before particles, Allah reference revision, Tafsir put in, 503 and malformed answer a scenario set. */
  reset(): void;
  close(): Promise<void>;
}

async function serveDataOrigin(): Promise<DataOrigin> {
  // Read the Tafsir samples as the origin starts, not inside the app's first
  // Tafsir request, which gives up after 3 seconds.
  const tafsirSamples = loadTafsirSamples();
  const received: string[] = [];
  const failing = new Set<string>();
  const deployed = new Map<string, string>();
  const held = new Map<string, { answered: Promise<void>; release(): void }>();
  /** Each Surah's Allah references since a scenario revised them; every other Surah's are the seed's. */
  const revised = new Map<number, AllahReferences>();
  const allahReferences = (surah: number): AllahReferences =>
    revised.get(surah) ?? { surah, version: 1, locations: ownersAllahReferences(surah) };
  /** The status and JSON /api/v1/allah-references/{segment} answers with. */
  const allahReferencesAt = (segment: string): [number, unknown] => {
    const surah = surahNamed(segment);
    if (surah === undefined) return [404, { error: "no Surah has this number: ask for a whole number from 1 to 114" }];
    if (origin.allahReferencesUnread) return [503, { error: "the Allah references cannot be read just now: try again later" }];
    return [200, allahReferences(surah)];
  };
  /** Each Surah's Tafsir in a Language a scenario put in, by "surah:language"; every other is the sample's. */
  const putTafsir = new Map<string, TafsirEntry[]>();
  const tafsir = (surah: number, language: Language): TafsirAnswer => ({
    surah,
    language,
    credit: TAFSIR_CREDITS[language],
    entries: putTafsir.get(`${surah}:${language}`) ?? tafsirSamples[language].get(surah) ?? [],
  });
  /** The status and JSON /api/v1/tafsir/{segment}?lang={lang} answers with. */
  const tafsirAt = (segment: string, lang: string | null): [number, unknown] => {
    const surah = surahNamed(segment);
    if (surah === undefined) return [404, { error: "no Surah has this number: ask for a whole number from 1 to 114" }];
    if (lang !== "en" && lang !== "ur") return [400, { error: 'name the Language as lang: "en" or "ur"' }];
    if (origin.tafsirUnread) return [503, { error: "the Tafsir cannot be read just now: try again later" }];
    if (origin.tafsirMalformed) return [200, { ...tafsir(surah, lang), entries: [{ firstAyah: 1, lastAyah: "five" }] }];
    return [200, tafsir(surah, lang)];
  };
  /** The bytes the origin answers `pathname` with, or null for a 404. */
  const body = (pathname: string): string | null => {
    if (pathname === "/data/v1/manifest.json") return publishedFile(manifest());
    if (pathname === "/data/v1/roots.json") return publishedFile(datasetRootList());
    if (pathname === "/data/v1/particles.json") return origin.particles ? publishedFile(datasetParticleList()) : null;
    if (deployed.has(pathname)) return deployed.get(pathname)!;
    const surah = /^\/data\/v1\/surahs\/(\d+)\.json$/.exec(pathname);
    if (surah && Number(surah[1]) >= 1 && Number(surah[1]) <= 114) return publishedFile(servedSurah(Number(surah[1]), origin.particles));
    const particle = /^\/data\/v1\/particles\/([1-9]\d*)\.json$/.exec(pathname);
    if (particle) {
      const file = origin.particles ? datasetParticle(Number(particle[1])) : undefined;
      return file ? publishedFile(file) : null;
    }
    const file = publishedPath(pathname);
    const text = file && generatedText(file);
    return text ? publishedFile(JSON.parse(text)) : null;
  };
  const hashes = new Map<string, string>();
  /** The manifest hash of the file at `url`: the SHA-256 of the bytes the origin answers it with. */
  const hashOf = (url: string) => {
    if (deployed.has(url)) return sha256(deployed.get(url)!);
    const key = origin.particles ? url : `${url} before particles`;
    if (!hashes.has(key)) hashes.set(key, sha256(body(url)!));
    return hashes.get(key)!;
  };
  const numbers = (count: number) => Array.from({ length: count }, (_, k) => k + 1);
  const manifest = (): Manifest => {
    const surahs = numbers(114).map((n) => ({ number: n, url: publishedSurahUrl(n), hash: hashOf(publishedSurahUrl(n)) }));
    const recitations = numbers(114)
      .filter((n) => body(publishedRecitationUrl(n)) !== null)
      .map((n) => ({ number: n, url: publishedRecitationUrl(n), hash: hashOf(publishedRecitationUrl(n)) }));
    const datasetVersion = sha256([...surahs, ...recitations].map((f) => f.hash).join("\n"));
    return { datasetVersion, minAppVersion: origin.minAppVersion, surahs, recitations };
  };
  const accounts = new AccountsApi(() => origin.origin);
  const quranChat = new QuranChatApi(accounts);
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://origin");
    const pathname = url.pathname;
    received.push(pathname);
    if (accounts.handles(pathname)) {
      await accounts.answer(req, res, pathname);
      return;
    }
    if (quranChat.handles(pathname)) {
      await quranChat.answer(req, res, pathname, accounts.isWebsite(req.headers.authorization ?? null) ? "the website" : "the app");
      return;
    }
    if (failing.has(pathname)) {
      res.writeHead(500).end();
      return;
    }
    await held.get(pathname)?.answered;
    const asked = /^\/api\/v1\/allah-references\/([^/]+)$/.exec(pathname);
    if (asked) {
      const [status, json] = allahReferencesAt(asked[1]);
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(json));
      return;
    }
    const tafsirPath = /^\/api\/v1\/tafsir\/([^/]+)$/.exec(pathname);
    if (tafsirPath) {
      origin.tafsirAsked.push(`${pathname}${url.search}`);
      const [status, json] = tafsirAt(tafsirPath[1], url.searchParams.get("lang"));
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(json));
      return;
    }
    const answer = body(pathname);
    if (answer === null) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(answer);
  });
  // A step that reads the builder's whole dataset holds the event loop for
  // seconds; a kept-alive socket the server timed out meanwhile would be handed
  // to the app's next fetch and reset.
  server.keepAliveTimeout = 60_000;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const origin: DataOrigin = {
    origin: `http://127.0.0.1:${port}`,
    received,
    failing,
    deploySurah: (surah) => void deployed.set(publishedSurahUrl(surah.number), publishedFile(surah)),
    minAppVersion: MIN_APP_VERSION,
    particles: true,
    hold(path) {
      let release!: () => void;
      const answered = new Promise<void>((resolve) => (release = resolve));
      held.set(path, { answered, release });
      return () => {
        held.delete(path);
        release();
      };
    },
    manifest,
    allahReferences,
    reviseAllahReferences(surah, { added, removed }) {
      const { version, locations } = allahReferences(surah);
      const kept = new Set(locations);
      removed.forEach((l) => kept.delete(l));
      added.forEach((l) => kept.add(l));
      revised.set(surah, { surah, version: version + 1, locations: inQuranOrder(kept) });
    },
    allahReferencesUnread: false,
    tafsir,
    putTafsir: (surah, language, entries) => void putTafsir.set(`${surah}:${language}`, entries),
    tafsirUnread: false,
    tafsirMalformed: false,
    tafsirAsked: [],
    accounts,
    quranChat,
    reset() {
      accounts.reset();
      quranChat.reset();
      deployed.clear();
      revised.clear();
      origin.allahReferencesUnread = false;
      putTafsir.clear();
      origin.tafsirUnread = false;
      origin.tafsirMalformed = false;
      origin.tafsirAsked.length = 0;
      for (const { release } of held.values()) release();
      held.clear();
      origin.minAppVersion = MIN_APP_VERSION;
      origin.particles = true;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
  return origin;
}

/** The URL a fetch asks for. */
const urlOf = (input: RequestInfo | URL) => (input instanceof Request ? input.url : String(input));

/** One device's storage and files, kept in memory: what survives the app being closed and opened again. */
export class Device implements DeviceStorage, DeviceFiles {
  readonly items = new Map<string, string>();
  readonly files = new Map<string, string>();
  /** The device's keychain (#75), which survives the app being closed and opened again, kept apart from its storage. */
  readonly secrets = new Map<string, string>();
  readonly keychain: Keychain = {
    getItem: async (key) => this.secrets.get(key) ?? null,
    setItem: async (key, value) => void this.secrets.set(key, value),
    deleteItem: async (key) => void this.secrets.delete(key),
  };
  async getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  async read(name: string) {
    return this.files.get(name) ?? null;
  }
  async write(name: string, body: string) {
    this.files.set(name, body);
  }
}

/**
 * The app opened on `device` against `origin`, as a fresh launch, given the
 * origin as a build is given EXPO_PUBLIC_DATA_ORIGIN. Passage
 * headings and the Tafsir (#236) are switched on unless a scenario launches the
 * app as app.json ships it: the scenarios prove what the app shows once a build
 * switches them on.
 */
export const launchApp = (origin: string, device: Device, passageHeadings = true, appVersion = shippedVersion(), tafsir = true): QuranAnalysis =>
  openQuranAnalysis({ origin: configuredOrigin(origin), device, files: device, passageHeadings, appVersion, tafsir });

/** app.json's `version`: the version a build of the app ships as (#73). */
export const shippedVersion = (): string =>
  buildVersion((JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")) as { expo: { version?: string } }).expo);

/** app.json's `extra`: the app config a build ships with. */
export const shippedConfig = (): { passageHeadings?: unknown; tafsir?: unknown } =>
  (JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")) as { expo: { extra: { passageHeadings?: unknown; tafsir?: unknown } } }).expo.extra;

/** "Urdu" or "English" as a Language. */
export const languageCode = (name: string) => {
  if (name === "Urdu") return "ur" as const;
  if (name === "English") return "en" as const;
  throw new Error(`not a Language: ${name}`);
};

/** "Uthmani" or "Indo-Pak" as a Script. */
export const scriptCode = (name: string) => {
  if (name === "Uthmani") return "uthmani" as const;
  if (name === "Indo-Pak") return "indopak" as const;
  throw new Error(`not a Script: ${name}`);
};

/** "Arabic size" or "Meaning size" as a size setting. */
export const sizeSetting = (name: string) => {
  if (name === "Arabic size") return "arabicSize" as const;
  if (name === "Meaning size") return "meaningSize" as const;
  throw new Error(`not a size: ${name}`);
};

/** A Passage's Ayah range as a Passage heading shows it: "83–88", or "5" for one Ayah. */
export const ayahRange = (from: number, till: number) => (from === till ? String(from) : `${from}–${till}`);

/** The Ayahs of a Surah screen, in the order it shows them. */
export const ayahsOf = (screen: SurahScreen) => screen.items.filter((item): item is AyahView => item.kind === "ayah");

/** The Tafsir shown on `screen` (#236), each with the Ayah directly above it. */
export function tafsirOf(screen: SurahScreen): { after: number | undefined; tafsir: PassageTafsir }[] {
  return screen.items.flatMap((item, at) => {
    if (item.kind !== "tafsir") return [];
    const above = screen.items[at - 1];
    return [{ after: above?.kind === "ayah" ? above.number : undefined, tafsir: item }];
  });
}

/** The Tafsir directly after Ayah `ayah` on `screen`. */
export function tafsirAfter(screen: SurahScreen, ayah: number): PassageTafsir {
  const found = tafsirOf(screen).find((t) => t.after === ayah);
  expect(found, `a Tafsir directly after Ayah ${screen.number}:${ayah}`).toBeDefined();
  return found!.tafsir;
}

/** A Tafsir entry's runs as plain text. */
export const plainTafsir = (runs: TafsirRun[]) => runs.map((r) => r.text).join("");

/** Expects `shown` to be `answer`'s entries, their texts without the bold and italic tags, and its credit line. */
export function expectAnsweredTafsir(shown: PassageTafsir, answer: TafsirAnswer) {
  expect(shown.entries.map((e) => plainTafsir(e.runs))).toEqual(answer.entries.map((e) => e.text.replace(/<\/?(b|strong|i|em)>/g, "")));
  expect(shown.credit).toBe(answer.credit);
}

/** Every Word card of a Surah screen, Ayah by Ayah. */
/** Expects `screen` to show its Ayahs and no Tafsir at all. */
export function expectNoTafsir(screen: SurahScreen) {
  expect(ayahsOf(screen).length).toBeGreaterThan(0);
  expect(tafsirOf(screen)).toEqual([]);
}

/** Expects `screen` to show every Ayah of Surah `surah` as its served file holds them. */
export const expectEveryAyah = (screen: SurahScreen, surah: number) =>
  expect(ayahsOf(screen).map((a) => a.number)).toEqual(datasetSurah(surah).ayahs.map((a) => a.number));

export const wordCardsOf = (screen: SurahScreen) => ayahsOf(screen).flatMap((ayah) => ayah.wordCards);

/** The Word card at `location` on `screen`. */
export function wordCardAt(screen: SurahScreen, location: string): WordCard {
  const card = wordCardsOf(screen).find((c) => c.location === location);
  if (!card) throw new Error(`no Word card at ${location} on Surah ${screen.number}`);
  return card;
}

/**
 * Whether `card` is marked as an Allah reference: the Word card's
 * `allahReference` (#151), true or false, read so that a scenario fails as an
 * assertion while src/quran-analysis.ts's WordCard lacks it.
 */
export function markedAsAllahReference(card: WordCard): boolean {
  const mark = (card as unknown as { allahReference?: unknown }).allahReference;
  expect(typeof mark, `the Word card at ${card.location} says whether it is an Allah reference (#151)`).toBe("boolean");
  return mark as boolean;
}

/**
 * The Allah reference colour switch (#151), as the seam src/quran-analysis.ts
 * is to offer it beside the sizes: QuranAnalysis's allahReferenceColour(),
 * whether it is on, and setAllahReferenceColour(on), which keeps the choice on
 * the device and answers whether it is now on. Each fails as an assertion while
 * the app lacks it.
 */
export function allahReferenceColourSwitch(app: QuranAnalysis) {
  const members = app as unknown as Record<string, unknown>;
  const member = (name: string) => {
    expect(typeof members[name], `the app's Quran Analysis offers ${name}() (#151)`).toBe("function");
    return members[name] as (...args: unknown[]) => Promise<boolean>;
  };
  return {
    isOn: () => member("allahReferenceColour").call(app),
    set: (on: boolean) => member("setAllahReferenceColour").call(app, on),
  };
}

/** The lock screen's (and the notification's) controls the fake offers once the app shows its audio there. */
export type LockScreenControl = "play" | "pause";

/**
 * Android stops audio an app plays in the background after about three
 * minutes unless the app shows it on the lock screen (expo-audio's
 * shouldPlayInBackground note); the fake holds every phone to that.
 */
export const BACKGROUND_LIMIT_MS = 3 * 60 * 1000;

/**
 * The device's audio in the scenarios (#112): it plays nothing and its clock
 * does not run on its own. It records the file the app loads and where the app
 * moves it, and the scenario moves the audio on with `reach`, as playing the
 * Surah's audio would, and plays it out with `playToEnd`.
 *
 * It also models what #114's Recitation bar needs of the device's audio. The
 * members past RecitationAudio's are the seam src/recitation.ts is to drive
 * (expo-audio's player.setPlaybackRate, and its playbackStatusUpdate's
 * isBuffering and its failure to load, on a phone):
 * - setSpeed(speed): plays at `speed` × normal; loading a file plays it at normal again;
 * - onWaiting(listener): called with true while the audio waits for more of its file, false once it plays on;
 * - onFailure(listener): called once the loaded file cannot play (unreachable, or answered with an error).
 * The scenario makes the audio wait with `waitForMore` and arrive with
 * `arriveRest`, and makes the Surah's audio unreachable with `unreachable`:
 * a file loaded then fails, a moment after it is loaded, and never plays.
 *
 * It also models the phone around the audio (#113). The members past
 * RecitationAudio's are the seam src/recitation.ts is to drive (expo-audio's
 * setAudioModeAsync({ shouldPlayInBackground }), setActiveForLockScreen /
 * updateLockScreenMetadata / clearLockScreenControls, the player's `playing`
 * status, its currentTime, and React Native's AppState on a phone):
 * - keepPlayingInBackground(): the audio may play on when the app leaves the screen;
 * - showOnLockScreen(nowPlaying) / clearLockScreen(): what the lock screen and the notification show, with play and pause;
 * - onPlayPause(listener): the audio was played or paused outside the app (the lock screen, the notification);
 * - currentPosition(): where the audio is now, in ms;
 * - onReturnToApp(listener): the app is back on the screen.
 * Like a phone, the fake stops the audio when the app leaves the screen unless
 * it may play in the background, and stops it once it has played
 * BACKGROUND_LIMIT_MS in the background with nothing on the lock screen.
 */
export class FakeAudio implements RecitationAudio {
  /** The address of the loaded file, or null before the app loads one. */
  loaded: string | null = null;
  /** Every address the app loaded, in order. */
  readonly loads: string[] = [];
  position = 0;
  playing = false;
  /** How fast the audio plays, × normal. */
  speed = 1;
  /** Whether the audio is waiting for more of its file to arrive. */
  waiting = false;
  /** Whether the Surah's audio cannot be reached, as when the phone is offline (#114). */
  unreachable = false;
  /** Whether the loaded file failed to load, so it cannot play. */
  failed = false;
  private readonly progress = new Set<(ms: number) => void>();
  private readonly ended = new Set<() => void>();
  private readonly waited = new Set<(waiting: boolean) => void>();
  private readonly failures = new Set<() => void>();
  /** Whether the app let the audio play on in the background. */
  playsInBackground = false;
  /** What the lock screen and the notification show and offer; null when they show nothing of the app. */
  lockScreen: (NowPlaying & { controls: LockScreenControl[] }) | null = null;
  /** Whether the app is off the screen: the screen locked, or another app in front. */
  away = false;
  /** Where the audio was when the app left the screen. */
  private leftAt = 0;
  /** Whether the phone has stopped delivering the audio's updates to the app while it is away. */
  private suspended = false;
  private readonly playedOrPaused = new Set<(playing: boolean) => void>();
  private readonly returned = new Set<() => void>();

  load(url: string) {
    this.loaded = url;
    this.loads.push(url);
    this.position = 0;
    this.playing = false;
    this.speed = 1;
    this.waiting = false;
    this.failed = this.unreachable;
    if (this.failed) queueMicrotask(() => [...this.failures].forEach((listener) => listener()));
  }
  setSpeed(speed: number) {
    this.speed = speed;
  }
  onWaiting(listener: (waiting: boolean) => void) {
    this.waited.add(listener);
    return () => void this.waited.delete(listener);
  }
  onFailure(listener: () => void) {
    this.failures.add(listener);
    return () => void this.failures.delete(listener);
  }
  /** The audio, playing, has played all of its file that has arrived, and waits for the rest. */
  waitForMore() {
    if (!this.playing) throw new Error("the audio is not playing, so it cannot wait for more of its file");
    this.waiting = true;
    for (const listener of [...this.waited]) listener(true);
  }
  /** The rest of the file arrives, and the audio plays on. */
  arriveRest() {
    this.waiting = false;
    for (const listener of [...this.waited]) listener(false);
  }
  seekTo(ms: number) {
    this.position = ms;
  }
  play() {
    // A file that failed to load never plays.
    this.playing = !this.failed;
  }
  pause() {
    this.playing = false;
  }
  onProgress(listener: (ms: number) => void) {
    this.progress.add(listener);
    return () => void this.progress.delete(listener);
  }
  onEnd(listener: () => void) {
    this.ended.add(listener);
    return () => void this.ended.delete(listener);
  }
  keepPlayingInBackground() {
    this.playsInBackground = true;
  }
  showOnLockScreen(nowPlaying: NowPlaying) {
    this.lockScreen = { title: nowPlaying.title, artist: nowPlaying.artist, controls: ["play", "pause"] };
  }
  clearLockScreen() {
    this.lockScreen = null;
  }
  onPlayPause(listener: (playing: boolean) => void) {
    this.playedOrPaused.add(listener);
    return () => void this.playedOrPaused.delete(listener);
  }
  currentPosition() {
    return this.position;
  }
  onReturnToApp(listener: () => void) {
    this.returned.add(listener);
    return () => void this.returned.delete(listener);
  }
  /** The phone plays or pauses the audio itself, and tells the app. */
  private setPlaying(playing: boolean) {
    this.playing = playing;
    for (const listener of [...this.playedOrPaused]) listener(playing);
  }
  /** The audio, playing, reaches `ms` into its file; the phone stops it on the way if it may not play there. */
  reach(ms: number) {
    if (!this.playing) throw new Error(`the audio is not playing, so it cannot reach ${ms} ms`);
    if (this.waiting) throw new Error(`the audio is waiting for more of its file, so it cannot reach ${ms} ms`);
    if (this.away && this.lockScreen === null && ms - this.leftAt > BACKGROUND_LIMIT_MS) {
      this.position = this.leftAt + BACKGROUND_LIMIT_MS;
      this.setPlaying(false);
      return;
    }
    this.position = ms;
    if (this.suspended) return;
    for (const listener of [...this.progress]) listener(ms);
  }
  /** The audio plays on from where it is to the end of its file, `lastMs` long, and stops there. */
  playToEnd(lastMs: number) {
    this.reach(lastMs);
    this.playing = false;
    for (const listener of [...this.ended]) listener();
  }
  /** The app leaves the screen (the screen locked, or another app in front); the phone stops audio that may not play in the background. */
  leaveApp() {
    this.away = true;
    this.leftAt = this.position;
    if (this.playing && !this.playsInBackground) this.setPlaying(false);
  }
  /** While the app is away, the phone delivers it none of the audio's updates. */
  suspendUpdates() {
    if (!this.away) throw new Error("the app is on the screen");
    this.suspended = true;
  }
  /** The app comes back to the screen. */
  returnToApp() {
    this.away = false;
    this.suspended = false;
    for (const listener of [...this.returned]) listener();
  }
  /** The reader presses `control` on the lock screen or the notification. */
  pressOnLockScreen(control: LockScreenControl) {
    if (!this.lockScreen?.controls.includes(control)) throw new Error(`the lock screen offers no ${control}`);
    this.setPlaying(control === "play");
  }
}

/**
 * What a Recitation offers the screen past #112's PlayingRecitation: the seam
 * #114 specifies, which src/recitation.ts's PlayingRecitation is to grow.
 *
 * - bar, while on screen, also has: `says` ("loading" while the audio waits for
 *   more of its file, "unavailable right now" when it cannot play, else null);
 *   `offers` "try again" when it cannot play; `previousAyah` and `nextAyah`
 *   ("enabled" or "disabled": none before the Surah's first Ayah, none after its
 *   last); `speed`, the Recitation speed, and `speeds`, those it offers, slowest
 *   first.
 * - listenFrom(ayah): carries the Recitation on from the start of Ayah `ayah`.
 * - tapWord(location): carries it on from where the Reciter first says that Word.
 * - previousAyah() / nextAyah() / stop() / tryAgain(): the Recitation bar's buttons.
 * - chooseSpeed(speed): the Recitation bar's Recitation speed, kept on the device.
 * - followed: the Word location whose card the screen keeps on screen, the
 *   Recited Word while the screen follows it; null once the reader scrolls by hand.
 * - offersWayBack: whether the button back to the Recited Word is on screen.
 * - scrolledByHand() / backToRecitedWord(): the reader scrolls the screen by
 *   hand; the reader presses the button back to the Recited Word.
 */
export interface ParityBar {
  offers: "pause" | "play" | "try again";
  says: "loading" | "unavailable right now" | null;
  previousAyah: "enabled" | "disabled";
  nextAyah: "enabled" | "disabled";
  speed: number;
  speeds: readonly number[];
}

/**
 * `recitation` as #114's seam: `call(name, ...args)` presses one of its new
 * members and `read(name)` reads one, each failing as an assertion while
 * src/recitation.ts lacks it, so a scenario goes red for the missing behaviour.
 */
export function parity(recitation: PlayingRecitation) {
  const members = recitation as unknown as Record<string, unknown>;
  return {
    /** Calls the member at once; the promise settles once whatever it started (a fetch, say) has. */
    async call(name: string, ...args: unknown[]): Promise<void> {
      const member = members[name];
      expect(typeof member, `the Recitation offers ${name}() (#114)`).toBe("function");
      await (member as (...a: unknown[]) => unknown).apply(recitation, args);
    },
    read<T>(name: string): T {
      expect(name in members, `the Recitation shows its ${name} (#114)`).toBe(true);
      return members[name] as T;
    },
    get bar() {
      return recitation.bar as unknown as Partial<ParityBar> | null;
    },
  };
}

/** A launch of the app against one origin, with the devices it has run on. */
export class World {
  data!: DataOrigin;
  device = new Device();
  app!: QuranAnalysis;
  screen?: SurahScreen;
  dialog?: RootDialog;
  /** Every URL the app fetched, anywhere, while recording. */
  recording?: { urls: string[] };
  audio = new FakeAudio();
  recitation?: PlayingRecitation;

  async start() {
    this.data ??= await serveDataOrigin();
  }
  launch(device = new Device(), passageHeadings = true, appVersion = shippedVersion(), tafsir = true) {
    this.device = device;
    this.app = launchApp(this.data.origin, device, passageHeadings, appVersion, tafsir);
    this.audio = new FakeAudio();
    this.recitation = undefined;
    this.layout = undefined;
    return this.app;
  }
  /** The open Surah screen as the device lays it out: where its Ayahs are and what a reader sees of them below the Surah bar. */
  layout?: { ayahs: AyahOnScreen[]; seen: SeenArea };
  /** Presses the play control on the open Surah screen as it is laid out, which plays from the Ayah at its top, as the screen derives it. */
  async pressPlayOnScreen() {
    if (!this.layout) throw new Error("the screen was never laid out");
    const top = ayahAtTop(this.layout.ayahs, this.layout.seen);
    if (top === null) throw new Error("no Ayah is at the top of the screen");
    return this.pressPlay(top);
  }
  /** Presses the play control on the open Surah screen with Ayah `topAyah` at the top of the screen. */
  async pressPlay(topAyah: number) {
    // The screen also offers the device's storage, which keeps the Recitation
    // speed (#114), and its Surah's name, as the Surah index shows it, for the
    // lock screen (#113); src/recitation.ts may read them or not.
    const options = {
      origin: this.data.origin,
      audio: this.audio,
      surah: this.screen!.number,
      topAyah,
      device: this.device,
      surahName: this.screen!.nameLatin,
    };
    this.recitation = await startRecitation(options);
    return this.recitation;
  }
  /**
   * Presses "listen from here" beside Ayah `ayah`'s number (#114): with no
   * Recitation on (none started, or stopped), it starts one from that Ayah, as
   * the play control does from the Ayah at the top; while one is on, it moves
   * that one there.
   */
  async listenFrom(ayah: number) {
    if (this.recitation?.bar) {
      await parity(this.recitation).call("listenFrom", ayah);
      return this.recitation;
    }
    return this.pressPlay(ayah);
  }
  /** Lets the device's audio report what it does a moment after the app asks (a failure to load, say). */
  settle() {
    return new Promise<void>((resolve) => setImmediate(resolve));
  }
  /** Whether the device is in airplane mode. */
  private offline = false;
  /** The fetch globalThis had before the world wrapped it, while it is wrapped. */
  private realFetch?: typeof fetch;
  /** Wraps globalThis.fetch, once: it records each URL while recording, and fails as with no connection while offline. */
  private wrapFetch() {
    if (this.realFetch) return;
    const real = (this.realFetch = globalThis.fetch);
    globalThis.fetch = async (input, init) => {
      this.recording?.urls.push(urlOf(input));
      if (this.offline) throw new TypeError(`Network request failed: no connection for ${urlOf(input)}`);
      return real(input, init);
    };
  }
  /** A fetch for another device, such as the website (#75): never recorded, and never failing in this phone's airplane mode. */
  readonly otherDeviceFetch: typeof fetch = (input, init) => (this.realFetch ?? globalThis.fetch)(input, init);
  /** Whoever listens for the connection going and coming back (#75). */
  private readonly listeners = new Set<(online: boolean) => void>();
  /** The device's connection, as expo-network tells the app of it. */
  readonly connection: Connection = {
    subscribe: (listener) => {
      this.listeners.add(listener);
      return () => void this.listeners.delete(listener);
    },
  };
  /** Airplane mode on: every fetch fails, as with no connection, and no request leaves the device. */
  goOffline() {
    this.offline = true;
    this.wrapFetch();
    for (const listener of this.listeners) listener(false);
  }
  /** Airplane mode off: the connection comes back, and the device says so. */
  goOnline() {
    const wasOffline = this.offline;
    this.offline = false;
    if (wasOffline) for (const listener of this.listeners) listener(true);
  }
  /** Forgets every connection listener, as when the app is closed. */
  forgetListeners() {
    this.listeners.clear();
  }
  record() {
    this.data.received.length = 0;
    this.recording = { urls: [] };
    this.wrapFetch();
  }
  stopRecording() {
    this.recording = undefined;
  }
  async close() {
    this.stopRecording();
    this.goOnline();
    if (this.realFetch) globalThis.fetch = this.realFetch;
    this.realFetch = undefined;
    await this.data?.close();
  }
}

/** One row of the Read screen's Juz tab (#193): its number, its name in the reader's Script, its first and last Ayah ("36:28") and where it runs, as the row says it. */
export interface JuzRow {
  number: number;
  name: string;
  firstAyah: string;
  lastAyah: string;
  runs: string;
}

/** What the Read screen's one search box finds (#193): the Surahs and the Juz it lists, by number, and what it says when it finds nothing. */
export interface IndexSearch {
  surahs: number[];
  juz: number[];
  nothingFound: string | null;
}

/** The Read screen's index (#193): the Juz tab in a Script and the search over both tabs. */
export interface ReadIndex {
  juzIndex(script: Script): Promise<JuzRow[]>;
  search(query: string, script: Script): Promise<IndexSearch>;
}

/**
 * The Surahs and Juz index the app offers (#193), looked up loosely on the
 * opened app so the scenarios compile before it exists and fail on these
 * assertions instead.
 */
export function readIndex(app: QuranAnalysis): ReadIndex {
  const offered = app as unknown as Record<string, unknown>;
  const method = (name: string) => {
    expect(typeof offered[name], `the app offers ${name}`).toBe("function");
    return (offered[name] as (...args: unknown[]) => Promise<unknown>).bind(app);
  };
  return {
    juzIndex: (script) => method("juzIndex")(script) as Promise<JuzRow[]>,
    search: (query, script) => method("searchIndex")(query, script) as Promise<IndexSearch>,
  };
}
