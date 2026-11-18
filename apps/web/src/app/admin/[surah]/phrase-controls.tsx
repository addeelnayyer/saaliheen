"use client";

// Marking and editing Phrases by tapping (#100): the Word cards the Admin has
// picked, and the controls for a selected Phrase ("Delete Phrase", "Move
// first Word", "Move last Word"), shown in the Unpublished changes bar so a
// phone reaches them without scrolling, each a shadcn/ui Button (#299). What a
// tap does is phrase-edits.ts's.

import { useState } from "react";
import type { Phrase } from "@saaliheen/dataset/types";
import { phraseText, pickedRun, tapped, type Picking, type PhraseEdit } from "@/admin/phrase-edits";
import { EditorButton } from "./editor-button";
import styles from "./editor.module.css";

/** What has been picked among `phrases`, and the taps that pick and edit; `make` makes a Phrase edit. */
export function usePhrasePicking(phrases: Phrase[], make: (e: PhraseEdit) => void) {
  const [picking, setPicking] = useState<Picking>(null);
  const tap = (location: string) => {
    const { edit, next } = tapped(picking, phrases, location);
    setPicking(next);
    if (edit) make(edit);
  };
  const selected = picking?.kind === "selected" ? picking.phrase : null;
  return {
    picking,
    picked: pickedRun(picking),
    tap,
    remove: () => {
      if (selected) make({ kind: "unmark", phrase: selected.first });
      setPicking(null);
    },
    moveEnd: (end: "first" | "last") => selected && setPicking({ kind: "moving", phrase: selected, end }),
    drop: () => setPicking(null),
  };
}

/** What the bar says while Words are picked: what the next tap does. */
function hint(picking: Exclude<Picking, null>): string {
  switch (picking.kind) {
    case "first":
      return "Tap the Phrase’s last Word.";
    case "selected":
      return `Phrase ${phraseText(picking.phrase)} selected.`;
    case "moving":
      return `Tap the Word the Phrase should now ${picking.end === "first" ? "start" : "end"} at.`;
  }
}

interface Props {
  picking: Picking;
  onDelete: () => void;
  onMove: (end: "first" | "last") => void;
  onCancel: () => void;
}

/** What is picked, and while a Phrase is selected, its controls; nothing while nothing is picked. */
export function PhraseControls({ picking, onDelete, onMove, onCancel }: Props) {
  if (!picking) return null;
  return (
    <div className={styles.picking}>
      <span role="status">{hint(picking)}</span>
      <div className={styles.actions}>
        {picking.kind === "selected" && (
          <>
            <EditorButton onClick={onDelete}>
              Delete Phrase
            </EditorButton>
            <EditorButton onClick={() => onMove("first")}>
              Move first Word
            </EditorButton>
            <EditorButton onClick={() => onMove("last")}>
              Move last Word
            </EditorButton>
          </>
        )}
        <EditorButton onClick={onCancel}>
          Cancel
        </EditorButton>
      </div>
    </div>
  );
}
