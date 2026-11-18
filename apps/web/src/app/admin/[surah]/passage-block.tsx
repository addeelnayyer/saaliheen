"use client";

// One Passage in the Passage editor (#44): a region named "Passage 83–88"
// holding its Passage heading (a chevron that collapses or expands it (#86),
// its titles, which open as title fields, with Join with above and ↑ / ↓ on
// every Passage but the Surah's first, and draggable onto another start) and
// its Ayahs, unless it is a Collapsed Passage. Ayah by Ayah, a ✂︎ sits in the
// gap before each Ayah but the first, which shows "Start at Ayah n" instead
// while a Passage heading is dragged over a place it may start. Flowing
// (flowing-ayahs.tsx) is for reading only: no ✂︎, and a heading that doesn't drag.
// In Phrases mode (#100) its Ayahs are Word cards Ayah by Ayah (phrase-ayah.tsx)
// and its heading shows its Phrase progress; while marking Allah references
// (#152) its Ayahs are Word cards Ayah by Ayah too, Allah references in gold.
// Ayah by Ayah, each Ayah a Tafsir entry starts at names the entry in each
// Language (`Tafsir entry: English 88–89 · Urdu 88`), and a ✂︎ inside an
// entry names the entry it would split (#235). Its chevron, titles, controls
// and ✂︎ are shadcn/ui Buttons (#299).

import { useLayoutEffect, useRef, type DragEvent } from "react";
import { written } from "@saaliheen/passages";
import { Button } from "@/components/ui/button";
import type { Phrase, PhraseColour } from "@saaliheen/dataset/types";
import { progressText, type Progress } from "@/admin/phrases";
import type { AyahText, Passage, Script } from "@/dataset/reader";
import { ScriptText } from "../../[lang]/[surah]/script-text";
import type { ShownTranslation } from "./editor-choices";
import { FlowingAyahs, translationLook } from "./flowing-ayahs";
import type { EditorActions } from "./passage-editor";
import { EditorButton } from "./editor-button";
import { AllahReferenceAyah, PhraseAyah } from "./phrase-ayah";
import type { TafsirMarks } from "./tafsir-marks";
import { TitleFields } from "./title-fields";
import styles from "./editor.module.css";

interface Props {
  surah: number;
  passage: Passage;
  /** Its place among the Surah's Passages, from 0. */
  index: number;
  canEarlier: boolean;
  canLater: boolean;
  /** Its Ayahs, once they have arrived. */
  ayahs: AyahText[];
  translation: ShownTranslation;
  /** The active Script, the one Flowing draws. */
  script: Script;
  /** Whether the Ayah layout is Flowing, not Ayah by Ayah. */
  flowing: boolean;
  /** Whether it shows only its Passage heading, as a Collapsed Passage. */
  collapsed: boolean;
  editing: boolean;
  /** Whether its Passage heading is being dragged: its Ayahs then shrink to a line each, so the places it may start at are near. */
  dragged: boolean;
  /** The Ayahs the Passage heading being dragged may start at. */
  drops: Set<number>;
  act: EditorActions;
  /** In Phrases mode, its Words' Phrase colours and its progress; null when Phrases mode is off. */
  phrases: PassagePhrases | null;
  /** While marking Allah references, the Surah's Allah references with the Admin's changes; null otherwise. */
  allahReferences: Set<string> | null;
  /** Where the Surah's Tafsir entries start, and where a new Passage would split one. */
  tafsir: TafsirMarks;
}

/** What a Passage shows in Phrases mode: its Words' Phrase colours, and its progress for its heading (undefined until known). */
export interface PassagePhrases {
  colours: Map<string, PhraseColour>;
  progress: Progress | undefined;
  /** The Words picked by tapping, as a run; null when none are. */
  picked: Phrase | null;
}

/** A Passage's classes: striped by its place, and shrunk while its heading is dragged. */
const passageClasses = (index: number, dragged: boolean) =>
  [styles.passage, index % 2 ? styles.odd : styles.even, dragged && styles.dragged].filter(Boolean).join(" ");

export function PassageBlock({ passage, index, canEarlier, canLater, editing, collapsed, flowing, dragged, act, ...shown }: Props) {
  return (
    <section aria-label={`Passage ${written(passage)}`} className={passageClasses(index, dragged)}>
      <PassageHeading
        passage={passage}
        first={index === 0}
        still={flowing}
        editing={editing}
        collapsed={collapsed}
        dragged={dragged}
        progress={shown.phrases?.progress}
        act={act}
      />
      {editing && (
        <TitleFields
          en={passage.en}
          ur={passage.ur}
          onSave={(en, ur) => {
            act.edit({ kind: "retitle", from: passage.from, en, ur });
            act.closeTitles();
          }}
          onCancel={act.closeTitles}
        />
      )}
      {index > 0 && <MoveControls passage={passage} canEarlier={canEarlier} canLater={canLater} act={act} />}
      {!collapsed && <PassageAyahs passage={passage} flowing={flowing} act={act} {...shown} />}
    </section>
  );
}

type AyahsProps = Pick<Props, "surah" | "passage" | "ayahs" | "translation" | "script" | "flowing" | "drops" | "act" | "phrases" | "allahReferences" | "tafsir">;

/** A Passage's Ayahs in the Ayah layout, or as Word cards Ayah by Ayah in Phrases mode and while marking Allah references. */
function PassageAyahs({ passage, ayahs, script, flowing, drops, act, tafsir, ...shown }: AyahsProps) {
  if (flowing) return <FlowingAyahs ayahs={ayahs} translation={shown.translation} script={script} />;
  return ayahs.map((ayah) => (
    <div key={ayah.number}>
      {ayah.number > passage.from && (
        <Gap from={passage.from} at={ayah.number} drop={drops.has(ayah.number)} splits={tafsir.splits.get(ayah.number)} act={act} />
      )}
      <TafsirStart entries={tafsir.starts.get(ayah.number)} />
      <ShownAyah ayah={ayah} act={act} {...shown} />
    </div>
  ));
}

type ShownProps = Pick<Props, "surah" | "translation" | "act" | "phrases" | "allahReferences"> & { ayah: AyahText };

/** One Ayah: Word cards in Phrases mode or while marking Allah references, else as the Ayah layout sets it out. */
function ShownAyah({ surah, ayah, translation, act, phrases, allahReferences }: ShownProps) {
  if (phrases) return <PhraseAyah surah={surah} ayah={ayah} translation={translation} colours={phrases.colours} picked={phrases.picked} onTap={act.tapWord} />;
  if (allahReferences) return <AllahReferenceAyah surah={surah} ayah={ayah} translation={translation} marked={allahReferences} onTap={act.tapAllahReference} />;
  return <AyahBlock surah={surah} ayah={ayah} translation={translation} />;
}

interface HeadingProps {
  passage: Passage;
  first: boolean;
  /** Whether it can't be dragged: Flowing is for reading only. */
  still: boolean;
  editing: boolean;
  collapsed: boolean;
  dragged: boolean;
  /** Its Phrase progress in Phrases mode; undefined when Phrases mode is off or it isn't known yet. */
  progress: Progress | undefined;
  act: EditorActions;
}

/**
 * Keeps a dragged Passage heading where the drag began: a drag opens it and the
 * Passage above (#86), which would otherwise push it, and the places it may
 * start at, away from the pointer. Then brings its own Passage, its Ayahs a
 * line each, fully into view, so the places below the heading can be reached.
 * `mark` notes where the heading is as the drag starts.
 */
function useHeldInPlace(dragged: boolean) {
  const ref = useRef<HTMLHeadingElement>(null);
  const top = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!dragged || top.current === null || !ref.current) return;
    window.scrollBy(0, ref.current.getBoundingClientRect().top - top.current);
    ref.current.parentElement?.scrollIntoView({ block: "nearest" });
    top.current = null;
  }, [dragged]);
  const mark = () => void (top.current = ref.current?.getBoundingClientRect().top ?? null);
  return { ref, mark };
}

function PassageHeading({ passage, first, still, editing, collapsed, dragged, progress, act }: HeadingProps) {
  const range = written(passage);
  const { ref, mark } = useHeldInPlace(dragged);
  const start = (e: DragEvent) => {
    mark();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", range);
    // Show the drop places once the drag has begun, not while it is starting.
    setTimeout(() => act.drag(passage.from));
  };
  return (
    <h2 ref={ref} className={styles.heading} draggable={!first && !still} onDragStart={start} onDragEnd={() => act.drag(null)}>
      <span className={styles.headline}>
        <Chevron range={range} collapsed={collapsed} onToggle={() => act.toggle(passage.from)} />
        {!editing && <TitleButton passage={passage} onEdit={() => act.editTitles(passage.from)} />}
      </span>
      <span className={styles.range}>Ayahs {range}</span>
      {progress && <span className={styles.progress} data-done={progress.marked === progress.size || undefined}>{progressText(progress)}</span>}
    </h2>
  );
}

/** The chevron that starts a Passage heading: ▾ while the Passage is open, ▸ while it is collapsed. */
function Chevron({ range, collapsed, onToggle }: { range: string; collapsed: boolean; onToggle: () => void }) {
  const label = `${collapsed ? "Expand" : "Collapse"} Passage ${range}`;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-sm text-[30px] leading-none font-semibold text-primary focus-visible:bg-accent focus-visible:text-accent-foreground"
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      onClick={onToggle}
    >
      <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
    </Button>
  );
}

/** A Passage's titles as its Passage heading shows them, opening its title fields. */
function TitleButton({ passage, onEdit }: { passage: Passage; onEdit: () => void }) {
  return (
    <Button
      variant="ghost"
      className="grid h-auto shrink justify-normal gap-0.5 px-2 py-1 text-[length:inherit] leading-[inherit] font-semibold whitespace-normal text-primary hover:text-primary focus-visible:bg-accent"
      aria-label={`Edit the Passage titles of ${written(passage)}`}
      onClick={onEdit}
    >
      <span className={passage.en ? undefined : styles.missing}>{passage.en || "No English title"}</span>
      <span lang="ur" dir="rtl" className={passage.ur ? styles.ur : styles.missing}>
        {passage.ur || "No Urdu title"}
      </span>
    </Button>
  );
}

function MoveControls({ passage, canEarlier, canLater, act }: { passage: Passage; canEarlier: boolean; canLater: boolean; act: EditorActions }) {
  const move = (to: number) => act.edit({ kind: "moveStart", from: passage.from, to });
  return (
    <div className={styles.controls}>
      <EditorButton onClick={() => act.edit({ kind: "join", from: passage.from })}>Join with above</EditorButton>
      <EditorButton aria-label="Start one Ayah earlier" title="Start one Ayah earlier" disabled={!canEarlier} onClick={() => move(passage.from - 1)}>
        ↑
      </EditorButton>
      <EditorButton aria-label="Start one Ayah later" title="Start one Ayah later" disabled={!canLater} onClick={() => move(passage.from + 1)}>
        ↓
      </EditorButton>
    </div>
  );
}

/** The Tafsir entries starting at an Ayah, in each Language: `Tafsir entry: English 88–89 · Urdu 88`. */
function TafsirStart({ entries }: { entries: string[] | undefined }) {
  if (!entries) return null;
  return <p className={styles.tafsirStart}>Tafsir entry: {entries.join(" · ")}</p>;
}

/** ✂︎: dashed and faint, and where there is hover, shown only while the pointer is over its gap or it has focus. */
const SPLIT =
  "h-auto gap-1 rounded-full border border-dashed border-border px-3 py-0.5 text-xs leading-[inherit] font-normal text-muted-foreground opacity-55 hover:bg-transparent hover:text-muted-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100";

/**
 * The gap before Ayah `at` inside the Passage starting at `from`: ✂︎, naming
 * the Tafsir entries a new Passage here would split, or a drop place while a
 * drag may start a Passage here.
 */
function Gap({ from, at, drop, splits, act }: { from: number; at: number; drop: boolean; splits: string[] | undefined; act: EditorActions }) {
  if (drop) {
    return (
      <div
        className={styles.drop}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          act.drop(at);
        }}
      >
        Start at Ayah {at}
      </div>
    );
  }
  return (
    <div className={`group ${styles.gap}`}>
      <Button variant="ghost" className={SPLIT} onClick={() => act.split(from, at)}>
        <span aria-hidden="true">✂︎</span> New Passage from Ayah {at}
      </Button>
      {splits && <span className={styles.insideTafsir}>inside {splits.join(" and ")}</span>}
    </div>
  );
}

function AyahBlock({ surah, ayah, translation }: { surah: number; ayah: AyahText; translation: ShownTranslation }) {
  return (
    <div className={styles.ayah}>
      <span className={styles.number}>
        {surah}:{ayah.number}
      </span>
      <ScriptText uthmani={ayah.uthmani} indopak={ayah.indopak}>
        {(text, scriptClass) => (
          <p className={`${styles.arabic} ${scriptClass}`} lang="ar" dir="rtl">
            {text}
          </p>
        )}
      </ScriptText>
      {translation !== "off" && (
        <p {...translationLook(translation)}>
          {ayah.translation[translation]}
        </p>
      )}
    </div>
  );
}
