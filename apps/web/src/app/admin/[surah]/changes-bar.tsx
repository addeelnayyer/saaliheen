"use client";

// The Unpublished changes bar (#44), fixed at the foot of the Passage editor:
// how many Unpublished changes there are, their summary behind a
// button, how many Passages are untitled and how many titles are long, Undo
// (one change at a time) and Publish, disabled while any Passage lacks a title
// in either Language, and how the last Publish went (#45). Above them, the
// Phrase controls while Word cards are picked, and why the last edit was
// refused, when it was (#100). Beside the count, how many Allah reference
// changes are waiting (#152). The one Publish sends the Passage, Phrase and
// Allah reference changes together, written to Neon in one transaction
// (#171); Allah references have no Publish of their own. Undo steps back the
// changes of the mode in effect. Publish waits, too, while any Passage splits
// a Tafsir entry, each split listed above the status (#235). Summary, Undo
// and Publish are shadcn/ui Buttons (#299), Publish filled with the accent
// while it may be pressed.

import { useId, useState, type ReactNode } from "react";
import { EditorButton } from "./editor-button";
import type { Feedback, PublishResult } from "./use-publish";
import styles from "./editor.module.css";

interface Props {
  count: number;
  /** How many Allah reference changes are waiting (#152). */
  allahCount: number;
  /** Whether Undo has a change to step back: an Allah reference change while marking them, else a Passage or Phrase edit. */
  canUndo: boolean;
  message: string;
  untitled: number;
  long: number;
  /** Each Passage splitting a Tafsir entry, naming the entry and its Language. */
  splits: string[];
  /** Whether Publish may be pressed: some change is waiting, every Passage is titled, and none splits a Tafsir entry. */
  publishable: boolean;
  /** Whether a Passage heading is being dragged: the bar then steps aside, letting a drop reach the places under it. */
  quiet: boolean;
  onUndo: () => void;
  /** Whether a Publish is on its way. */
  publishing: boolean;
  feedback: Feedback;
  onPublish: () => void;
  /** Why the last edit was refused, when the rules gave a reason. */
  refusal: string | undefined;
  /** The Phrase controls, while Word cards are picked. */
  children?: ReactNode;
}

const counted = (count: number) =>
  count === 0 ? "No Unpublished changes" : `${count} Unpublished change${count === 1 ? "" : "s"}`;

const allahCounted = (count: number) => `${count} Allah reference change${count === 1 ? "" : "s"}`;

/** How many Unpublished changes there are, how many Allah reference changes when any are waiting, and how many Passages are untitled or have a long title. */
function ChangesStatus({ count, allahCount, untitled, long }: { count: number; allahCount: number; untitled: number; long: number }) {
  return (
    <div className={styles.status}>
      <strong>{counted(count)}</strong>{" "}
      {allahCount > 0 && <strong className={styles.allahCount}>{allahCounted(allahCount)} </strong>}
      {untitled > 0 && <span className={styles.flag}>{untitled} untitled </span>}
      {long > 0 && <span className={styles.flag}>{long} long title{long === 1 ? "" : "s"} </span>}
    </div>
  );
}

const KEPT = "Your Unpublished changes are kept.";

/** How the last Publish went: a confirmation, or an alert saying why it didn't go through. */
function PublishFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  if (feedback.kind === "published") {
    return (
      <p role="status" className={styles.feedback}>
        <span>Published. Readers see it on their next load.</span>
      </p>
    );
  }
  return (
    <p role="alert" className={`${styles.feedback} ${styles.problem}`}>
      {problemText(feedback)}
    </p>
  );
}

/** What the alert says when a Publish didn't go through. */
function problemText(feedback: Exclude<PublishResult, { kind: "published" }>): string {
  switch (feedback.kind) {
    case "stale":
      return "Someone published first. These are the latest Passages, Phrases and Allah references; your outdated Unpublished changes were set aside.";
    case "refused":
      return `The Publish was refused: ${feedback.error} ${KEPT}`;
    case "unreached":
      return `The Publish didn’t reach the server. ${KEPT} Please try again.`;
  }
}

/** Each Passage splitting a Tafsir entry, as a list Publish waits on. */
function TafsirSplits({ splits }: { splits: string[] }) {
  if (!splits.length) return null;
  return (
    <div role="alert" className={`${styles.feedback} ${styles.problem}`}>
      Publish waits until no Passage splits a Tafsir entry:
      <ul aria-label="Passages splitting a Tafsir entry" className={styles.splits}>
        {splits.map((split) => (
          <li key={split}>{split}</li>
        ))}
      </ul>
    </div>
  );
}

export function ChangesBar({ count, allahCount, canUndo, message, untitled, long, splits, publishable, quiet, onUndo, publishing, feedback, onPublish, refusal, children }: Props) {
  const [open, setOpen] = useState(false);
  const messageId = useId();
  return (
    <section aria-label="Unpublished changes" className={quiet ? `${styles.bar} ${styles.quiet}` : styles.bar}>
      {children}
      {refusal && (
        <p role="alert" className={`${styles.feedback} ${styles.problem}`}>
          {refusal}
        </p>
      )}
      <TafsirSplits splits={splits} />
      <ChangesStatus count={count} allahCount={allahCount} untitled={untitled} long={long} />{" "}
      <div className={styles.actions}>
        <EditorButton aria-expanded={open} aria-controls={messageId} onClick={() => setOpen(!open)}>
          Summary
        </EditorButton>
        <EditorButton disabled={!canUndo} onClick={onUndo}>
          Undo
        </EditorButton>
        <EditorButton filled disabled={!publishable || publishing} aria-busy={publishing} onClick={onPublish}>
          Publish
        </EditorButton>
      </div>
      <PublishFeedback feedback={feedback} />
      {open && (
        <p id={messageId} className={styles.message}>
          {message || "No Unpublished changes yet."}
        </p>
      )}
    </section>
  );
}
