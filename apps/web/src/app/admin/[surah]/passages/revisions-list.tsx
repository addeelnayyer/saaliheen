"use client";

// The list of a Surah's Passage revisions (#174, ADR 0049), newest first: each
// says its version and the one it was made on, who made it and when, the
// edits its Publish sent (or the version it undid), and the Passages and
// Phrases it changed; every Admin's revision whose changes were recorded
// offers Undo. Undo sends POST /api/v1/passages/{surah}/revisions/{version}/undo
// against the version the page was read at, says how it went, and reads the
// page again, so the list shows the undo on top, or, after a clash, the latest
// revisions.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { editLabel, passageChangeLabel, phraseChangeLabel } from "@/admin/passage-revision-labels";
import type { PassageRevision, SurahPassageRevisions } from "@/passages/revisions";
import { Button } from "@/components/ui/button";
import styles from "../../admin.module.css";
import own from "./revisions.module.css";

/** How the last undo went. */
type Feedback = { kind: "undone"; version: number } | { kind: "refused"; error: string } | null;

/** Undo Surah `surah`'s revision at `version` against `base`; whatever goes wrong, feedback to show, never a throw. */
async function sentUndo(surah: number, version: number, base: number): Promise<Feedback> {
  try {
    const res = await fetch(`/api/v1/passages/${surah}/revisions/${version}/undo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ base }),
    });
    if (res.ok) return { kind: "undone", version };
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { kind: "refused", error: body.error ?? `the server answered ${res.status}.` };
  } catch {
    return { kind: "refused", error: "the server couldn’t be reached. Try again." };
  }
}

function Said({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  if (feedback.kind === "undone") return <p role="status" className={own.done}>Revision {feedback.version} was undone, as a new revision listed on top.</p>;
  return (
    <p role="alert" className={styles.error}>
      The undo was refused: {feedback.error}
    </p>
  );
}

/** When `iso` was, the same on the server and in any browser. */
const shownTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

function Lines({ name, lines }: { name: string; lines: string[] }) {
  return (
    <div className={own.part}>
      <h3 className={own.partHeading}>{name}</h3>{" "}
      {lines.length ? (
        <ul aria-label={name} className={own.lines}>
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className={own.none}>None</p>
      )}
    </div>
  );
}

/** What `revision` did, in words: its edits, or the version it undid. */
const editsOf = (revision: PassageRevision) => (revision.undoes !== null ? [`undo version ${revision.undoes}`] : revision.edits.map(editLabel));

/** The rows `revision` changed, in words; null when they were not recorded. */
const changesOf = ({ changes }: PassageRevision) => changes && [...changes.passages.map(passageChangeLabel), ...changes.phrases.map(phraseChangeLabel)];

interface RevisionProps {
  revision: PassageRevision;
  undoing: boolean;
  onUndo: () => void;
}

function Revision({ revision, undoing, onUndo }: RevisionProps) {
  const { author } = revision;
  const byAdmin = author.kind === "admin";
  const changes = changesOf(revision);
  return (
    <li className={own.revision}>
      <div className={own.head}>
        <span className={own.version}>Version {revision.version}</span> <span className={own.base}>on version {revision.base}</span>{" "}
        <span className={own.by}>by {byAdmin ? author.email : "the seed"}</span>{" "}
        <time dateTime={revision.createdAt} className={own.time}>
          {shownTime(revision.createdAt)}
        </time>{" "}
        {byAdmin && changes && (
          <Button variant="secondary" size="control" disabled={undoing} onClick={onUndo}>
            Undo
          </Button>
        )}
      </div>
      {byAdmin && <Lines name="Edits" lines={editsOf(revision)} />}
      {changes && <Lines name="Changes" lines={changes} />}
    </li>
  );
}

interface ListProps {
  surah: number;
  listed: SurahPassageRevisions;
}

export function PassageRevisionsList({ surah, listed }: ListProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [undoing, setUndoing] = useState(false);

  const undo = async (version: number) => {
    setUndoing(true);
    setFeedback(null);
    setFeedback(await sentUndo(surah, version, listed.version));
    router.refresh();
    setUndoing(false);
  };

  return (
    <>
      <Said feedback={feedback} />
      {listed.revisions.length ? (
        <ol aria-label="Passage revisions" className={own.revisions}>
          {listed.revisions.map((revision) => (
            <Revision key={revision.version} revision={revision} undoing={undoing} onUndo={() => void undo(revision.version)} />
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>This Surah has no Passage revision yet.</p>
      )}
    </>
  );
}
