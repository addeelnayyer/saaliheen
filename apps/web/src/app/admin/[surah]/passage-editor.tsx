"use client";

// The Passage editor (#44, Variant A): a Surah's Passages laid out like a
// Surah page, each Passage with its Passage heading and its Ayahs, every
// edit made through the Passages module's rules, and the Unpublished changes
// bar at the foot, whose one Publish writes them to Neon (#45, #171). The
// Ayahs come from the site's own static file for the Surah; the Passages are
// Neon's, with the Unpublished changes made on them. The toolbar at the top (#86)
// picks the Ayah translation and Ayah layout and collapses Passages: what
// the Admin sees, never the Passages. Its Phrases switch (#100) turns Phrases
// mode on: each open Passage's Ayahs as Word cards tinted with Neon's
// Phrases and the Phrase edits made on them, tapped to mark and edit Phrases.
// A refused edit says why in the Unpublished changes bar. Its Allah references
// switch (#152) turns marking Allah references on instead: the same Word
// cards, the Surah's Allah references in gold with the Admin's changes, a tap
// turning a Word into one or out of one. Those changes are kept apart from
// the Passage and Phrase edits (allah-reference-changes.ts), the one Publish
// sends both, and Undo steps back the changes of the mode in effect. Ayah by
// Ayah, it marks where the Surah's Tafsir entries start and end in each
// Language (#235), and Publish waits while any Passage splits one.

import { useEffect, useMemo, useState } from "react";
import { moveStart, type TafsirRanges } from "@saaliheen/passages";
import type { AyahText, Passage } from "@/dataset/reader";
import type { Phrase } from "@saaliheen/dataset/types";
import { phraseCut } from "@/admin/phrase-edits";
import { phrasesShown, type PhrasesShown } from "@/admin/phrases";
import { useHtmlAttribute } from "../../[lang]/reader-settings";
import { parseScript } from "../../[lang]/settings";
import type { PublishedSurah } from "@/passages/publish";
import { useAllahReferenceChanges, type AllahReferenceChanges } from "./allah-reference-changes";
import { ChangesBar } from "./changes-bar";
import { useCollapsedPassages } from "./collapsed-passages";
import { useAyahLayout, useShownTranslation } from "./editor-choices";
import { PassageBlock, type PassagePhrases } from "./passage-block";
import { UnmarkedDescription } from "./phrase-ayah";
import { markedAfter, type Edit } from "@/admin/passage-edits";
import { PhraseControls, usePhrasePicking } from "./phrase-controls";
import { summary, useUnpublishedChanges } from "./unpublished-changes";
import { tafsirMarks } from "./tafsir-marks";
import { usePublish } from "./use-publish";
import { Toolbar } from "./toolbar";
import styles from "./editor.module.css";

/** Surah `surah`'s Ayahs from /ayahs/<Surah>.json: null until they arrive, "failed" when they can't. */
function useAyahTexts(surah: number) {
  const [ayahs, setAyahs] = useState<AyahText[] | null | "failed">(null);
  useEffect(() => {
    let current = true;
    fetch(`/ayahs/${surah}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<AyahText[]>) : Promise.reject(new Error(String(res.status)))))
      .then((texts) => current && setAyahs(texts))
      .catch(() => current && setAyahs("failed"));
    return () => void (current = false);
  }, [surah]);
  return ayahs;
}

/** Whether the Passage starting at `from` may start at `to` instead: the Passages module accepts it, and it cuts none of `phrases`. */
function startsAt(passages: Passage[], phrases: Phrase[], from: number, to: number): boolean {
  const made = moveStart(passages, from, to);
  return !!made && !phraseCut(made.passages, phrases);
}

/** The Ayahs a drag of the Passage starting at Ayah `from` may drop on: where it may start instead. */
function dropPlaces(passages: Passage[], phrases: Phrase[], from: number | null): Set<number> {
  const i = passages.findIndex((p) => p.from === from);
  const [above, passage] = [passages[i - 1], passages[i]];
  if (!above || !passage) return new Set();
  const ayahs = Array.from({ length: passage.till - above.from + 1 }, (_, n) => above.from + n);
  return new Set(ayahs.filter((to) => startsAt(passages, phrases, passage.from, to)));
}

/** The starts of the Passages a drag of the one starting at `from` holds open: it and the one above. */
function heldOpen(passages: Passage[], from: number | null): number[] {
  const i = passages.findIndex((p) => p.from === from);
  return i < 0 ? [] : passages.slice(Math.max(i - 1, 0), i + 1).map((p) => p.from);
}

/** What Phrases mode shows over `passages`: nothing while it is off or the Ayahs haven't arrived. */
function shownPhrasesOf(on: boolean, surah: number, passages: Passage[], ayahs: AyahText[] | null | "failed", phrases: Phrase[]) {
  if (!on || !Array.isArray(ayahs)) return null;
  return phrasesShown(surah, passages, ayahs, phrases);
}

/** What Passage `passage` shows in Phrases mode, from what the Surah's Phrases show; null while Phrases mode is off. */
function phrasesFor(on: boolean, shown: PhrasesShown | { problem: string } | null, passage: Passage, picked: Phrase | null): PassagePhrases | null {
  if (!on) return null;
  if (!shown || "problem" in shown) return { colours: new Map(), progress: undefined, picked };
  return { colours: shown.colours, progress: shown.progress.get(passage.from), picked };
}

/** Which of its marking modes the Passage editor is in, if either: only one at a time, so a tap has one meaning. */
type Mode = "phrases" | "allah-references" | null;

/** What Undo steps back: the Allah reference changes while marking them, else the Passage and Phrase edits. */
function undoIn(allahMode: boolean, allah: AllahReferenceChanges, edits: { count: number; undo: () => void }) {
  return allahMode ? { can: allah.count > 0, undo: allah.undo } : { can: edits.count > 0, undo: edits.undo };
}

interface EditorProps {
  surah: number;
  ayahCount: number;
  /** The Surah as Neon held it when the page was read (#171): its Passage version, Passages, Phrases and Allah references. */
  opened: PublishedSurah;
  /** The Surah's Tafsir entry ranges in each Language when the page was read (#235); none when they couldn't be. */
  tafsir: TafsirRanges;
  /** Whether the Tafsir couldn't be read, so nothing is marked or checked against it here. */
  tafsirUnread: boolean;
}

export function PassageEditor({ surah, ayahCount, opened, tafsir, tafsirUnread }: EditorProps) {
  const { latest, feedback, publishing, publish } = usePublish(surah, opened);
  const base = useMemo(() => ({ passages: latest.passages, phrases: latest.phrases }), [latest.passages, latest.phrases]);
  const { changes, edit, undo, clear } = useUnpublishedChanges(surah, latest.version, base);
  // Why the last edit was refused, when the rules gave a reason.
  const [refusal, setRefusal] = useState<string | undefined>();
  const make = (e: Edit) => {
    const why = edit(e);
    setRefusal(why);
    return why;
  };
  const ayahs = useAyahTexts(surah);
  const [translation, setTranslation] = useShownTranslation();
  const [layout, setLayout] = useAyahLayout();
  // Read once here, not by every Flowing Passage: one watch on <html> for the active Script.
  const script = parseScript(useHtmlAttribute("data-script"));
  // The Passage whose title fields are open, and the one whose Passage heading is being dragged, by first Ayah.
  const [editing, setEditing] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const marked = markedAfter(base, changes);
  const passages = marked.passages;
  const collapsing = useCollapsedPassages(passages, latest.version);
  const drops = dropPlaces(passages, marked.phrases, dragging);
  const held = heldOpen(passages, dragging);
  const [mode, setMode] = useState<Mode>(null);
  const phrasesMode = mode === "phrases";
  const allahMode = mode === "allah-references";
  const allah = useAllahReferenceChanges(surah, latest.allahReferences);
  const shownPhrases = useMemo(
    () => shownPhrasesOf(phrasesMode, surah, passages, ayahs, marked.phrases),
    [phrasesMode, surah, passages, ayahs, marked.phrases],
  );
  const picking = usePhrasePicking(marked.phrases, make);
  // Both marking modes show Ayahs Ayah by Ayah, whichever layout is chosen.
  const flowing = layout === "flowing" && mode === null;

  /** Move the start of the Passage at `from` to `to`, its collapsed state going with it. */
  const move = (from: number, to: number) => {
    if (moveStart(passages, from, to) && !make({ kind: "moveStart", from, to })) collapsing.moved(from, to);
  };
  const act: EditorActions = {
    editTitles: (from: number) => setEditing(from),
    closeTitles: () => setEditing(null),
    edit: (e: Edit) => void (e.kind === "moveStart" ? move(e.from, e.to) : make(e)),
    split: (from: number, at: number) => {
      if (!make({ kind: "split", from, at })) setEditing(at);
    },
    drag: setDragging,
    drop: (to: number) => {
      if (dragging !== null) move(dragging, to);
      setDragging(null);
    },
    toggle: collapsing.toggle,
    tapWord: picking.tap,
    tapAllahReference: allah.tap,
  };
  const turn = (to: Mode) => (on: boolean) => {
    setMode(on ? to : null);
    picking.drop();
  };
  const marks = useMemo(() => tafsirMarks(tafsir), [tafsir]);
  const changesSummary = useMemo(
    () => summary(surah, ayahCount, base, changes, allah.count, tafsir),
    [surah, ayahCount, base, changes, allah.count, tafsir],
  );
  const undoing = undoIn(allahMode, allah, {
    count: changesSummary.count,
    undo: () => {
      undo();
      setRefusal(undefined);
    },
  });

  return (
    <div className={styles.editor}>
      <Toolbar
        translation={translation}
        onTranslation={setTranslation}
        layout={layout}
        onLayout={setLayout}
        collapsing={collapsing}
        phrases={phrasesMode}
        onPhrases={turn("phrases")}
        allahReferences={allahMode}
        onAllahReferences={turn("allah-references")}
      />
      <UnmarkedDescription />
      {shownPhrases && "problem" in shownPhrases && (
        <p role="alert" className={styles.note}>
          The Surah’s Phrases can’t be shown: {shownPhrases.problem}
        </p>
      )}
      {tafsirUnread && (
        <p role="alert" className={styles.note}>
          The Tafsir couldn’t be read, so its entries aren’t marked and the Passages aren’t checked against them here. A Publish checks them again.
        </p>
      )}
      {ayahs === "failed" && (
        <p role="alert" className={styles.note}>
          The Ayahs couldn’t be loaded. Reload to try again.
        </p>
      )}
      <div className={styles.passages}>
        {passages.map((passage, i) => (
          <PassageBlock
            key={passage.from}
            surah={surah}
            passage={passage}
            index={i}
            canEarlier={i > 0 && moveStart(passages, passage.from, passage.from - 1) !== null}
            canLater={i > 0 && moveStart(passages, passage.from, passage.from + 1) !== null}
            ayahs={Array.isArray(ayahs) ? ayahs.slice(passage.from - 1, passage.till) : []}
            translation={translation}
            script={script}
            flowing={flowing}
            collapsed={collapsing.collapsed.has(passage.from) && !held.includes(passage.from)}
            editing={editing === passage.from}
            dragged={dragging === passage.from}
            drops={drops}
            act={act}
            phrases={phrasesFor(phrasesMode, shownPhrases, passage, picking.picked)}
            allahReferences={allahMode ? allah.marked : null}
            tafsir={marks}
          />
        ))}
      </div>
      <ChangesBar
        {...changesSummary}
        allahCount={allah.count}
        canUndo={undoing.can}
        quiet={dragging !== null}
        onUndo={() => {
          undoing.undo();
          picking.drop();
        }}
        refusal={refusal}
        publishing={publishing}
        feedback={feedback}
        onPublish={() =>
          void publish(changes.edits, allah.taps, () => {
            clear();
            allah.clear();
          })
        }
      >
        <PhraseControls picking={picking.picking} onDelete={picking.remove} onMove={picking.moveEnd} onCancel={picking.drop} />
      </ChangesBar>
    </div>
  );
}

export type EditorActions = {
  editTitles: (from: number) => void;
  closeTitles: () => void;
  edit: (e: Edit) => void;
  split: (from: number, at: number) => void;
  drag: (from: number | null) => void;
  drop: (to: number) => void;
  /** Collapse or expand the Passage starting at `from`. */
  toggle: (from: number) => void;
  /** Tap the Word card at Word location `location`, in Phrases mode. */
  tapWord: (location: string) => void;
  /** Tap the Word card at Word location `location`, while marking Allah references. */
  tapAllahReference: (location: string) => void;
};
