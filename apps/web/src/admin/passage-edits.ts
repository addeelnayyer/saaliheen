// An Admin's edits to one Surah's Passages (#44, #45) and Phrases (#100), as
// the Passage editor keeps them and as Publish sends them, in the one order
// they were made: each names a rule of the Passages module, or a Phrase edit
// (phrase-edits.ts), and what it is made with. Replaying them on Neon's
// Passages and Phrases through those rules gives the Passages, the Phrases and
// the summary, the same in the browser and on the server. A Passage
// edit that would put a Passage boundary inside a Phrase is refused. No file,
// network or browser access.

import { join, moveStart, retitle, split, written, type PassageEdit } from "@saaliheen/passages";
import { phraseName } from "@saaliheen/dataset/phrase-rules";
import type { Phrase } from "@saaliheen/dataset/types";
import type { Passage } from "@/dataset/reader";
import { cutRefusal, passageOf, phraseCut, phrasesEdited, type PhraseEdit } from "./phrase-edits";

/** A Passage edit as it is kept: which rule, on the Passage starting at Ayah `from`, with what. */
export type PassageEditKept =
  | { kind: "retitle"; from: number; en: string; ur: string }
  | { kind: "split"; from: number; at: number }
  | { kind: "join"; from: number }
  | { kind: "moveStart"; from: number; to: number };

/** One edit as it is kept: to the Passages or to the Phrases. */
export type Edit = PassageEditKept | PhraseEdit;

/** A Surah's Passages and Phrases, as Neon holds them or as edits leave them. */
export interface Marked {
  passages: Passage[];
  phrases: Phrase[];
}

/** What one edit made: the Passages and Phrases after it, and, for a Passage edit, what the Passages module made of it. */
export interface Step extends Marked {
  made?: PassageEdit;
}

/** `edit` made to the Passages by the Passages module's rules; null when the rules refuse it or it changes nothing. */
function applyEdit(passages: Passage[], edit: PassageEditKept): PassageEdit | null {
  switch (edit.kind) {
    case "retitle":
      return retitle(passages, edit.from, edit.en, edit.ur);
    case "split":
      return split(passages, edit.from, edit.at);
    case "join":
      return join(passages, edit.from);
    case "moveStart":
      return moveStart(passages, edit.from, edit.to);
  }
}

const isPhraseEdit = (edit: Edit): edit is PhraseEdit => Object.hasOwn(PHRASE_SHAPES, edit.kind);

/** `edit` made to the Passages, kept from cutting a Phrase of `now`. */
function passageStep(now: Marked, edit: PassageEditKept): Step | { refusal: string } | null {
  const made = applyEdit(now.passages, edit);
  if (!made) return null;
  const cut = phraseCut(made.passages, now.phrases);
  return cut ? { refusal: cutRefusal(cut) } : { passages: made.passages, phrases: now.phrases, made };
}

/** `edit` made to `now`: what it made, or why it is refused; null when the rules refuse it without a reason to show, or it changes nothing. */
function stepOf(now: Marked, edit: Edit): Step | { refusal: string } | null {
  if (!isPhraseEdit(edit)) return passageStep(now, edit);
  const outcome = phrasesEdited(now.passages, now.phrases, edit);
  return outcome && "phrases" in outcome ? { passages: now.passages, phrases: outcome.phrases } : outcome;
}

/** Unpublished changes: the edits kept, and what each made, in order. */
export interface Changes {
  edits: Edit[];
  results: Step[];
}

const NO_CHANGES: Changes = { edits: [], results: [] };

/** The Passages and Phrases after `changes`, made on `base`. */
export const markedAfter = (base: Marked, changes: Changes): Marked => changes.results.at(-1) ?? base;

/** The Passages after `changes`, made on `base`. */
export const passagesAfter = (base: Marked, changes: Changes) => markedAfter(base, changes).passages;

/** What the Passages module made of `changes`' Passage edits, in order: what the summary names. */
export const passageEditsMade = (changes: Changes) => changes.results.flatMap((step) => (step.made ? [step.made] : []));

/** The Phrases among `phrases` that start in `passage`, as one key. */
const phrasesKey = (passage: Passage, phrases: Phrase[]) =>
  phrases
    .filter((p) => passageOf([passage], p.first))
    .map(phraseName)
    .sort()
    .join(",");

/** The Passages `after` holds whose Phrases differ from `base`'s, each written by its range, in reading order. */
export const phrasesChangedIn = (base: Marked, after: Marked): string[] =>
  after.passages.filter((p) => phrasesKey(p, base.phrases) !== phrasesKey(p, after.phrases)).map(written);

/**
 * The summary for `changes` to Surah `surah`, made on `base`: the
 * Passages module's label for each Passage edit, in order, then the Passages
 * whose Phrases changed: "Surah 18: join 92–94 into 89–91; change Phrases in 99–102".
 */
export function changesMessage(surah: number, base: Marked, changes: Changes): string {
  const labels = passageEditsMade(changes).map((edit) => edit.label);
  const changed = phrasesChangedIn(base, markedAfter(base, changes));
  const parts = changed.length ? [...labels, `change Phrases in ${changed.join(", ")}`] : labels;
  return parts.length ? `Surah ${surah}: ${parts.join("; ")}` : "";
}

/** `changes` with `edit` made after them, and why not when the rules refuse it with a reason; the same `changes` when it is refused or changes nothing. */
export function tried(base: Marked, changes: Changes, edit: Edit): { changes: Changes; refusal?: string } {
  const step = stepOf(markedAfter(base, changes), edit);
  if (!step) return { changes };
  if ("refusal" in step) return { changes, refusal: step.refusal };
  return { changes: { edits: [...changes.edits, edit], results: [...changes.results, step] } };
}

/** `edits` made on `base` one after another, as far as each still applies. */
export const replayed = (base: Marked, edits: Edit[]): Changes =>
  edits.reduce((changes, edit) => tried(base, changes, edit).changes, NO_CHANGES);

// ------------------------------------------------- edits from the browser

const isAyah = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 286;
const isTitle = (s: unknown): s is string => typeof s === "string" && s.length <= 500;

type Fields = Record<string, unknown>;

/** Each kind of edit, made from what a browser sent for it, starting at Ayah `from`; undefined when it doesn't carry what that kind needs. */
const SHAPES: Record<PassageEditKept["kind"], (e: Fields, from: number) => PassageEditKept | undefined> = {
  retitle: (e, from) => (isTitle(e.en) && isTitle(e.ur) ? { kind: "retitle", from, en: e.en, ur: e.ur } : undefined),
  split: (e, from) => (isAyah(e.at) ? { kind: "split", from, at: e.at } : undefined),
  join: (_, from) => ({ kind: "join", from }),
  moveStart: (e, from) => (isAyah(e.to) ? { kind: "moveStart", from, to: e.to } : undefined),
};

/** Whether `value` is a Word location in Surah `surah`, <Surah>:<Ayah>:<Word>. */
const isWord = (value: unknown, surah: number): value is string =>
  typeof value === "string" && /^\d{1,3}:\d{1,3}:\d{1,3}$/.test(value) && Number(value.split(":")[0]) === surah;

/** Each kind of Phrase edit, made from what a browser sent for it in Surah `surah`; undefined when it doesn't carry what that kind needs. */
const PHRASE_SHAPES: Record<PhraseEdit["kind"], (e: Fields, surah: number) => PhraseEdit | undefined> = {
  mark: (e, surah) => (isWord(e.first, surah) && isWord(e.last, surah) ? { kind: "mark", first: e.first, last: e.last } : undefined),
  unmark: (e, surah) => (isWord(e.phrase, surah) ? { kind: "unmark", phrase: e.phrase } : undefined),
  moveEnd: (e, surah) =>
    isWord(e.phrase, surah) && isWord(e.to, surah) && (e.end === "first" || e.end === "last")
      ? { kind: "moveEnd", phrase: e.phrase, end: e.end, to: e.to }
      : undefined,
};

/** `value` as one Passage edit, only its own fields kept; undefined when it isn't one. */
function passageEditFrom(e: Fields): Edit | undefined {
  const shape = Object.hasOwn(SHAPES, String(e.kind)) ? SHAPES[e.kind as PassageEditKept["kind"]] : undefined;
  return shape && isAyah(e.from) ? shape(e, e.from) : undefined;
}

/** `value` as one edit to Surah `surah`, only its own fields kept; undefined when it isn't one. */
function editFrom(value: unknown, surah: number): Edit | undefined {
  const e = (value ?? {}) as Fields;
  const phraseShape = Object.hasOwn(PHRASE_SHAPES, String(e.kind)) ? PHRASE_SHAPES[e.kind as PhraseEdit["kind"]] : undefined;
  return phraseShape ? phraseShape(e, surah) : passageEditFrom(e);
}

/** `value`, sent by a browser, as a list of edits to Surah `surah`; undefined unless it is a list of at most 500, each one an edit. */
export function editsFrom(value: unknown, surah: number): Edit[] | undefined {
  if (!Array.isArray(value) || value.length > 500) return undefined;
  const edits = value.map((e) => editFrom(e, surah));
  return edits.every((e) => e !== undefined) ? (edits as Edit[]) : undefined;
}
