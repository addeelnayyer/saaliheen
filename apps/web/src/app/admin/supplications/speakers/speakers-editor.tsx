"use client";

// The Speakers page's Speakers (#202): each a form of its names and Prophet
// mark, saved against the version it was opened at. A save that passes says
// "Saved"; a refused one shows the server's sentence; one made against an
// older version shows the latest Speaker, and a second Save saves the choices
// over it. A Speaker who says no Supplication can be deleted, once its
// confirmation is answered "Delete for good". A Speaker added below joins the
// list at once. Its buttons and the confirmation are shadcn/ui's (#300).

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Speaker } from "@/supplications/supplications";
import styles from "../../admin.module.css";
import { DeleteConfirmation } from "../../delete-confirmation";
import { useLeaveWarning } from "../../leave-warning";
import own from "../supplication-editor.module.css";
import { AddSpeaker, SpeakerFieldset } from "./speaker-fields";
import { fieldsOfSpeaker, sendSpeakerDelete, sendSpeakerSave, speakerChanged, type SpeakerFields } from "./speaker-state";

type RowStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "refused"; error: string }
  | { kind: "stale"; error: string; latest: Speaker };

const saysSentence = (says: number) => (says === 0 ? "Says no Supplication" : says === 1 ? "Says 1 Supplication" : `Says ${says} Supplications`);

function SpeakerRow({ speaker, says, onDeleted, onUnsaved }: { speaker: Speaker; says: number; onDeleted: () => void; onUnsaved: (unsaved: boolean) => void }) {
  const [fields, setFields] = useState(() => fieldsOfSpeaker(speaker));
  const [saved, setSaved] = useState(speaker);
  const [status, setStatus] = useState<RowStatus>({ kind: "idle" });

  const edit = (change: Partial<SpeakerFields>) => {
    const next = { ...fields, ...change };
    setFields(next);
    onUnsaved(speakerChanged(next, fieldsOfSpeaker(saved)));
    if (status.kind !== "stale") setStatus({ kind: "idle" });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setStatus({ kind: "saving" });
    const answer = await sendSpeakerSave(speaker.id, fields, saved.version);
    if ("error" in answer) {
      if (!answer.latest) return setStatus({ kind: "refused", error: answer.error });
      setSaved(answer.latest);
      return setStatus({ kind: "stale", error: answer.error, latest: answer.latest });
    }
    setFields(fieldsOfSpeaker(answer.speaker));
    setSaved(answer.speaker);
    onUnsaved(false);
    setStatus({ kind: "saved" });
  };

  const remove = async () => {
    setStatus({ kind: "saving" });
    const answer = await sendSpeakerDelete(speaker.id, saved.version);
    if (answer === true) {
      onUnsaved(false);
      return onDeleted();
    }
    if (answer.latest) {
      setSaved(answer.latest);
      return setStatus({ kind: "stale", error: answer.error, latest: answer.latest });
    }
    setStatus({ kind: "refused", error: answer.error });
  };

  return (
    <form className={own.speaker} aria-label={saved.nameEn} onSubmit={save} noValidate>
      <SpeakerFieldset fields={fields} edit={edit} />
      <p className={own.says}>{saysSentence(says)}</p>
      <div className={own.actions}>
        <Button type="submit" variant="secondary" size="compact" disabled={status.kind === "saving"}>
          Save
        </Button>
        {says === 0 && (
          <DeleteConfirmation title={`Delete the Speaker ${saved.nameEn}?`} description="They say no Supplication, so no Supplication changes." onDelete={remove}>
            <Button type="button" variant="secondary" size="compact" disabled={status.kind === "saving"}>
              Delete
            </Button>
          </DeleteConfirmation>
        )}
      </div>
      <p role="status" className={own.status}>
        {status.kind === "saving" ? "Saving…" : status.kind === "saved" ? "Saved" : ""}
      </p>
      {(status.kind === "refused" || status.kind === "stale") && (
        <p role="alert" className={styles.error}>
          {status.error}
        </p>
      )}
      {status.kind === "stale" && (
        <dl className={`${own.facts} ${own.latest}`} aria-label="The latest save">
          <dt>English name</dt>
          <dd>{status.latest.nameEn}</dd>
          <dt>Urdu name</dt>
          <dd lang="ur" dir="rtl">
            {status.latest.nameUr}
          </dd>
          <dt>Includes a Prophet</dt>
          <dd>{status.latest.includesProphet ? "Yes" : "No"}</dd>
        </dl>
      )}
    </form>
  );
}

export function SpeakersEditor({ listed }: { listed: { speaker: Speaker; says: number }[] }) {
  const [rows, setRows] = useState(listed);
  const [unsaved, setUnsaved] = useState<ReadonlySet<string>>(new Set());
  useLeaveWarning(unsaved.size > 0);
  const markUnsaved = (id: string) => (is: boolean) =>
    setUnsaved((now) => {
      const next = new Set(now);
      if (is) next.add(id);
      else next.delete(id);
      return next;
    });
  return (
    <div className={own.speakers}>
      {rows.map(({ speaker, says }) => (
        <SpeakerRow
          key={speaker.id}
          speaker={speaker}
          says={says}
          onUnsaved={markUnsaved(speaker.id)}
          onDeleted={() => setRows((now) => now.filter((r) => r.speaker.id !== speaker.id))}
        />
      ))}
      <AddSpeaker onAdded={(speaker) => setRows((now) => [...now, { speaker, says: 0 }])} />
    </div>
  );
}
