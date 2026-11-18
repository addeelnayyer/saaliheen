// Seam 1 for #5: shared by the Root features' steps. It reads QUL's word root
// (#76) and word lemma (#75) databases and `roots.json` directly, so expected
// Roots, Lemmas, counts and meanings come from the sources, never typed.
//
// The shapes below are the Root dataset this issue specifies (the builder's
// types follow them): every Word carries its Root tag, the dataset carries
// every Root, and the report carries the Root disagreements.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { expect } from "vitest";
import type { BuildResult, Language, Word } from "@saaliheen/dataset";
import { DATA } from "./support";

/** A Word's Root as its card shows it: QUL's Root id (its file name) and its spaced letters. */
export interface RootTag {
  id: number;
  letters: string;
}

export interface Spelling {
  /** Both Scripts' text at the Spelling's first Word location, verbatim. */
  uthmani: string;
  indopak: string;
  /** roots.json's meaning at the first Word location, else QUL's Word meaning there. */
  meaning: Record<Language, string>;
  /** In Quran order; the Spelling's occurrence count is their number. */
  locations: string[];
}

export interface Lemma {
  /** QUL's Lemma id and text; both null for the Root's Word locations QUL gives no Lemma. */
  id: number | null;
  text: string | null;
  occurrences: number;
  /** The representative meaning: the meaning of the Lemma's most frequent (first) Spelling. */
  meaning: Record<Language, string>;
  spellings: Spelling[];
}

export interface Root {
  /** QUL's Root id. */
  id: number;
  /** QUL's Arabic letters, single-spaced (e.g. ر ح م). */
  letters: string;
  /** QUL's Buckwalter letters transliterated, hyphen-joined (e.g. r-ḥ-m). */
  transliteration: string;
  /** How many Word locations QUL gives the Root. */
  occurrences: number;
  /** QUL's unique Word count for the Root. */
  uniqueWords: number;
  lemmas: Lemma[];
}

/** A Word location whose Root differs between QUL and roots.json, or that only one of them gives a Root. */
export interface RootDisagreement {
  location: string;
  /** QUL's Root letters, single-spaced; null when QUL gives none. */
  qul: string | null;
  /** roots.json's Root letters as written there; null when roots.json lists no Root there. */
  rootsJson: string | null;
}

// ---- The dataset under test -------------------------------------------------

export function rootsOf(result: BuildResult): Root[] {
  const roots = (result.dataset as { roots?: Root[] }).roots;
  expect(roots, "the dataset has no Roots (dataset.roots)").toBeDefined();
  return roots!;
}

export function rootNamed(result: BuildResult, letters: string): Root {
  const root = rootsOf(result).find((r) => r.letters === letters);
  expect(root, `the dataset has no Root ${letters}`).toBeDefined();
  return root!;
}

export function rootTagOf(word: Word): RootTag | null {
  const tag = (word as { root?: RootTag | null }).root;
  expect(tag, `the Word at ${word.location} has no root field (null when it has no Root)`).not.toBeUndefined();
  return tag!;
}

export function rootDisagreementsOf(result: BuildResult): RootDisagreement[] {
  const list = (result.report as { rootDisagreements?: RootDisagreement[] }).rootDisagreements;
  expect(list, "the report has no Root disagreements (report.rootDisagreements)").toBeDefined();
  return list!;
}

export const locationsOf = (root: Root) => root.lemmas.flatMap((l) => l.spellings.flatMap((s) => s.locations));

// ---- The sources ------------------------------------------------------------

/** QUL writes some Root letters with runs of spaces; the dataset single-spaces them. */
export const singleSpaced = (letters: string) => letters.trim().split(/\s+/).join(" ");

interface QulRoot {
  id: number;
  letters: string;
  buckwalter: string;
  wordsCount: number;
  uniqueWords: number;
}

/** The slice of `node:sqlite` these steps use (Node >= 22.5; the repo's @types/node predates it). */
interface Database {
  prepare(sql: string): { all(): unknown[] };
  close(): void;
}
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (file: string, options: { readOnly: boolean }) => Database;
};
const openDb = (name: string) => new DatabaseSync(path.join(DATA, "qul", name), { readOnly: true });

let qul:
  | { roots: Map<number, QulRoot>; rootOf: Map<string, number>; lemmaOf: Map<string, number>; lemmaText: Map<number, string> }
  | undefined;

/** QUL's word root and word lemma databases, read once. */
export function qulAnalysis() {
  if (qul) return qul;
  const rootDb = openDb("word-root.db");
  const lemmaDb = openDb("word-lemma.db");
  type Row = Record<string, string | number>;
  const roots = new Map(
    (rootDb.prepare("SELECT * FROM roots").all() as Row[]).map((r) => [
      Number(r.id),
      {
        id: Number(r.id),
        letters: singleSpaced(String(r.arabic_trilateral)),
        buckwalter: String(r.english_trilateral),
        wordsCount: Number(r.words_count),
        uniqueWords: Number(r.uniq_words_count),
      },
    ]),
  );
  const rootOf = new Map(
    (rootDb.prepare("SELECT * FROM root_words").all() as Row[]).map((r) => [String(r.word_location), Number(r.root_id)]),
  );
  const lemmaOf = new Map(
    (lemmaDb.prepare("SELECT * FROM lemma_words").all() as Row[]).map((r) => [String(r.word_location), Number(r.lemma_id)]),
  );
  const lemmaText = new Map((lemmaDb.prepare("SELECT * FROM lemmas").all() as Row[]).map((r) => [Number(r.id), String(r.text)]));
  rootDb.close();
  lemmaDb.close();
  return (qul = { roots, rootOf, lemmaOf, lemmaText });
}

export function qulRootNamed(letters: string): QulRoot {
  const root = [...qulAnalysis().roots.values()].find((r) => r.letters === letters);
  expect(root, `QUL's word root database has no Root ${letters}`).toBeDefined();
  return root!;
}

let locationsByRoot: Map<number, string[]> | undefined;

/** The Word locations QUL gives Root `id`, from an index built once. */
export function qulLocationsOf(id: number): string[] {
  if (!locationsByRoot) {
    locationsByRoot = new Map();
    for (const [location, root] of qulAnalysis().rootOf) {
      locationsByRoot.set(root, [...(locationsByRoot.get(root) ?? []), location]);
    }
  }
  return [...(locationsByRoot.get(id) ?? [])];
}

interface RootsJsonEntry {
  word: string;
  urdu: string;
  english: string;
  count: number;
  locations: string[];
}

let rootsJson: { rootAt: Map<string, string>; entryAt: Map<string, RootsJsonEntry> } | undefined;

/** `roots.json`, indexed by Word location: the Root it files that location under, and the entry listing it. */
export function rootsJsonByLocation() {
  if (rootsJson) return rootsJson;
  const json = JSON.parse(fs.readFileSync(path.join(DATA, "roots.json"), "utf8")) as Record<string, RootsJsonEntry[]>;
  const rootAt = new Map<string, string>();
  const entryAt = new Map<string, RootsJsonEntry>();
  for (const [letters, entries] of Object.entries(json)) {
    for (const entry of entries) {
      for (const location of entry.locations) {
        rootAt.set(location, letters);
        entryAt.set(location, entry);
      }
    }
  }
  return (rootsJson = { rootAt, entryAt });
}

// ---- Rules this issue specifies ---------------------------------------------

/** Quran order of Word locations. */
export function compareLocations(a: string, b: string): number {
  const [x, y] = [a, b].map((l) => l.split(":").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

/**
 * The Quranic pause, rub-el-hizb and sajdah marks QPC Hafs writes onto a Word
 * (U+06D6–U+06DC, U+06DE, U+06E9). They are not part of its Spelling, so two
 * Word locations whose text differs only by them share one Spelling.
 */
export const withoutPauseMarks = (text: string) => text.replace(/[ۖ-ۜ۞۩]/g, "");

/** Root letters compared with every hamza (أ إ آ ء ؤ ئ) read as ا: QUL writes a hamza Root letter as ا, roots.json as the hamza itself. */
export const hamzaFolded = (letters: string) => letters.replace(/[أإآءؤئ]/g, "ا");

/**
 * How each Buckwalter letter QUL's `english_trilateral` uses is transliterated
 * (ALA-LC style, matching the issue's `r-ḥ-m`); a Root's parts are joined by
 * hyphens, so `sh` (ش) never reads as `s` + `h`.
 */
export const TRANSLITERATION: Record<string, string> = {
  A: "ʾ", b: "b", t: "t", v: "th", j: "j", H: "ḥ", x: "kh", d: "d", "*": "dh", r: "r", z: "z", s: "s",
  $: "sh", S: "ṣ", D: "ḍ", T: "ṭ", Z: "ẓ", E: "ʿ", g: "gh", f: "f", q: "q", k: "k", l: "l", m: "m",
  n: "n", h: "h", w: "w", y: "y",
};
