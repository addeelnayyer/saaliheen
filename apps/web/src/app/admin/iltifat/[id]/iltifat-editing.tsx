"use client";

// What an Iltifat's editor holds while an Admin edits (#142, #143), shared by
// its parts: the fields as edited, what was last saved, Save, and the side,
// "from" or "to", that a tap on a Word card marks. A save that passes redraws
// the page from Neon; a refused one keeps the edits.

import { useRouter } from "next/navigation";
import { createContext, use, useState, type FormEvent, type ReactNode } from "react";
import type { Iltifat, IltifatDirection } from "@/iltifat/iltifat";
import type { Side } from "@/iltifat/marked-words";
import { changed, fieldsOf, sendSave, toggledMark, type Fields, type SaveStatus } from "./iltifat-state";

interface Editing {
  direction: IltifatDirection;
  fields: Fields;
  edit: (change: Partial<Fields>) => void;
  save: (event: FormEvent) => Promise<void>;
  status: SaveStatus;
  unsaved: boolean;
  /** The side a tap on a Word card marks. */
  side: Side;
  chooseSide: (side: Side) => void;
  /** Mark the Word at `location` on the chosen side, or take it out when it is marked. */
  tap: (location: string) => void;
}

const EditingContext = createContext<Editing | null>(null);

/** The form's fields, what was last saved, and Save. */
function useIltifatSave(iltifat: Iltifat) {
  const router = useRouter();
  const [fields, setFields] = useState(() => fieldsOf(iltifat));
  const [saved, setSaved] = useState(iltifat);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const edit = (change: Partial<Fields>) => {
    setFields((now) => ({ ...now, ...change }));
    setStatus({ kind: "idle" });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setStatus({ kind: "saving" });
    const answer = await sendSave(iltifat.id, fields, saved.version);
    if ("error" in answer) return setStatus({ kind: "refused", error: answer.error });
    setFields(fieldsOf(answer.iltifat));
    setSaved(answer.iltifat);
    setStatus({ kind: "saved" });
    router.refresh();
  };

  return { fields, edit, save, status, unsaved: changed(fields, fieldsOf(saved)) };
}

/** Holds Iltifat `iltifat`'s editing for the parts of its editor inside it. */
export function IltifatEditing({ iltifat, children }: { iltifat: Iltifat; children: ReactNode }) {
  const editing = useIltifatSave(iltifat);
  const [side, chooseSide] = useState<Side>("from");
  const tap = (location: string) => editing.edit({ markedWords: toggledMark(editing.fields.markedWords, location, side) });
  return <EditingContext value={{ ...editing, direction: iltifat.direction, side, chooseSide, tap }}>{children}</EditingContext>;
}

/** The editing of the Iltifat whose editor this part is in. */
export function useEditing(): Editing {
  const editing = use(EditingContext);
  if (!editing) throw new Error("an Iltifat editor's part is used outside IltifatEditing");
  return editing;
}
