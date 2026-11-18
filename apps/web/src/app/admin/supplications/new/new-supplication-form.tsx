"use client";

// A new Supplication's fields (#202): its Surah, then the fields a
// Supplication's editor has. Add sends them; an add that passes opens the new
// Supplication's editor, and a refused one shows the server's sentence as an
// alert and keeps the choices. Leaving the page asks first once anything is
// chosen. Its fields and buttons are shadcn/ui's (#300).

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SurahName } from "@/dataset/reader";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Speaker } from "@/supplications/supplications";
import styles from "../../admin.module.css";
import { useLeaveWarning } from "../../leave-warning";
import { changed, NEW_FIELDS, sendAdd, type Fields } from "../[id]/supplication-state";
import { editorPath } from "../editor-path";
import { SupplicationFields } from "../supplication-fields";
import own from "../supplication-editor.module.css";

type AddStatus = { kind: "idle" } | { kind: "adding" } | { kind: "added" } | { kind: "refused"; error: string };

export function NewSupplicationForm({ speakers, surahs }: { speakers: Speaker[]; surahs: SurahName[] }) {
  const router = useRouter();
  const [surah, setSurah] = useState(1);
  const [fields, setFields] = useState(NEW_FIELDS);
  const [status, setStatus] = useState<AddStatus>({ kind: "idle" });
  useLeaveWarning(status.kind !== "added" && changed(fields, NEW_FIELDS));
  const { nameLatin, ayahCount } = surahs[surah - 1];

  const edit = (change: Partial<Fields>) => {
    setFields((now) => ({ ...now, ...change }));
    setStatus({ kind: "idle" });
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setStatus({ kind: "adding" });
    const answer = await sendAdd(surah, fields);
    if ("error" in answer) return setStatus({ kind: "refused", error: answer.error });
    setStatus({ kind: "added" });
    router.push(editorPath(answer.supplication.id));
  };

  return (
    <form className={own.form} onSubmit={add} noValidate>
      <label className={own.field}>
        <span className={own.label}>Surah</span>
        <NativeSelect value={surah} onChange={(e) => setSurah(Number(e.target.value))}>
          {surahs.map((s) => (
            <NativeSelectOption key={s.number} value={s.number}>
              {s.number}. {s.nameLatin}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <SupplicationFields fields={fields} edit={edit} speakers={speakers} surah={surah} surahName={nameLatin} ayahCount={ayahCount} />
      <Button type="submit" size="wide" disabled={status.kind === "adding" || status.kind === "added"}>
        Add
      </Button>
      <p role="status" className={own.status}>
        {status.kind === "adding" ? "Adding…" : status.kind === "added" ? "Added" : ""}
      </p>
      {status.kind === "refused" && (
        <p role="alert" className={styles.error}>
          {status.error}
        </p>
      )}
    </form>
  );
}
