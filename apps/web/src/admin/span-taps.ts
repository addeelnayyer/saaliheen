// Marking a Supplication's spans on its editor's Word cards (#271, ADR 0063):
// what a tap on a Word card does. A tap on a Word in a span takes that span
// out; otherwise a first tap starts a span, and a second on the same Word or
// a later one ends it, taking in any span it holds. No file, network or
// browser access.

import { compareLocations } from "@/word-locations";
import { distinctSpans, holds, type SupplicationSpan } from "@/supplications/spans";

/** The spans after a tap, and the Word a span's next tap ends at, if one was started. */
export interface Tapped {
  spans: SupplicationSpan[];
  pending: string | undefined;
}

/**
 * What tapping the Word at `location` does to `spans` (in reading order, none
 * overlapping), with a span started at `pending`: the span holding the Word
 * taken out, the pending start kept; or a span started there, again when the
 * Word is before the pending start; or the span from the pending start to the
 * Word added, in place of the spans it holds.
 */
export function tapped(spans: SupplicationSpan[], pending: string | undefined, location: string): Tapped {
  const holding = spans.find((s) => holds(s, location));
  if (holding) return { spans: spans.filter((s) => s !== holding), pending };
  if (pending === undefined || compareLocations(location, pending) < 0) return { spans, pending: location };
  const added = { from: pending, to: location };
  return { spans: distinctSpans([...spans.filter((s) => !holds(added, s.from)), added]), pending: undefined };
}
