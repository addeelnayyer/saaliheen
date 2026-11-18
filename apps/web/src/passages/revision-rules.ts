// What a Passage revision changed, and what undoing it leaves (#174, ADR
// 0049), by the rules alone. A revision's changes are the Passage and Phrase
// rows it changed, each as it stood before and after: Passages keyed by their
// first Ayah, Phrases by their first Word, as their tables key them. An undo
// puts each of those rows back as it stood before, provided it still stands
// as the revision left it; a row a later revision changed again is a clash,
// and so is a result that breaks a Passage or Phrase rule. Rows the revision
// never touched keep whatever later revisions made of them. No database,
// network or file access: ./revisions.ts reads and writes what this decides.

import type { Phrase, Surah } from "@saaliheen/dataset/types";
import { written, type Passage, type TafsirRanges } from "@saaliheen/passages";
import type { Marked } from "../admin/passage-edits.ts";
import { order, phraseText } from "../admin/phrase-edits.ts";
import { ruleBroken } from "./publish-rules.ts";

/** One row a revision changed: as it stood before (null when it made it) and after (null when it removed it). */
export interface RowChange<T> {
  before: T | null;
  after: T | null;
}

/** The Passage and Phrase rows a revision changed, each in reading order. */
export interface RevisionChanges {
  passages: RowChange<Passage>[];
  phrases: RowChange<Phrase>[];
}

/** One kind of row: its key, its fields in the table's order, how it is named, and its place in reading order. */
interface RowKind<T> {
  keyOf: (row: T) => string | number;
  fields: (row: T) => T;
  named: (row: T) => string;
  order: (row: T) => number;
}

const PASSAGES: RowKind<Passage> = {
  keyOf: (p) => p.from,
  fields: ({ from, till, en, ur }) => ({ from, till, en, ur }),
  named: (p) => `Passage ${written(p)}`,
  order: (p) => p.from,
};

const PHRASES: RowKind<Phrase> = {
  keyOf: (p) => p.first,
  fields: ({ first, last }) => ({ first, last }),
  named: (p) => `Phrase ${phraseText(p)}`,
  order: (p) => order(p.first),
};

/** Whether `a` and `b` are the same row, field by field, or both no row. */
const same = <T>(kind: RowKind<T>, a: T | null | undefined, b: T | null | undefined) =>
  JSON.stringify(a ? kind.fields(a) : null) === JSON.stringify(b ? kind.fields(b) : null);

/** The rows of `kind` that differ from `before` to `after`, in reading order. */
function changesOf<T>(kind: RowKind<T>, before: T[], after: T[]): RowChange<T>[] {
  const was = new Map(before.map((row) => [kind.keyOf(row), row]));
  const is = new Map(after.map((row) => [kind.keyOf(row), row]));
  const keys = [...new Set([...was.keys(), ...is.keys()])];
  return keys
    .filter((key) => !same(kind, was.get(key), is.get(key)))
    .map((key) => ({ before: was.has(key) ? kind.fields(was.get(key)!) : null, after: is.has(key) ? kind.fields(is.get(key)!) : null }))
    .sort((x, y) => kind.order((x.before ?? x.after)!) - kind.order((y.before ?? y.after)!));
}

/** The rows that differ from `before` to `after`: what a revision taking the Surah from one to the other changed. */
export const revisionChanges = (before: Marked, after: Marked): RevisionChanges => ({
  passages: changesOf(PASSAGES, before.passages, after.passages),
  phrases: changesOf(PHRASES, before.phrases, after.phrases),
});

const CLASH = "a later revision changed it again, so the undo would undo that too";

/** The row each of `changes` is about: as it was left, or as it stood when it was removed. */
const rowOf = <T>({ before, after }: RowChange<T>) => (after ?? before)!;

/** The clash of the first of `changes` whose row a later revision changed again, in `rows`; undefined when none was. */
function clashIn<T>(kind: RowKind<T>, rows: Map<string | number, T>, changes: RowChange<T>[]): { clash: string } | undefined {
  const changed = changes.find((change) => !same(kind, rows.get(kind.keyOf(rowOf(change))), change.after));
  return changed && { clash: `The ${kind.named(rowOf(changed))} can't be put back: ${CLASH}.` };
}

/** `now`'s rows of `kind` with each of `changes` turned back, in reading order; or the first row a later revision changed again. */
function turnedBack<T>(kind: RowKind<T>, now: T[], changes: RowChange<T>[]): T[] | { clash: string } {
  const rows = new Map(now.map((row) => [kind.keyOf(row), row]));
  const clash = clashIn(kind, rows, changes);
  if (clash) return clash;
  for (const change of changes) rows.delete(kind.keyOf(rowOf(change)));
  for (const { before } of changes) if (before) rows.set(kind.keyOf(before), kind.fields(before));
  return [...rows.values()].sort((x, y) => kind.order(x) - kind.order(y));
}

/**
 * `now`, Surah `surah`'s Passages and Phrases, with the rows of `changes`
 * put back as they stood before; or a clash, saying why, when a later
 * revision changed one of them again or the result breaks a Passage or
 * Phrase rule, a Passage splitting one of `tafsir`'s entries among them.
 */
export function undone(surah: Surah, now: Marked, changes: RevisionChanges, tafsir: TafsirRanges): Marked | { clash: string } {
  const passages = turnedBack(PASSAGES, now.passages, changes.passages);
  if ("clash" in passages) return passages;
  const phrases = turnedBack(PHRASES, now.phrases, changes.phrases);
  if ("clash" in phrases) return phrases;
  const problem = ruleBroken(surah, { passages, phrases }, tafsir);
  return problem ? { clash: `The undo would break a rule: ${problem}` } : { passages, phrases };
}
