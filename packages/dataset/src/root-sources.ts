// The dataset builder's Root sources (ADR 0003): QUL's word root (#76) and
// word lemma (#75) SQLite databases, which own every Root, Lemma and count,
// and `roots.json`, which supplies only Spelling meanings and is compared with
// QUL for the disagreement report. Each is read once into a typed shape; every
// failure names the file.

import path from "node:path";
import { createRequire } from "node:module";
import { isObject, readJsonObject } from "./source-json.ts";

export const ROOT_SOURCES = {
  roots: "word-root.db",
  lemmas: "word-lemma.db",
  rootsJson: "roots.json",
};

/** One Root as QUL's word root database gives it. */
interface QulRoot {
  id: number;
  /** Single-spaced Arabic letters. */
  letters: string;
  /** Buckwalter letters, one character per Root letter. */
  buckwalter: string;
  uniqueWords: number;
}

/** One roots.json entry: a Spelling's meaning and the Word locations it lists. */
export interface RootsJsonEntry {
  urdu: string;
  english: string;
  locations: string[];
}

export interface RootSources {
  /** QUL's Roots by id. */
  roots: Map<number, QulRoot>;
  /** QUL's Root id at each Word location that has one. */
  rootOf: Map<string, number>;
  /** QUL's Lemma id at each Word location that has one. */
  lemmaOf: Map<string, number>;
  /** QUL's Lemma text by Lemma id. */
  lemmaText: Map<number, string>;
  /** At each Word location roots.json lists: the Root letters it files it under (as written there) and the entry listing it. */
  rootsJsonAt: Map<string, RootsJsonAt>;
}

interface RootsJsonAt {
  letters: string;
  entry: RootsJsonEntry;
}

/** QUL writes some Root letters with runs of spaces; the dataset single-spaces them. */
const singleSpaced = (letters: string) => letters.trim().split(/\s+/).join(" ");

/** Read the Root sources: the two databases from `qulDir`, `roots.json` from `dataDir`. */
export function readRootSources(qulDir: string, dataDir: string): RootSources {
  const rootDb = queryAll(qulDir, ROOT_SOURCES.roots, ["SELECT * FROM roots", "SELECT * FROM root_words"]);
  const lemmaDb = queryAll(qulDir, ROOT_SOURCES.lemmas, ["SELECT * FROM lemma_words", "SELECT * FROM lemmas"]);
  return {
    roots: new Map(rootDb[0].map((row) => [Number(row.id), qulRoot(row)])),
    rootOf: wordIndex(rootDb[1], "root_id"),
    lemmaOf: wordIndex(lemmaDb[0], "lemma_id"),
    lemmaText: new Map(lemmaDb[1].map((row) => [Number(row.id), String(row.text)])),
    rootsJsonAt: readRootsJson(dataDir),
  };
}

type Row = Record<string, unknown>;

/** The slice of `node:sqlite` the builder uses (Node >= 22.5; the repo's @types/node predates it). */
interface Database {
  prepare(sql: string): { all(): Row[] };
  close(): void;
}
type DatabaseSync = new (file: string, options: { readOnly: boolean }) => Database;
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: DatabaseSync };

/** Every row each of `queries` returns from the database `dir/name`, which is opened read-only and closed. */
function queryAll(dir: string, name: string, queries: string[]): Row[][] {
  let db: Database | undefined;
  try {
    db = new DatabaseSync(path.join(dir, name), { readOnly: true });
    return queries.map((sql) => db!.prepare(sql).all());
  } catch (error) {
    throw new Error(`${name}: missing or unreadable (${(error as Error).message})`, { cause: error });
  } finally {
    db?.close();
  }
}

const qulRoot = (row: Row): QulRoot => ({
  id: Number(row.id),
  letters: singleSpaced(String(row.arabic_trilateral)),
  buckwalter: String(row.english_trilateral),
  uniqueWords: Number(row.uniq_words_count),
});

/** Word location → the id in `column`, from a `*_words` table. */
const wordIndex = (rows: Row[], column: string) =>
  new Map(rows.map((row) => [String(row.word_location), Number(row[column])]));

const isRootsJsonEntry = (entry: unknown): entry is RootsJsonEntry =>
  isObject(entry) &&
  typeof entry.urdu === "string" &&
  typeof entry.english === "string" &&
  Array.isArray(entry.locations);

/** roots.json indexed by Word location: the Root it files each location under, and the entry listing it. */
function readRootsJson(dataDir: string): Map<string, RootsJsonAt> {
  const at = new Map<string, RootsJsonAt>();
  for (const [letters, entries] of Object.entries(readJsonObject(dataDir, ROOT_SOURCES.rootsJson))) {
    for (const entry of rootsJsonEntries(letters, entries)) {
      for (const location of entry.locations) at.set(location, { letters, entry });
    }
  }
  return at;
}

/** One Root's roots.json entries; throws, naming the file and Root, when they are malformed. */
function rootsJsonEntries(letters: string, entries: unknown): RootsJsonEntry[] {
  if (!Array.isArray(entries) || !entries.every(isRootsJsonEntry)) {
    throw new Error(`${ROOT_SOURCES.rootsJson}: malformed entries for Root ${letters}`);
  }
  return entries;
}
