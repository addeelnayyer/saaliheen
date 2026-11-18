// Collapsed Passages in the Passage editor (#86), by each Passage's first Ayah.
// The state follows a Passage through edits: a Passage that leaves (joined
// into the one above) takes its state with it, so one that Undo or a split
// brings back starts open; a Passage whose start moves keeps its state
// (`moved`). It isn't kept anywhere: every Surah opens fully expanded, and a
// Publish, which brings the Surah's new Passage version, opens every Passage again.

import { useState } from "react";
import type { Passage } from "@/dataset/reader";

const NONE: ReadonlySet<number> = new Set();

/** `collapsed` without the starts no Passage in `passages` has. */
const within = (collapsed: ReadonlySet<number>, passages: Passage[]) =>
  new Set(passages.map((p) => p.from).filter((from) => collapsed.has(from)));

/** `collapsed` with the Passage that started at `from` now starting at `to`. */
function movedIn(collapsed: ReadonlySet<number>, from: number, to: number) {
  if (!collapsed.has(from)) return collapsed;
  const next = new Set(collapsed);
  next.delete(from);
  next.add(to);
  return next;
}

/** `collapsed` with the Passage starting at `from` toggled. */
function toggledIn(collapsed: ReadonlySet<number>, from: number) {
  const next = new Set(collapsed);
  if (!next.delete(from)) next.add(from);
  return next;
}

/** Which Passages are collapsed, and the ways to change that. */
export type CollapsedPassages = ReturnType<typeof useCollapsedPassages>;

/** Which of `passages`, Neon's at Passage version `version` with the Unpublished changes made, are collapsed, and the ways to change that. */
export function useCollapsedPassages(passages: Passage[], version: number) {
  const [collapsed, setCollapsed] = useState(NONE);
  const starts = passages.map((p) => p.from).join();
  // Adjusted as the Passages change, while rendering: a new version opens every Passage.
  const [seen, setSeen] = useState({ version, starts });
  if (seen.version !== version || seen.starts !== starts) {
    setSeen({ version, starts });
    setCollapsed(seen.version === version ? within(collapsed, passages) : NONE);
  }
  const count = within(collapsed, passages).size;
  return {
    collapsed,
    allCollapsed: count === passages.length,
    noneCollapsed: count === 0,
    toggle: (from: number) => setCollapsed((c) => toggledIn(c, from)),
    collapseAll: () => setCollapsed(new Set(passages.map((p) => p.from))),
    expandAll: () => setCollapsed(NONE),
    moved: (from: number, to: number) => setCollapsed((c) => movedIn(c, from, to)),
  };
}
