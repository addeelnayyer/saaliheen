// An Admin's Unpublished changes to one Surah's Passages (#44) and Phrases
// (#100): the one list of edits made on the Passages and Phrases Neon held at
// the Surah's Passage version (#171). Every edit goes through the Passages
// module's rules (#41) and the Phrase rules, so no list of them can make
// Passages or Phrases a Publish would refuse. The list is kept in the Admin's
// browser storage by Surah and that version, and replayed from Neon's
// Passages and Phrases on load, so Undo still steps back one edit at a time
// after a reload; once the version has moved, the list kept under the old one
// is set aside, never applied to the new one. Publish waits, too, while any
// Passage splits a Tafsir entry (#235).

import { publishable, tafsirSplits, type TafsirRanges } from "@saaliheen/passages";
import type { Passage } from "@/dataset/reader";
import { useCallback, useMemo } from "react";
import { changesMessage, passagesAfter, replayed, tried, type Changes, type Edit, type Marked } from "@/admin/passage-edits";
import { keep, keptText, useKeptText } from "./kept-in-browser";

/** `changes` without their last edit. */
const undone = (changes: Changes): Changes => ({ edits: changes.edits.slice(0, -1), results: changes.results.slice(0, -1) });

/** The longest English Passage title the Surah bar shows in full. */
export const LONG_TITLE = 60;

/** Whether `passage` lacks a Passage title in either Language. */
const untitled = (passage: Passage) => !passage.en.trim() || !passage.ur.trim();

/** Whether `en`, an English Passage title, will be cut short in the Surah bar. */
export const isLong = (en: string) => en.length > LONG_TITLE;

/**
 * What the Unpublished changes bar says of Surah `surah`'s `changes`, made
 * on `base`, with `waiting` Allah reference changes beside them, the
 * Passages checked against `tafsir`'s entries.
 */
export function summary(surah: number, ayahCount: number, base: Marked, changes: Changes, waiting: number, tafsir: TafsirRanges) {
  const passages = passagesAfter(base, changes);
  const count = changes.edits.length;
  const splits = tafsirSplits(passages, tafsir);
  return {
    count,
    message: changesMessage(surah, base, changes),
    untitled: passages.filter(untitled).length,
    long: passages.filter((p) => isLong(p.en)).length,
    splits,
    publishable: count + waiting > 0 && !splits.length && publishable(passages, ayahCount),
  };
}

// ----------------------------------------------------------- browser storage

/** Where Surah `surah`'s Unpublished changes made on its Passage version `version` are kept. */
const storedAs = (surah: number, version: number) => `saaliheen-unpublished-changes:${surah}:${version}`;

/** The edits in `text`, as kept; none when it is missing or unreadable. */
function parsedEdits(text: string | null): Edit[] {
  try {
    const edits: unknown = JSON.parse(text ?? "[]");
    return Array.isArray(edits) ? (edits as Edit[]) : [];
  } catch {
    return [];
  }
}

const keepEdits = (name: string, edits: Edit[]) => keep(name, edits.length ? JSON.stringify(edits) : null);

/**
 * Surah `surah`'s Unpublished changes made on `base`, Neon's Passages and
 * Phrases at Passage version `version`, as kept in the browser (none while the page is
 * prerendered), with `edit` and `undo` to change them. `edit` answers why
 * the rules refused an edit, when they give a reason.
 */
export function useUnpublishedChanges(surah: number, version: number, base: Marked) {
  const name = storedAs(surah, version);
  const text = useKeptText(name);
  const changes = useMemo(() => replayed(base, parsedEdits(text)), [base, text]);
  // Each reads what is kept now, not what this render saw, so an edit kept on
  // leaving a title field and the tap that left it both count.
  const now = useCallback(() => replayed(base, parsedEdits(keptText(name))), [base, name]);
  const edit = useCallback(
    (e: Edit) => {
      const { changes: next, refusal } = tried(base, now(), e);
      keepEdits(name, next.edits);
      return refusal;
    },
    [base, name, now],
  );
  const undo = useCallback(() => keepEdits(name, undone(now()).edits), [name, now]);
  // Once published, the edits are Neon's: none are kept under the old version any more.
  const clear = useCallback(() => keepEdits(name, []), [name]);
  return { changes, edit, undo, clear };
}
