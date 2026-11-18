"use client";

// A Supplication's fields (#201, #202): its Speaker, chosen from the Speakers
// or added there; its Openings, one or more; its kind, a Supplication or one
// of the Other words to Allah; and its run, First and Last Ayah within its
// Surah. Save sends them all, with its spans (#271, marked on the Word cards)
// and the version they were opened at (./supplication-editing.tsx). A save
// that passes says "Saved" and redraws the page from Neon, its heading and
// Word cards with it; a refused save shows the server's sentence as an alert
// and keeps the choices, the spans among them. A save refused for being made
// against an older version shows the latest Supplication beside the choices,
// and a second Save saves the choices over it. Delete asks first, and its
// "Delete for good" deletes the Supplication against that version and goes
// back to the list; its Supplication revision is kept. Leaving the page asks
// first while there are unsaved changes. Its buttons and the confirmation are
// shadcn/ui's (#300).

import { written } from "@saaliheen/passages";
import { Button } from "@/components/ui/button";
import type { Speaker, Supplication } from "@/supplications/supplications";
import styles from "../../admin.module.css";
import { DeleteConfirmation } from "../../delete-confirmation";
import { useLeaveWarning } from "../../leave-warning";
import own from "../supplication-editor.module.css";
import { SupplicationFields } from "../supplication-fields";
import { useEditing } from "./supplication-editing";
import { kindLabel, OPENING_LABEL, spanText, type SaveStatus } from "./supplication-state";

/** The latest Supplication, as a save made against an older version found it. */
function Latest({ latest, surahName, speakers }: { latest: Supplication; surahName: string; speakers: Speaker[] }) {
  const speaker = speakers.find((s) => s.id === latest.speakerId);
  return (
    <section className={own.latest} aria-labelledby="latest-heading">
      <h2 id="latest-heading" className={own.latestHeading}>
        The latest save
      </h2>
      <dl className={own.facts}>
        <dt>Speaker</dt>
        <dd>{speaker?.nameEn ?? latest.speakerId}</dd>
        <dt>Openings</dt>
        <dd>{latest.openings.map((o) => OPENING_LABEL[o]).join(", ")}</dd>
        <dt>Kind</dt>
        <dd>{kindLabel(latest.kind)}</dd>
        <dt>Run</dt>
        <dd>
          {surahName} {latest.surah}:{written({ from: latest.ayahFrom, till: latest.ayahTo })}
        </dd>
        <dt>Spans</dt>
        <dd>{latest.spans.length > 0 ? latest.spans.map(spanText).join(", ") : "None"}</dd>
      </dl>
    </section>
  );
}

function SaveState({ status, surahName, speakers }: { status: SaveStatus; surahName: string; speakers: Speaker[] }) {
  return (
    <>
      <p role="status" className={own.status}>
        {status.kind === "saving" ? "Saving…" : status.kind === "saved" ? "Saved" : status.kind === "deleted" ? "Deleted" : ""}
      </p>
      {(status.kind === "refused" || status.kind === "stale") && (
        <p role="alert" className={styles.error}>
          {status.error}
        </p>
      )}
      {status.kind === "stale" && <Latest latest={status.latest} surahName={surahName} speakers={speakers} />}
    </>
  );
}

interface Props {
  supplication: Supplication;
  /** Every Speaker, by name. */
  speakers: Speaker[];
  surahName: string;
  ayahCount: number;
}

export function SupplicationForm({ supplication, speakers, surahName, ayahCount }: Props) {
  const { fields, edit, save, remove, status, unsaved } = useEditing();
  useLeaveWarning(unsaved && status.kind !== "deleted");
  const busy = status.kind === "saving" || status.kind === "deleted";
  return (
    <form className={own.form} onSubmit={save} noValidate>
      <SupplicationFields fields={fields} edit={edit} speakers={speakers} surah={supplication.surah} surahName={surahName} ayahCount={ayahCount} />
      <div className={own.actions}>
        <Button type="submit" size="wide" disabled={busy}>
          Save
        </Button>
        <DeleteConfirmation title="Delete this Supplication?" description="It leaves the Supplications page at once; its Supplication revision is kept." onDelete={remove}>
          <Button type="button" size="wide" disabled={busy}>
            Delete
          </Button>
        </DeleteConfirmation>
      </div>
      <SaveState status={status} surahName={surahName} speakers={speakers} />
    </form>
  );
}
