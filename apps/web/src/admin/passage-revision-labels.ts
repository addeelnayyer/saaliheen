// How the Admin area writes a Passage revision (#174): each edit its Publish
// sent, by its own fields, and each row it changed, before and after. No
// file, network or browser access.

import type { Phrase } from "@saaliheen/dataset/types";
import { written, type Passage } from "@saaliheen/passages";
import type { RowChange } from "../passages/revision-rules.ts";
import type { Edit } from "./passage-edits.ts";
import { phraseText, short } from "./phrase-edits.ts";

/** Each kind of edit in words, named by what it was sent with. */
const EDIT_LABELS: { [K in Edit["kind"]]: (edit: Extract<Edit, { kind: K }>) => string } = {
  retitle: (e) => `retitle the Passage from Ayah ${e.from}: “${e.en}” · “${e.ur}”`,
  split: (e) => `split the Passage from Ayah ${e.from} at Ayah ${e.at}`,
  join: (e) => `join the Passage from Ayah ${e.from} into the one above`,
  moveStart: (e) => `move the start of the Passage from Ayah ${e.from} to Ayah ${e.to}`,
  mark: (e) => `mark the Phrase ${short(e.first)}–${short(e.last)}`,
  unmark: (e) => `unmark the Phrase from ${short(e.phrase)}`,
  moveEnd: (e) => `move the ${e.end} Word of the Phrase from ${short(e.phrase)} to ${short(e.to)}`,
};

/** `edit` in words, named by what it was sent with. */
export const editLabel = (edit: Edit): string => (EDIT_LABELS[edit.kind] as (e: Edit) => string)(edit);

/** A Passage as the list writes it: its Ayahs and English title. */
const passageText = (p: Passage) => `${written(p)} “${p.en}”`;

/** A row change in words, each row written by `text`: made, removed, or what it was and is. */
function changeLabel<T>(name: string, { before, after }: RowChange<T>, text: (row: T) => string): string {
  if (!before) return `${name} ${text(after!)} added`;
  if (!after) return `${name} ${text(before)} removed`;
  return `${name} ${text(before)} → ${text(after)}`;
}

/** A changed Passage in words: "Passage 1–3 “…” → 1–7 “…”". */
export const passageChangeLabel = (change: RowChange<Passage>) => changeLabel("Passage", change, passageText);

/** A changed Phrase in words: "Phrase 1:1–1:4 added". */
export const phraseChangeLabel = (change: RowChange<Phrase>) => changeLabel("Phrase", change, phraseText);
