// An Admin's Unpublished changes to one Surah's Allah references (#152, ADR
// 0035): the Word cards tapped while marking Allah references, in the order
// tapped, each turning its Word into an Allah reference or stopping it being
// one. They are kept in the Admin's browser under the Surah and the version of
// its Allah references they were made on, apart from the Passage and Phrase
// edits, and replayed on that version's Allah references.

/** Where Surah `surah`'s Allah reference changes made on `version` are kept. */
export const allahReferenceChangesStoredAs = (surah: number, version: number) => `saaliheen-allah-reference-changes:${surah}:${version}`;

/** The Allah references `base` holds once each of `taps` has turned its Word into one, or out of one. */
export function allahReferencesAfter(base: readonly string[], taps: readonly string[]): Set<string> {
  const marked = new Set(base);
  for (const location of taps) if (!marked.delete(location)) marked.add(location);
  return marked;
}

/** The taps kept as `text`; none when it is missing or unreadable, and only what are Word locations. */
export function parsedTaps(text: string | null): string[] {
  try {
    const taps: unknown = JSON.parse(text ?? "[]");
    return Array.isArray(taps) ? taps.filter((t): t is string => typeof t === "string" && /^\d+:\d+:\d+$/.test(t)) : [];
  } catch {
    return [];
  }
}

/** `taps` as kept: null, to clear what is kept, when there are none. */
export const keptTaps = (taps: readonly string[]): string | null => (taps.length ? JSON.stringify(taps) : null);
