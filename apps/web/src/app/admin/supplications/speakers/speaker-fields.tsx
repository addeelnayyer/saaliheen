"use client";

// A Speaker's fields (#202): its English and Urdu names and its Prophet mark,
// as the Speakers page edits each Speaker, and the add of a new Speaker, on
// the Speakers page and in a Supplication's Speaker picker. The add is a
// group, not a form, so that it can sit within a Supplication's form; Enter in
// its names adds the Speaker rather than saving that form. Its fields and
// buttons are shadcn/ui's (#300).

import { useId, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Speaker } from "@/supplications/supplications";
import styles from "../../admin.module.css";
import own from "../supplication-editor.module.css";
import { NEW_SPEAKER, sendSpeakerAdd, type SpeakerFields } from "./speaker-state";

export function SpeakerFieldset({ fields, edit }: { fields: SpeakerFields; edit: (change: Partial<SpeakerFields>) => void }) {
  return (
    <div className={own.speakerFields}>
      <label className={own.field}>
        <span className={own.label}>English name</span>
        <Input value={fields.nameEn} onChange={(e) => edit({ nameEn: e.target.value })} />
      </label>
      <label className={own.field}>
        <span className={own.label}>Urdu name</span>
        <Input lang="ur" dir="rtl" value={fields.nameUr} onChange={(e) => edit({ nameUr: e.target.value })} />
      </label>
      <label className={own.check}>
        <Checkbox checked={fields.includesProphet} onCheckedChange={(checked) => edit({ includesProphet: checked === true })} />
        <span>Includes a Prophet</span>
      </label>
    </div>
  );
}

/** "Add a Speaker": its fields and Add Speaker, which hands the added Speaker to `onAdded`. */
export function AddSpeaker({ onAdded }: { onAdded: (speaker: Speaker) => void }) {
  const heading = useId();
  const [fields, setFields] = useState(NEW_SPEAKER);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();

  const add = async () => {
    setAdding(true);
    const answer = await sendSpeakerAdd(fields);
    setAdding(false);
    if ("error" in answer) return setError(answer.error);
    setError(undefined);
    setFields(NEW_SPEAKER);
    onAdded(answer.speaker);
  };
  const addOnEnter = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    void add();
  };

  return (
    <div role="group" aria-labelledby={heading} className={own.addSpeaker} onKeyDown={addOnEnter}>
      <h2 id={heading} className={own.latestHeading}>
        Add a Speaker
      </h2>
      <SpeakerFieldset fields={fields} edit={(change) => setFields((now) => ({ ...now, ...change }))} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button type="button" variant="secondary" size="compact" onClick={add} disabled={adding}>
        Add Speaker
      </Button>
    </div>
  );
}
