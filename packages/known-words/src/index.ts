// The Known words module (#245, #248), a shared package: the pure rules for a
// reader's Known words (CONTEXT.md), with no storage, file or network access,
// so the website, the API and the mobile app use one copy of them and each
// supplies its own storage.
//
// Each entry names what it marks by its Arabic text, never by an id (ADR
// 0057): a Known Root by its letters with spaces (ر ح م), a Known particle by
// its Lemma's text, or its Spelling's when it has no Lemma. An unmark is kept
// as `known: false` with its own `markedAt`, so it can beat an older mark from
// another device. The entries are written as one JSON array. Lists from two
// devices, or from a device and an Account, merge per entry: the newer
// `markedAt` wins and a tie goes to the unmark (`mergeKnownWords`). No rule
// changes the list it is given; each returns a new one.

/** What an entry marks: a Root, or a particle by its Lemma or by its Spelling. */
export type KnownWordKind = "root" | "lemma" | "spelling";

/** One Root or particle a reader has marked or unmarked (ADR 0057). */
export interface KnownWordEntry {
  kind: KnownWordKind;
  /** Root letters with spaces (ر ح م), or the particle's Lemma or Spelling text. */
  text: string;
  /** False is a kept unmark, never a deletion. */
  known: boolean;
  /** When it was marked or unmarked, in milliseconds since the epoch, on the device that did it. */
  markedAt: number;
}

const KINDS: readonly string[] = ["root", "lemma", "spelling"] satisfies KnownWordKind[];

/** The most characters an entry's text holds: more than any Root's letters or particle's text, as written with vowel marks. */
export const LONGEST_TEXT = 64;

/**
 * Whether an entry is a Known words entry: a kind, a text of 1 to 64
 * characters, a known flag and a markedAt in whole milliseconds since the
 * epoch, as `Date.now()` gives it.
 */
export function isKnownWordEntry(entry: unknown): entry is KnownWordEntry {
  const { kind, text, known, markedAt } = (entry ?? {}) as Partial<KnownWordEntry>;
  return (
    KINDS.includes(kind as string) &&
    typeof text === "string" &&
    text !== "" &&
    text.length <= LONGEST_TEXT &&
    typeof known === "boolean" &&
    Number.isSafeInteger(markedAt) &&
    (markedAt as number) >= 0
  );
}

/** A Known words entry alone, without whatever else the object it was read from holds. */
export const entryOf = ({ kind, text, known, markedAt }: KnownWordEntry): KnownWordEntry => ({ kind, text, known, markedAt });

/**
 * The entries a stored JSON array holds, one per Root or particle (the one
 * merging would keep); entries that are not Known words entries are dropped.
 * Anything that is not such an array is no entries.
 */
export function parseKnownWords(stored: string | null | undefined): KnownWordEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return mergeKnownWords(parsed.filter(isKnownWordEntry).map(entryOf));
}

/** The entries as the JSON array they are stored as. */
export const writeKnownWords = (entries: KnownWordEntry[]) => JSON.stringify(entries);

/** What an entry marks: a Root by its letters, or a particle by its Lemma's or Spelling's text. */
export type KnownWordKey = Pick<KnownWordEntry, "kind" | "text">;

const sameKey = (a: KnownWordKey, b: KnownWordKey) => a.kind === b.kind && a.text === b.text;

/** The entries after marking (`known`) or unmarking `key` at `markedAt`: its entry is replaced, last. */
export function markKnown(entries: KnownWordEntry[], key: KnownWordKey, known: boolean, markedAt: number): KnownWordEntry[] {
  return [...entries.filter((e) => !sameKey(e, key)), { kind: key.kind, text: key.text, known, markedAt }];
}

/** Whether `key` is marked as known. */
export const isKnown = (entries: KnownWordEntry[], key: KnownWordKey) => entries.some((e) => e.known && sameKey(e, key));

const keyOf = ({ kind, text }: KnownWordKey) => `${kind}\u0000${text}`;

/** Whether `a` beats `b` for the same entry: the newer wins, and a tie goes to the unmark. */
const beats = (a: KnownWordEntry, b: KnownWordEntry) => a.markedAt > b.markedAt || (a.markedAt === b.markedAt && !a.known);

/**
 * Several lists of entries merged into one: for each Root or particle the
 * newer `markedAt` wins, a tie going to the unmark, whichever list holds it and
 * in whatever order; oldest first.
 */
export function mergeKnownWords(...lists: KnownWordEntry[][]): KnownWordEntry[] {
  const winners = new Map<string, KnownWordEntry>();
  for (const entry of lists.flat()) {
    const held = winners.get(keyOf(entry));
    if (!held || beats(entry, held)) winners.set(keyOf(entry), { ...entry });
  }
  return [...winners.values()].sort((a, b) => a.markedAt - b.markedAt || (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0));
}

/** The Known words: the entries marked as known. */
export const knownEntries = (entries: KnownWordEntry[]) => entries.filter((e) => e.known);

/** The texts of every Known word of one kind: a Known Root's letters (ر ح م), or a Known particle's Lemma or Spelling. */
export const knownTexts = (entries: KnownWordEntry[], kind: KnownWordKind): ReadonlySet<string> =>
  new Set(
    knownEntries(entries)
      .filter((e) => e.kind === kind)
      .map((e) => e.text),
  );

/** Whether a Root or particle is known, looked up by its kind and text together among the Known words as they are now. */
export function knownLookup(entries: KnownWordEntry[]): (key: KnownWordKey) => boolean {
  const known = new Set(knownEntries(entries).map(keyOf));
  return (key) => known.has(keyOf(key));
}

/** The letters of every Known Root (ر ح م). */
export const knownRootLetters = (entries: KnownWordEntry[]): ReadonlySet<string> => knownTexts(entries, "root");

/** A Word as Known words see it: its Root's letters, or, when it has no Root, its particle. */
export interface WordForKnowing {
  root?: string | null;
  particle?: { kind: "lemma" | "spelling"; text: string } | null;
}

/** Whether a Word is a known Word: its Root is a Known Root, or its particle a Known particle. */
export function isKnownWord(entries: KnownWordEntry[], { root, particle }: WordForKnowing): boolean {
  if (root) return isKnown(entries, { kind: "root", text: root });
  return particle ? isKnown(entries, particle) : false;
}

/** The Arabic alphabet in its order: the letters a Root is written with. */
const ALPHABET = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

/** Anything that is not one of the alphabet's letters. */
const NOT_A_LETTER = new RegExp(`[^${ALPHABET}]`, "g");

/** The Arabic letters of `text` alone, as a Root writes them: a hamza as ا, a final ى as ي, an Urdu keyboard's ی, ک and ہ or ھ as ي, ك and ه, no spaces or vowel marks. */
const lettersOf = (text: string) =>
  text
    .replace(/[أإآءؤئٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/[ہھۃة]/g, "ه")
    .replace(NOT_A_LETTER, "");

/** The letter a Root's letters (`ر ح م`) begin with, as the alphabet orders it: a hamza as ا; empty when there is none. */
export const firstLetterOf = (letters: string): string => lettersOf(letters).charAt(0);

/** Two Roots' letters (`ر ح م`) in Arabic letter order, letter by letter, a shorter Root before a longer one it begins. */
export function compareRootLetters(a: string, b: string): number {
  const [x, y] = [lettersOf(a), lettersOf(b)];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const order = ALPHABET.indexOf(x[i]) - ALPHABET.indexOf(y[i]);
    if (order) return order;
  }
  return x.length - y.length;
}

/** Whether Arabic text, a Root's letters or a particle's, holds the letters searched for, in a row, vowel marks and spaces aside: `من` finds مِن. */
export function hasLetters(text: string, search: string): boolean {
  const letters = lettersOf(search);
  return letters !== "" && lettersOf(text).includes(letters);
}

/** Whether a Root's letters hold the Arabic letters searched for, in a row: `رحم`, `ر ح م` and `رَحِمَ` all find ر ح م. */
export const rootHasLetters = (root: string, search: string): boolean => hasLetters(root, search);
