// What a Root looks like to a user (#5), read from the committed sources:
// QUL's word root (#76) and word lemma (#75) databases, `roots.json`, and the
// QPC Hafs, Digital Khatt and Word meaning sources (through ../support). The
// Root dialog's expected Lemmas, Spellings, meanings and Word locations follow
// the rules the dataset features specify (features/dataset/root-*.feature);
// nothing here is typed from memory or read from the generated dataset.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { expect, type Locator, type Page } from "@playwright/test";
import { indopakText, sourceWord, type Language } from "../support";
import type { Reading } from "./fixtures";
import type { Script } from "./reader";

const DATA = path.join(__dirname, "..", "..", "..", "data");

/** The slice of `node:sqlite` these steps use (Node >= 22.5; the repo's @types/node predates it). */
interface Database {
  prepare(sql: string): { all(): unknown[] };
  close(): void;
}
const { DatabaseSync } = createRequire(__filename)("node:sqlite") as {
  DatabaseSync: new (file: string, options: { readOnly: boolean }) => Database;
};

interface QulRoot {
  id: number;
  letters: string;
  wordsCount: number;
  uniqueWords: number;
}

let qul: { roots: Map<number, QulRoot>; rootOf: Map<string, number>; lemmaOf: Map<string, number>; lemmaText: Map<number, string> } | undefined;

/** The Arabic alphabet, in order. */
export const ALPHABET = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];

/** Two Roots in Arabic letter order: letter by letter, a shorter Root before a longer one it begins. */
export function inArabicOrder(a: string, b: string): number {
  const [x, y] = [a, b].map((letters) => letters.split(" ").map((l) => ALPHABET.indexOf(l)));
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/** QUL's word root and word lemma databases, read once. */
export function qulAnalysis() {
  if (qul) return qul;
  const open = (name: string) => new DatabaseSync(path.join(DATA, "qul", name), { readOnly: true });
  const rootDb = open("word-root.db");
  const lemmaDb = open("word-lemma.db");
  type Row = Record<string, string | number>;
  const rows = (db: Database, table: string) => db.prepare(`SELECT * FROM ${table}`).all() as Row[];
  const roots = new Map(
    rows(rootDb, "roots").map((r) => [
      Number(r.id),
      {
        id: Number(r.id),
        // QUL writes some Root letters with runs of spaces; a Root is shown single-spaced.
        letters: String(r.arabic_trilateral).trim().split(/\s+/).join(" "),
        wordsCount: Number(r.words_count),
        uniqueWords: Number(r.uniq_words_count),
      },
    ]),
  );
  const rootOf = new Map(rows(rootDb, "root_words").map((r) => [String(r.word_location), Number(r.root_id)]));
  const lemmaOf = new Map(rows(lemmaDb, "lemma_words").map((r) => [String(r.word_location), Number(r.lemma_id)]));
  const lemmaText = new Map(rows(lemmaDb, "lemmas").map((r) => [Number(r.id), String(r.text)]));
  rootDb.close();
  lemmaDb.close();
  return (qul = { roots, rootOf, lemmaOf, lemmaText });
}

/** The Root QUL gives a Word location, or null for a particle or pronoun. */
export function rootAt(location: string): QulRoot | null {
  const { roots, rootOf } = qulAnalysis();
  const id = rootOf.get(location);
  return id === undefined ? null : roots.get(id)!;
}

/** The Word locations QUL gives Root `id`. */
export const qulLocationsOf = (id: number) =>
  [...qulAnalysis().rootOf].filter(([, root]) => root === id).map(([location]) => location);

export function qulRootNamed(letters: string): QulRoot {
  const root = [...qulAnalysis().roots.values()].find((r) => r.letters === letters);
  if (!root) throw new Error(`QUL's word root database has no Root ${letters}`);
  return root;
}

interface RootsJsonEntry {
  word: string;
  urdu: string;
  english: string;
  locations: string[];
}
let rootsJson: Record<string, RootsJsonEntry[]> | undefined;
const readRootsJson = (): Record<string, RootsJsonEntry[]> =>
  (rootsJson ??= JSON.parse(fs.readFileSync(path.join(DATA, "roots.json"), "utf8")));

let rootsJsonEntries: Map<string, RootsJsonEntry> | undefined;

/** roots.json's entry listing a Word location, if any. */
function rootsJsonEntryAt(location: string): RootsJsonEntry | undefined {
  if (!rootsJsonEntries) {
    rootsJsonEntries = new Map();
    for (const entries of Object.values(readRootsJson())) {
      for (const entry of entries) for (const l of entry.locations) if (!rootsJsonEntries.has(l)) rootsJsonEntries.set(l, entry);
    }
  }
  return rootsJsonEntries.get(location);
}

/** Every Urdu and English meaning roots.json files under a Root's letters (as roots.json writes them). */
export function rootsJsonMeanings(letters: string): string[] {
  return (readRootsJson()[letters] ?? []).flatMap((e) => [e.urdu, e.english]);
}

// ---------------------------------------------------------------- a Root as its dialog shows it

export interface ExpectedSpelling {
  uthmani: string;
  indopak: string;
  meaning: Record<Language, string>;
  locations: string[];
}
export interface ExpectedLemma {
  text: string | null;
  meaning: Record<Language, string>;
  spellings: ExpectedSpelling[];
  occurrences: number;
}
export interface ExpectedRoot extends QulRoot {
  lemmas: ExpectedLemma[];
}

export const compareLocations = (a: string, b: string) => {
  const [x, y] = [a, b].map((l) => l.split(":").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};
export const withoutPauseMarks = (text: string) => text.replace(/[ۖ-ۜ۞۩]/g, "");
/** Most Word locations first, ties by the earlier first Word location. */
export const byOccurrences = <T extends { locations: string[] }>(a: T, b: T) =>
  b.locations.length - a.locations.length || compareLocations(a.locations[0], b.locations[0]);

export const spellingMeaning = (location: string): Record<Language, string> => {
  const entry = rootsJsonEntryAt(location);
  return entry ? { ur: entry.urdu, en: entry.english } : sourceWord(location).meaning;
};

/**
 * A Root as the dialog should show it: QUL's letters and counts; its Word
 * locations grouped under QUL's Lemmas (those with none under one Lemma with
 * no text), most frequent first; each Lemma's Spellings grouped by Uthmani
 * text with pause marks set aside, most frequent first, with both Scripts'
 * text and the meaning at the first Word location (roots.json, else QUL's
 * Word meaning); a Lemma's meaning is its most frequent Spelling's.
 */
export function expectedRoot(letters: string): ExpectedRoot {
  let root = expectedRoots.get(letters);
  if (!root) expectedRoots.set(letters, (root = buildExpectedRoot(letters)));
  return root;
}
const expectedRoots = new Map<string, ExpectedRoot>();

/** The Root of the dialog last opened, as the sources give it. */
export function openedRoot(reading: Reading): ExpectedRoot {
  if (!reading.root) throw new Error("no Root tag opened yet in this scenario");
  return expectedRoot(reading.root);
}

function buildExpectedRoot(letters: string): ExpectedRoot {
  const root = qulRootNamed(letters);
  const { lemmaOf, lemmaText } = qulAnalysis();
  const locations = qulLocationsOf(root.id).sort(compareLocations);
  const byLemma = new Map<number | null, string[]>();
  for (const l of locations) {
    const lemma = lemmaOf.get(l) ?? null;
    byLemma.set(lemma, [...(byLemma.get(lemma) ?? []), l]);
  }
  const lemmas = [...byLemma]
    .map(([id, locs]) => {
      const bySpelling = new Map<string, string[]>();
      for (const l of locs) {
        const text = withoutPauseMarks(sourceWord(l).uthmani);
        bySpelling.set(text, [...(bySpelling.get(text) ?? []), l]);
      }
      const spellings = [...bySpelling.values()]
        .map((ls) => ({
          uthmani: sourceWord(ls[0]).uthmani,
          indopak: indopakText(ls[0]),
          meaning: spellingMeaning(ls[0]),
          locations: ls,
        }))
        .sort(byOccurrences);
      return { locations: locs, text: id === null ? null : lemmaText.get(id)!, spellings };
    })
    .sort(byOccurrences)
    .map(({ locations: locs, text, spellings }) => ({ text, spellings, occurrences: locs.length, meaning: spellings[0].meaning }));
  return { ...root, lemmas };
}

// ---------------------------------------------------------------- the page

/** Whether a Root tag (or a Particle tag) shows ↗: in its text or drawn by CSS before or after any part of it. */
export const showsArrow = (tag: Locator) =>
  tag.evaluate((el) =>
    [el, ...Array.from(el.querySelectorAll("*"))].some((node) =>
      [node.textContent ?? "", getComputedStyle(node, "::before").content, getComputedStyle(node, "::after").content].some((s) =>
        s.includes("↗"),
      ),
    ),
  );

/** The Script the page shows now (data-script on <html>). */
export const scriptShown = async (page: Page): Promise<Script> =>
  (await page.locator("html").getAttribute("data-script")) === "indopak" ? "indopak" : "uthmani";

/** The Root dialog: the one dialog on the page (the Particle dialog's too). */
export const rootDialog = (page: Page) => page.getByRole("dialog");

/** A Word card's Root tag: the button in the card whose accessible name holds the Root's letters. */
export const rootTag = (card: Locator, letters: string) => card.getByRole("button", { name: letters });

/** The Root dialog's list of Lemma rows, holding every Word location link and none of its head's (#289). */
export const lemmaList = (dialog: Locator) => dialog.getByRole("list", { name: "Lemmas", exact: true });

/** A Root page's address in `lang`, as a reader reads it: the Root's letters without their spaces (ADR 0065). */
export const rootPagePath = (lang: Language, letters: string) => `/${lang}/roots/${letters.replaceAll(" ", "")}`;

/** The Root dialog's Lemma rows: its disclosure buttons (those with aria-expanded), in order. */
export const lemmaRows = (dialog: Locator) => dialog.locator("button[aria-expanded]");

/** The Spellings a Lemma row discloses: the element its aria-controls names. */
export async function lemmaPanel(page: Page, row: Locator): Promise<Locator> {
  const id = await row.getAttribute("aria-controls");
  expect(id, "a Lemma row names the Spellings it discloses with aria-controls").toBeTruthy();
  return page.locator(`[id="${id}"]`);
}

/** The text a Script shows for a Spelling. */
export const spellingText = (s: ExpectedSpelling, script: Script) => (script === "uthmani" ? s.uthmani : s.indopak);

/** `needles` appear in `haystack` in this order, each after the one before; fails naming the first missing. */
export function inOrder(haystack: string, needles: string[], what: string): void {
  let at = 0;
  for (const n of needles) {
    const i = haystack.indexOf(n, at);
    expect(i, `${what}: "${n}" after position ${at}`).toBeGreaterThanOrEqual(0);
    at = i + n.length;
  }
}
