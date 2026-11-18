"use client";

// An Iltifat's fields (#142): Reason, First Ayah, Last Ayah and Disputed, and
// Save, which sends them all, with its Marked Words (#143, marked on the Word
// cards), and the version they were opened at (./iltifat-editing.tsx). A save
// that passes says "Saved" and redraws the page from Neon, the run's Word
// cards with it; a refused save shows the server's sentence as an alert and
// keeps the edits. Previous and Next, and leaving the page, ask first while
// there are unsaved changes, through the browser's own confirmation. Its
// fields and buttons are shadcn/ui's (#300).

import Link from "next/link";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Iltifat } from "@/iltifat/iltifat";
import styles from "../../admin.module.css";
import { useLeaveWarning } from "../../leave-warning";
import own from "../iltifat-editor.module.css";
import { useEditing } from "./iltifat-editing";
import type { SaveStatus } from "./iltifat-state";

const LEAVE = "This Iltifat has unsaved changes. Leave it without saving them?";

/** Previous or Next: a link that asks first while there are unsaved changes. */
function Neighbour({ href, unsaved, children }: { href: string | undefined; unsaved: boolean; children: string }) {
  if (!href) return <span />;
  const ask = (event: MouseEvent) => {
    if (unsaved && !window.confirm(LEAVE)) event.preventDefault();
  };
  return (
    <Button asChild variant="outline" className="h-auto bg-transparent px-3 py-2 text-[length:inherit] font-normal shadow-none hover:bg-secondary">
      <Link href={href} prefetch={false} onClick={ask}>
        {children}
      </Link>
    </Button>
  );
}

function SaveState({ status }: { status: SaveStatus }) {
  return (
    <>
      <p role="status" className={own.status}>
        {status.kind === "saving" ? "Saving…" : status.kind === "saved" ? "Saved" : ""}
      </p>
      {status.kind === "refused" && (
        <p role="alert" className={styles.error}>
          {status.error}
        </p>
      )}
    </>
  );
}

interface Props {
  iltifat: Iltifat;
  ayahCount: number;
  previous?: string;
  next?: string;
}

export function IltifatForm({ iltifat, ayahCount, previous, next }: Props) {
  const { fields, edit, save, status, unsaved } = useEditing();
  useLeaveWarning(unsaved);
  return (
    <>
      <form className={own.form} onSubmit={save} noValidate>
        <label className={own.field}>
          <span className={own.label}>Reason</span>
          <Textarea className="leading-(--lh)" rows={5} value={fields.reason} onChange={(e) => edit({ reason: e.target.value })} />
        </label>
        <fieldset className={own.runFields}>
          <legend className={own.label}>
            Run, within Surah {iltifat.surah} (Ayahs 1 to {ayahCount}), holding the cited Ayah {iltifat.surah}:{iltifat.citedAyah}
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
        <label className={own.check}>
          <Checkbox checked={fields.disputed} onCheckedChange={(checked) => edit({ disputed: checked === true })} />
          <span>Disputed</span>
        </label>
        <Button type="submit" size="wide" disabled={status.kind === "saving"}>
          Save
        </Button>
        <SaveState status={status} />
      </form>
      <nav className={own.neighbours} aria-label="Iltifat">
        <Neighbour href={previous} unsaved={unsaved}>
          Previous Iltifat
        </Neighbour>
        <Neighbour href={next} unsaved={unsaved}>
          Next Iltifat
        </Neighbour>
      </nav>
    </>
  );
}
