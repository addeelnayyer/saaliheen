// What an Admin's Publish of one Surah (#171) asks and what it changes, by the
// rules alone: the request read from what the editor sends, the edits replayed
// on the Surah's Passages and Phrases as Neon holds them through the Passage
// editor's own rules (src/admin/passage-edits.ts, the Passages module's
// problems() and the Phrase rules), the Passages checked against the Surah's
// Tafsir entries too (#235), and the rows that differ between before and
// after. Missing Phrases never block a Publish. No database, network or file
// access: ./publish.ts reads the Tafsir and writes what this decides.

import { checkedPhrases, indexWords } from "@saaliheen/dataset/phrase-rules";
import type { Phrase, Surah } from "@saaliheen/dataset/types";
import { problems, type Passage, type TafsirRanges } from "@saaliheen/passages";
import { editsFrom, markedAfter, tried, type Changes, type Edit, type Marked } from "../admin/passage-edits.ts";
import { allahReferencePublishOf, isRecord, isVersion, type AllahReferencePublish } from "../allah-references/publish.ts";

/** A Publish as the editor sends it: the Passage version its `edits` were made on, the edits, and its Allah reference changes when any wait. */
export interface SurahPublish {
  passages?: { base: number; edits: Edit[] };
  allahReferences?: AllahReferencePublish;
}

/** `body`'s Allah reference changes: none when it sends none, undefined when what it sends is not a publish of them. */
function allahPartOf(body: Record<string, unknown>): { allahReferences?: AllahReferencePublish } | undefined {
  if (body.allahReferences === undefined) return {};
  const allahReferences = allahReferencePublishOf(body.allahReferences);
  return allahReferences && { allahReferences };
}

/**
 * `body` as a Publish to Surah `surah`: `{ base, edits, allahReferences? }`,
 * `base` a whole number, `edits` a list of the editor's edits to this Surah
 * and `allahReferences` `{ base, changes }`; undefined when it is not one, or
 * publishes nothing.
 */
export function surahPublishOf(body: unknown, surah: number): SurahPublish | undefined {
  if (!isRecord(body) || !isVersion(body.base)) return undefined;
  return publishOf(body.base, editsFrom(body.edits, surah), allahPartOf(body));
}

/** A Publish of `edits` on Passage version `base` with `allah`; undefined when either part is not one, or it publishes nothing. */
function publishOf(base: number, edits: Edit[] | undefined, allah: { allahReferences?: AllahReferencePublish } | undefined): SurahPublish | undefined {
  if (!edits || !allah) return undefined;
  if (!edits.length && !allah.allahReferences) return undefined;
  return { passages: { base, edits }, ...allah };
}

/** Why an edit the rules pass over without a reason is refused. */
const noLongerApplies = (edit: Edit) => `the edit ${JSON.stringify(edit)} no longer applies to the Surah's Passages and Phrases, so nothing was published`;

/** `changes` with `edit` made after them on `base`, or why it is refused. */
function nextChanges(base: Marked, changes: Changes, edit: Edit): Changes | { refusal: string } {
  const after = tried(base, changes, edit);
  if (after.refusal) return { refusal: after.refusal };
  return after.changes === changes ? { refusal: noLongerApplies(edit) } : after.changes;
}

/** `edits` made on `base` one after another; the first refusal when one is refused or no longer applies. */
function replayedStrictly(base: Marked, edits: Edit[]): Marked | { refusal: string } {
  let changes: Changes = { edits: [], results: [] };
  for (const edit of edits) {
    const next = nextChanges(base, changes, edit);
    if ("refusal" in next) return next;
    changes = next;
  }
  return markedAfter(base, changes);
}

/** The first Phrase rule `phrases` break over `surah` with `passages`; undefined when they keep every one. */
function phraseProblem(surah: Surah, passages: Passage[], phrases: Phrase[]): string | undefined {
  try {
    checkedPhrases(indexWords([{ ...surah, passages }]), phrases);
    return undefined;
  } catch (failure) {
    return (failure as Error).message;
  }
}

/** The first Passage or Phrase rule `after` breaks in `surah`, its Passages checked against `tafsir`'s entries; undefined when it keeps them all. */
export function ruleBroken(surah: Surah, after: Marked, tafsir: TafsirRanges): string | undefined {
  const [problem] = problems(after.passages, surah.ayahs.length, tafsir);
  return problem ?? phraseProblem(surah, after.passages, after.phrases);
}

/**
 * `edits` replayed on `now`, `surah`'s Passages and Phrases as Neon holds
 * them: what they leave, or the first rule broken, its reason as the rules
 * give it, a Passage splitting one of `tafsir`'s entries among them. An edit
 * the rules refuse, or one that no longer changes anything, refuses the
 * whole Publish.
 */
export function publishedMarks(surah: Surah, now: Marked, edits: Edit[], tafsir: TafsirRanges): Marked | { refusal: string } {
  const after = replayedStrictly(now, edits);
  if ("refusal" in after) return after;
  const problem = ruleBroken(surah, after, tafsir);
  return problem ? { refusal: problem } : after;
}

/** The rows that change from `before` to `after`, keyed by `keyOf`: those to delete, insert, and update in place. */
export interface RowChanges<T> {
  deleted: T[];
  inserted: T[];
  updated: T[];
}

/** What changes from `before` to `after`, rows matched by `keyOf` and compared whole. */
export function rowChanges<T>(before: T[], after: T[], keyOf: (row: T) => string | number): RowChanges<T> {
  const was = new Map(before.map((row) => [keyOf(row), row]));
  const is = new Map(after.map((row) => [keyOf(row), row]));
  const differs = (row: T) => JSON.stringify(row) !== JSON.stringify(was.get(keyOf(row)));
  return {
    deleted: before.filter((row) => !is.has(keyOf(row))),
    inserted: after.filter((row) => !was.has(keyOf(row))),
    updated: after.filter((row) => was.has(keyOf(row)) && differs(row)),
  };
}
