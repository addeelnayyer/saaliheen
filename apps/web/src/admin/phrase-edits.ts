// An Admin's edits to one Surah's Phrases (#100), as the Passage editor keeps
// them beside its Passage edits: mark a run of Words as a Phrase, unmark a
// Phrase, or move one of its ends. Every edit keeps ADR 0009's rules over the
// Surah's Passages at that point: a Phrase ends in the Passage it starts in,
// and no two Phrases overlap. A refused edit says why. Phrases are named by
// their first Word, so edits replay on Neon's Phrases the same in the
// browser and on the server. No file, network or browser access.

import type { Phrase } from "@saaliheen/dataset/types";
import { written } from "@saaliheen/passages";
import type { Passage } from "@/dataset/reader";

/** One Phrase edit as it is kept: which change, to the Phrase whose first Word is at `phrase`, with what. */
export type PhraseEdit =
  | { kind: "mark"; first: string; last: string }
  | { kind: "unmark"; phrase: string }
  | { kind: "moveEnd"; phrase: string; end: "first" | "last"; to: string };

/** A Phrase edit made: the Surah's Phrases after it, in Quran order; or why it was refused. */
type PhraseOutcome = { phrases: Phrase[] } | { refusal: string };

/** `location`'s Ayah and Word numbers. */
const numbers = (location: string) => location.split(":").slice(1).map(Number) as [number, number];

/** `location`'s place in the Surah's reading order. */
export const order = (location: string) => {
  const [ayah, word] = numbers(location);
  return ayah * 10_000 + word;
};

/** `location` as the editor writes it, <Ayah>:<Word>. */
export const short = (location: string) => numbers(location).join(":");

/** A Phrase as the editor writes it, <Ayah>:<Word>–<Ayah>:<Word>. */
export const phraseText = (p: Phrase) => `${short(p.first)}–${short(p.last)}`;

/** The Passage among `passages` holding the Word at `location`. */
export const passageOf = (passages: Passage[], location: string) => {
  const [ayah] = numbers(location);
  return passages.find((p) => p.from <= ayah && ayah <= p.till);
};

/** Whether `phrase`'s first and last Word lie in different Passages among `passages`. */
const crosses = (passages: Passage[], phrase: Phrase) => passageOf(passages, phrase.first) !== passageOf(passages, phrase.last);

/** The Phrase among `phrases` holding the Word at `location`. */
export const phraseHolding = (phrases: Phrase[], location: string) =>
  phrases.find((p) => order(p.first) <= order(location) && order(location) <= order(p.last));

/** The run of Words from `a` to `b`, whichever was tapped first. */
const run = (a: string, b: string): Phrase => (order(a) <= order(b) ? { first: a, last: b } : { first: b, last: a });

const inOrder = (phrases: Phrase[]) => [...phrases].sort((x, y) => order(x.first) - order(y.first));

/** Why `phrase` can't stand beside `others` over `passages`; undefined when it can. */
function problemWith(passages: Passage[], others: Phrase[], phrase: Phrase): string | undefined {
  const passage = passageOf(passages, phrase.first);
  if (!passage || crosses(passages, phrase)) {
    const which = passage ? `Passage ${written(passage)}` : "its Passage";
    return `The Phrase ${phraseText(phrase)} would leave ${which}: a Phrase ends in the Passage it starts in.`;
  }
  const overlapped = others.find((o) => order(o.first) <= order(phrase.last) && order(phrase.first) <= order(o.last));
  return overlapped && `The Phrase ${phraseText(phrase)} would overlap the Phrase ${phraseText(overlapped)}.`;
}

/** `phrases` with `phrase` put in, in place of `old` if given; refused when it breaks a rule. */
function placed(passages: Passage[], phrases: Phrase[], phrase: Phrase, old?: Phrase): PhraseOutcome {
  const others = phrases.filter((p) => p !== old);
  const problem = problemWith(passages, others, phrase);
  return problem ? { refusal: problem } : { phrases: inOrder([...others, phrase]) };
}

/** `phrase` with its `end` Word moved to `to`, the ends kept in reading order. */
const moved = (phrase: Phrase, end: "first" | "last", to: string) => (end === "first" ? run(to, phrase.last) : run(phrase.first, to));

const same = (x: Phrase, y: Phrase) => x.first === y.first && x.last === y.last;

/**
 * `edit` made to `phrases` over `passages`: the Phrases after it, or why it
 * is refused; null when it names no Phrase there or changes nothing.
 */
export function phrasesEdited(passages: Passage[], phrases: Phrase[], edit: PhraseEdit): PhraseOutcome | null {
  if (edit.kind === "mark") return placed(passages, phrases, run(edit.first, edit.last));
  const target = phrases.find((p) => p.first === edit.phrase);
  if (!target) return null;
  if (edit.kind === "unmark") return { phrases: phrases.filter((p) => p !== target) };
  const phrase = moved(target, edit.end, edit.to);
  return same(phrase, target) ? null : placed(passages, phrases, phrase, target);
}

/** The first of `phrases` that `passages` would cut: one whose first and last Word lie in different Passages. */
export const phraseCut = (passages: Passage[], phrases: Phrase[]) =>
  phrases.find((p) => crosses(passages, p));

/** Why a Passage edit that would cut `phrase` is refused. */
export const cutRefusal = (phrase: Phrase) =>
  `That would put a Passage boundary inside the Phrase ${phraseText(phrase)}. The Phrase must be changed first.`;

// -------------------------------------------------------------------- tapping

/**
 * What the Admin has picked by tapping Word cards: the first Word of a Phrase
 * to be marked, a Phrase selected, or a selected Phrase one of whose ends the
 * next tap moves; null when nothing is picked.
 */
export type Picking =
  | null
  | { kind: "first"; word: string }
  | { kind: "selected"; phrase: Phrase }
  | { kind: "moving"; phrase: Phrase; end: "first" | "last" };

/**
 * What tapping the Word at `location` does while `picking`, among `phrases`:
 * the Phrase edit it makes, if any, and what is picked after it. A first tap
 * selects the Phrase holding the Word, or picks the Word as a new Phrase's
 * first; the next tap is that Phrase's last Word, or the moved end's new place.
 */
export function tapped(picking: Picking, phrases: Phrase[], location: string): { edit?: PhraseEdit; next: Picking } {
  if (picking?.kind === "first") return { edit: { kind: "mark", first: picking.word, last: location }, next: null };
  if (picking?.kind === "moving") return { edit: { kind: "moveEnd", phrase: picking.phrase.first, end: picking.end, to: location }, next: null };
  const phrase = phraseHolding(phrases, location);
  return { next: phrase ? { kind: "selected", phrase } : { kind: "first", word: location } };
}

/** The Words `picking` holds, as a run: the picked first Word, or the selected Phrase. */
export const pickedRun = (picking: Picking): Phrase | null =>
  !picking ? null : picking.kind === "first" ? { first: picking.word, last: picking.word } : picking.phrase;
