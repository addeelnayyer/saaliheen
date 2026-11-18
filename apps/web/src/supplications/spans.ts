// A Supplication's spans (#270, #230, ADR 0063): the stretches of consecutive
// Words in its Ayahs that its Speaker says to Allah, each a "from" and a "to"
// Word location (s:a:w), which may lie in different Ayahs of its run. What a
// save sends and is checked by, and what `supplication_span` keeps.

import { written } from "@saaliheen/passages";
import { compareLocations, isWithin, isWord, plainLocation, type Run, type WordCount } from "../word-locations.ts";

/** One span: its first Word and its last, both s:a:w; one Word when they are the same. */
export interface SupplicationSpan {
  from: string;
  to: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isSpan = (v: unknown): v is SupplicationSpan => isRecord(v) && typeof v.from === "string" && typeof v.to === "string";

/** `value` as a save's spans, or undefined when it is not a list of { from: text, to: text }. */
export function spansOf(value: unknown): SupplicationSpan[] | undefined {
  if (!Array.isArray(value) || !value.every(isSpan)) return undefined;
  return value.map(({ from, to }) => ({ from, to }));
}

/** Whether `span` holds the Word at `location`: it lies from the span's "from" to its "to", both included. */
export const holds = ({ from, to }: SupplicationSpan, location: string) => compareLocations(from, location) <= 0 && compareLocations(location, to) <= 0;

/** `spans` in reading order: by "from", then by "to". */
const spansInReadingOrder = (spans: readonly SupplicationSpan[]): SupplicationSpan[] =>
  [...spans].sort((a, b) => compareLocations(a.from, b.from) || compareLocations(a.to, b.to));

/** `spans` with each span named once, in reading order, each location written s:a:w plainly. */
export function distinctSpans(spans: readonly SupplicationSpan[]): SupplicationSpan[] {
  const byKey = new Map<string, SupplicationSpan>();
  for (const span of spans) {
    const plain = { from: plainLocation(span.from), to: plainLocation(span.to) };
    byKey.set(`${plain.from} ${plain.to}`, plain);
  }
  return spansInReadingOrder([...byKey.values()]);
}

/** How a refusal names `span`. */
const named = ({ from, to }: SupplicationSpan) => `Supplication span from ${from} to ${to}`;

/** The first end of `span` that is no Word, and which end it is. */
function noWordEnd(span: SupplicationSpan, wordCount: WordCount): string | undefined {
  if (!isWord(span.from, wordCount)) return `There is no Word at ${span.from}, where the ${named(span)} starts.`;
  if (!isWord(span.to, wordCount)) return `There is no Word at ${span.to}, where the ${named(span)} ends.`;
  return undefined;
}

/**
 * The first span that overlaps one before it, with the one it overlaps;
 * `spans` are in order and each "to" not before its "from", so while none
 * overlaps yet, only the span just before can.
 */
function overlap(spans: readonly SupplicationSpan[]): string | undefined {
  for (let i = 1; i < spans.length; i++) {
    const earlier = spans[i - 1];
    if (compareLocations(earlier.to, spans[i].from) >= 0) return `The ${named(spans[i])} overlaps the one from ${earlier.from} to ${earlier.to}.`;
  }
  return undefined;
}

/**
 * Why `spans` (distinct, in reading order) may not be saved with `run`, or
 * undefined when they may. Each check is made over every span in turn, and
 * names the first wrong span in reading order: an end that is no Word, then an
 * end outside the run, then a "to" before its "from", then an overlap.
 */
export function spansRefusal(spans: readonly SupplicationSpan[], run: Run, wordCount: WordCount): string | undefined {
  for (const span of spans) {
    const error = noWordEnd(span, wordCount);
    if (error) return error;
  }
  const outside = spans.find((s) => !isWithin(s.from, run) || !isWithin(s.to, run));
  if (outside) return `The ${named(outside)} lies outside the run ${run.surah}:${written({ from: run.ayahFrom, till: run.ayahTo })}.`;
  const backwards = spans.find((s) => compareLocations(s.to, s.from) < 0);
  if (backwards) return `The ${named(backwards)} ends before it starts.`;
  return overlap(spans);
}
