"use client";

// The Iltifat editor's list's "Not yet marked" filter (#143), and the
// Supplication editor's (#271): while it is on, the list leaves out the
// Iltifat whose Marked Words both sides hold, or the Supplications with a span,
// each such item carrying the class that hides it (own.isMarked). The filter
// is shadcn/ui's Checkbox (#300).

import { useState, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import own from "./iltifat-editor.module.css";

export function MarkedFilter({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <>
      <label className={`${own.check} ${own.filter}`}>
        <Checkbox checked={on} onCheckedChange={(checked) => setOn(checked === true)} />
        <span>Not yet marked</span>
      </label>
      <div className={on ? own.notYetMarked : undefined}>{children}</div>
    </>
  );
}
