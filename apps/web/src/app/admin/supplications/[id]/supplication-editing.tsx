"use client";

// What a Supplication's editor holds while an Admin edits (#201, #202, #271),
// shared by its parts: the fields as chosen, its spans among them, what was
// last saved, Save and Delete, and the Word a span was started at, which the
// next tap on a Word card ends it at (@/admin/span-taps).

import { useRouter } from "next/navigation";
import { createContext, use, useState, type FormEvent, type ReactNode } from "react";
import { tapped } from "@/admin/span-taps";
import type { Supplication } from "@/supplications/supplications";
import { SUPPLICATIONS_EDITOR } from "../editor-path";
import { changed, fieldsOf, sendDelete, sendSave, type Fields, type SaveStatus } from "./supplication-state";

interface Editing {
  fields: Fields;
  edit: (change: Partial<Fields>) => void;
  save: (event: FormEvent) => Promise<void>;
  remove: () => Promise<void>;
  status: SaveStatus;
  unsaved: boolean;
  /** The Word a span was started at, which the next tap on a later Word ends it at. */
  pending: string | undefined;
  /** Start, end or take out a span at the Word at `location`. */
  tap: (location: string) => void;
}

const EditingContext = createContext<Editing | null>(null);

/** The form's fields, what was last saved, Save and Delete. */
function useSupplicationSave(supplication: Supplication) {
  const router = useRouter();
  const [fields, setFields] = useState(() => fieldsOf(supplication));
  const [saved, setSaved] = useState(supplication);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const edit = (change: Partial<Fields>) => {
    setFields((now) => ({ ...now, ...change }));
    if (status.kind !== "stale") setStatus({ kind: "idle" });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setStatus({ kind: "saving" });
    const answer = await sendSave(supplication, fields, saved.version);
    if ("error" in answer) {
      // Saved since it was opened: the latest is the base now, so that Save again saves these choices over it.
      if (!answer.latest) return setStatus({ kind: "refused", error: answer.error });
      setSaved(answer.latest);
      return setStatus({ kind: "stale", error: answer.error, latest: answer.latest });
    }
    setFields(fieldsOf(answer.supplication));
    setSaved(answer.supplication);
    setStatus({ kind: "saved" });
    router.refresh();
  };

  const remove = async () => {
    setStatus({ kind: "saving" });
    const answer = await sendDelete(supplication, saved.version);
    if (answer === true) {
      setStatus({ kind: "deleted" });
      router.push(SUPPLICATIONS_EDITOR);
      return router.refresh();
    }
    if (!answer.latest) return setStatus({ kind: "refused", error: answer.error });
    setSaved(answer.latest);
    setStatus({ kind: "stale", error: answer.error, latest: answer.latest });
  };

  return { fields, edit, save, remove, status, unsaved: changed(fields, fieldsOf(saved)) };
}

/** Holds Supplication `supplication`'s editing for the parts of its editor inside it. */
export function SupplicationEditing({ supplication, children }: { supplication: Supplication; children: ReactNode }) {
  const editing = useSupplicationSave(supplication);
  const [pending, setPending] = useState<string>();
  const tap = (location: string) => {
    const next = tapped(editing.fields.spans, pending, location);
    setPending(next.pending);
    if (next.spans !== editing.fields.spans) editing.edit({ spans: next.spans });
  };
  return <EditingContext value={{ ...editing, pending, tap }}>{children}</EditingContext>;
}

/** The editing of the Supplication whose editor this part is in. */
export function useEditing(): Editing {
  const editing = use(EditingContext);
  if (!editing) throw new Error("a Supplication editor's part is used outside SupplicationEditing");
  return editing;
}
