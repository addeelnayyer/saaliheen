"use client";

// The list of a Surah's Allah reference revisions (#154, ADR 0044), newest
// first: each says who made it, when, and the Words it added and removed, and
// every Admin's revision offers Undo. Undo sends
// POST /api/v1/allah-references/{surah}/revisions/{version}/undo against the
// version the page was read at, says how it went, and reads the page again, so
// the list shows the undo on top, or, after "Someone published first", the
// latest revisions.

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AllahReferenceRevision, SurahRevisions } from "@/allah-references/revisions";
import { Button } from "@/components/ui/button";
import styles from "../../admin.module.css";
import own from "./revisions.module.css";

/** How the last undo went. */
type Feedback = { kind: "undone"; version: number } | { kind: "stale" } | { kind: "refused"; error: string } | null;

/** The feedback an answer with `status` and `body` gives to the undo of revision `version`. */
function feedbackOf(version: number, status: number, body: { error?: string }): Feedback {
  if (status === 200) return { kind: "undone", version };
  if (status === 409) return { kind: "stale" };
  return { kind: "refused", error: body.error ?? `the server answered ${status}.` };
}

/** Undo Surah `surah`'s revision at `version` against `base`; whatever goes wrong, feedback to show, never a throw. */
async function sentUndo(surah: number, version: number, base: number): Promise<Feedback> {
  try {
    const res = await fetch(`/api/v1/allah-references/${surah}/revisions/${version}/undo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ base }),
    });
    return feedbackOf(version, res.status, (await res.json().catch(() => ({}))) as { error?: string });
  } catch {
    return { kind: "refused", error: "the server couldn’t be reached. Try again." };
  }
}

function Said({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  if (feedback.kind === "undone") return <p role="status" className={own.done}>Revision {feedback.version} was undone, as a new revision listed on top.</p>;
  if (feedback.kind === "stale")
    return (
      <p role="alert" className={styles.error}>
        Someone published first: these are the latest revisions, and your undo was not written.
      </p>
    );
  return (
    <p role="alert" className={styles.error}>
      The undo was refused: {feedback.error}
    </p>
  );
}

/** When `iso` was, the same on the server and in any browser. */
const shownTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

function Words({ name, locations, words }: { name: string; locations: string[]; words: Record<string, string> }) {
  return (
    <div className={own.words}>
      <h3 className={own.wordsHeading}>{name}</h3>{" "}
      {locations.length ? (
        <ul aria-label={name} className={own.wordList}>
          {locations.map((location) => (
            <li key={location} className={own.word}>
              <span lang="ar" dir="rtl" className={own.arabic}>
                {words[location]}
              </span>{" "}
              <span className={own.location}>{location}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={own.none}>None</p>
      )}
    </div>
  );
}

interface RevisionProps {
  revision: AllahReferenceRevision;
  words: Record<string, string>;
  undoing: boolean;
  onUndo: () => void;
}

function Revision({ revision, words, undoing, onUndo }: RevisionProps) {
  const { author } = revision;
  return (
    <li className={own.revision}>
      <div className={own.head}>
        <span className={own.version}>Version {revision.version}</span>{" "}
        <span className={own.by}>by {author.kind === "admin" ? author.email : "the seed"}</span>{" "}
        <time dateTime={revision.createdAt} className={own.time}>
          {shownTime(revision.createdAt)}
        </time>{" "}
        {author.kind === "admin" && (
          <Button variant="secondary" size="control" disabled={undoing} onClick={onUndo}>
            Undo
          </Button>
        )}
      </div>
      <Words name="Added" locations={revision.added} words={words} />
      <Words name="Removed" locations={revision.removed} words={words} />
    </li>
  );
}

interface ListProps {
  surah: number;
  listed: SurahRevisions;
  /** The Uthmani Arabic of every Word listed, by Word location. */
  words: Record<string, string>;
}

export function RevisionsList({ surah, listed, words }: ListProps) {
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
        <ol aria-label="Allah reference revisions" className={own.revisions}>
          {listed.revisions.map((revision) => (
            <Revision key={revision.version} revision={revision} words={words} undoing={undoing} onUndo={() => void undo(revision.version)} />
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>This Surah has no Allah reference revision yet.</p>
      )}
    </>
  );
}
