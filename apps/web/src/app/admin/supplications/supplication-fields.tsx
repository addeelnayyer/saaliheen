"use client";

// A Supplication's fields (#201, #202), as its editor and the add of a new
// one draw them: its Speaker, chosen from the Speakers or added there and
// then; its Openings, one or more; its kind; and its run, First and Last Ayah.
// Its fields and buttons are shadcn/ui's (#300); the choices are native selects.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { OPENINGS, SUPPLICATION_KINDS, type SupplicationKind } from "@/supplications/kinds";
import type { Speaker } from "@/supplications/supplications";
import { kindLabel, OPENING_LABEL, toggledOpening, type Fields } from "./[id]/supplication-state";
import { AddSpeaker } from "./speakers/speaker-fields";
import own from "./supplication-editor.module.css";

type Edit = (change: Partial<Fields>) => void;

/** The Speaker, chosen from `speakers` (by name), with "Add a Speaker" to add one and choose it. */
function SpeakerPicker({ speakerId, speakers, edit }: { speakerId: string; speakers: Speaker[]; edit: Edit }) {
  const [added, setAdded] = useState<Speaker[]>([]);
  const [adding, setAdding] = useState(false);
  const choices = [...speakers, ...added].toSorted((a, b) => a.nameEn.localeCompare(b.nameEn));
  return (
    <div className={own.field}>
      <label className={own.field}>
        <span className={own.label}>Speaker</span>
        <NativeSelect value={speakerId} onChange={(e) => edit({ speakerId: e.target.value })}>
          {speakerId === "" && <NativeSelectOption value="">Choose a Speaker</NativeSelectOption>}
          {choices.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.nameEn}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      {adding ? (
        <AddSpeaker
          onAdded={(speaker) => {
            setAdded((now) => [...now, speaker]);
            setAdding(false);
            edit({ speakerId: speaker.id });
          }}
        />
      ) : (
        <Button type="button" variant="secondary" size="compact" className="justify-self-start" onClick={() => setAdding(true)}>
          Add a Speaker
        </Button>
      )}
    </div>
  );
}

function OpeningChoices({ openings, edit }: Pick<Fields, "openings"> & { edit: Edit }) {
  return (
    <fieldset className={own.openings}>
      <legend className={own.label}>Openings</legend>
      {OPENINGS.map((opening) => (
        <label key={opening} className={own.check}>
          <Checkbox checked={openings.includes(opening)} onCheckedChange={() => edit({ openings: toggledOpening(openings, opening) })} />
          <span>{OPENING_LABEL[opening]}</span>
        </label>
      ))}
    </fieldset>
  );
}

function KindChoice({ kind, edit }: Pick<Fields, "kind"> & { edit: Edit }) {
  return (
    <label className={own.field}>
      <span className={own.label}>Kind</span>
      <NativeSelect value={kind} onChange={(e) => edit({ kind: e.target.value as SupplicationKind })}>
        {SUPPLICATION_KINDS.map((k) => (
          <NativeSelectOption key={k} value={k}>
            {kindLabel(k)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}

function RunChoice({ fields, edit, surah, surahName, ayahCount }: { fields: Fields; edit: Edit; surah: number; surahName: string; ayahCount: number }) {
  return (
    <fieldset className={own.runFields}>
      <legend className={own.label}>
        Run, within {surahName} (Surah {surah}, Ayahs 1 to {ayahCount})
      </legend>
      <label className={own.field}>
        <span className={own.label}>First Ayah</span>
        <Input type="number" inputMode="numeric" min={1} max={ayahCount} value={fields.ayahFrom} onChange={(e) => edit({ ayahFrom: e.target.value })} />
      </label>
      <label className={own.field}>
        <span className={own.label}>Last Ayah</span>
        <Input type="number" inputMode="numeric" min={1} max={ayahCount} value={fields.ayahTo} onChange={(e) => edit({ ayahTo: e.target.value })} />
      </label>
    </fieldset>
  );
}

interface Props {
  fields: Fields;
  edit: Edit;
  /** Every Speaker. */
  speakers: Speaker[];
  surah: number;
  surahName: string;
  ayahCount: number;
}

/** A Supplication's Speaker, Openings, kind and run, within Surah `surah`. */
export function SupplicationFields({ fields, edit, speakers, ...surah }: Props) {
  return (
    <>
      <SpeakerPicker speakerId={fields.speakerId} speakers={speakers} edit={edit} />
      <OpeningChoices openings={fields.openings} edit={edit} />
      <KindChoice kind={fields.kind} edit={edit} />
      <RunChoice fields={fields} edit={edit} {...surah} />
    </>
  );
}
