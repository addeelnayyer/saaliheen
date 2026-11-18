// An Admin's Unpublished changes to one Surah's Allah references (#152, ADR
// 0035), kept in the browser under the Surah and the version of its Allah
// references the editor knows, apart from the Passage and Phrase edits
// (unpublished-changes.ts). A version moved on by another Publish names
// another place, so changes made on the old version are set aside, never
// applied to the new one. The bar's one Publish sends them with the Passage
// and Phrase edits (#171, use-publish.ts).

import { useCallback, useMemo } from "react";
import { allahReferenceChangesStoredAs, allahReferencesAfter, keptTaps, parsedTaps } from "@/admin/allah-reference-edits";
import type { SurahAllahReferences } from "@/allah-references/stored";
import { keep, keptText, useKeptText } from "./kept-in-browser";

/** What marking Allah references gives the editor: the changes waiting, the Allah references after them, a tap, Undo and clearing them. */
export interface AllahReferenceChanges {
  /** The Word cards tapped, in order. */
  taps: string[];
  count: number;
  marked: Set<string>;
  tap: (location: string) => void;
  undo: () => void;
  /** Drop the changes kept, once they are published. */
  clear: () => void;
}

/**
 * Surah `surah`'s Allah reference changes, made on `references`, its Allah
 * references and their version as the editor knows them, as kept in the
 * browser (none while the page is prerendered).
 */
export function useAllahReferenceChanges(surah: number, references: SurahAllahReferences): AllahReferenceChanges {
  const name = allahReferenceChangesStoredAs(surah, references.version);
  const text = useKeptText(name);
  const taps = useMemo(() => parsedTaps(text), [text]);
  const marked = useMemo(() => allahReferencesAfter(references.locations, taps), [references.locations, taps]);
  // Each reads what is kept now, not what this render saw.
  const tap = useCallback((location: string) => keep(name, keptTaps([...parsedTaps(keptText(name)), location])), [name]);
  const undo = useCallback(() => keep(name, keptTaps(parsedTaps(keptText(name)).slice(0, -1))), [name]);
  const clear = useCallback(() => keep(name, null), [name]);
  return { taps, count: taps.length, marked, tap, undo, clear };
}
