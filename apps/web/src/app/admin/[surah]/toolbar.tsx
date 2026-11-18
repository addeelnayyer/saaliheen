"use client";

// The Passage editor's toolbar (#86), stuck to the top of the window: the
// Ayah translation switch (Off · Urdu · English), the Ayah layout switch (Ayah
// by Ayah · Flowing), the Phrases switch that turns Phrases mode on and off
// (#100), and the Expand all / Collapse all icon buttons, each disabled when it
// would change nothing. Beside the Phrases switch, the Allah references switch
// turns marking Allah references on and off (#152); at most one of the two is
// on. On a phone it wraps to two rows, the switches on one and the Phrases and
// Allah references switches and the icons on the other. Each choice is a
// shadcn/ui Toggle and each icon a Button (#299); the Phrases and Allah
// references switches are Toggles too, as switches, their names on them.

import { SHARE_LAYOUTS, type ShareLayout } from "@saaliheen/share";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type { CollapsedPassages } from "./collapsed-passages";
import { TRANSLATIONS, type ShownTranslation } from "./editor-choices";
import styles from "./editor.module.css";

const TRANSLATION_NAME: Record<ShownTranslation, string> = { off: "Off", ur: "Urdu", en: "English" };
const LAYOUT_NAME: Record<ShareLayout, string> = { "ayah-by-ayah": "Ayah by Ayah", flowing: "Flowing" };

/** A choice's padding on a phone, narrower than its pill's. */
const PHONE_CHOICE = "[@media(max-width:600px)]:px-2";

/** A switch named `name` among `options`, each shown by its `names` entry, `value` chosen. */
function Switch<T extends string>(props: { name: string; options: readonly T[]; names: Record<T, string>; value: T; onChange: (value: T) => void }) {
  const { name, options, names, value, onChange } = props;
  return (
    <div role="group" aria-label={name} className={styles.switch}>
      <span aria-hidden="true" className={styles.switchName}>
        {name}
      </span>
      {options.map((o) => (
        <Toggle key={o} variant="pill" size="pill" className={PHONE_CHOICE} pressed={value === o} onPressedChange={() => onChange(o)}>
          {names[o]}
        </Toggle>
      ))}
    </div>
  );
}

/** An icon button with no words: its aria-label names it and its tooltip says it. */
function IconButton({ label, icon, disabled, onClick }: { label: string; icon: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" size="icon" className="text-lg leading-none font-normal disabled:opacity-40" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}

/**
 * An on/off switch named `name`, its name on it. On a phone the Phrases and Allah references switches sit
 * side by side (#152), and the one that `endsSwitches` pushes the icons after it to the end.
 */
function OnOff({ name, on, onChange, endsSwitches }: { name: string; on: boolean; onChange: (on: boolean) => void; endsSwitches?: boolean }) {
  return (
    <Toggle
      variant="pill"
      size="pill"
      role="switch"
      // A switch says it is on with aria-checked: Radix spreads these props after its own aria-pressed, so undefined drops it.
      aria-pressed={undefined}
      aria-checked={on}
      className={cn("text-sm [@media(max-width:600px)]:px-2.5 [@media(max-width:600px)]:text-[13px]", endsSwitches && "[@media(max-width:600px)]:me-auto")}
      pressed={on}
      onPressedChange={onChange}
    >
      {name}
    </Toggle>
  );
}

interface Props {
  translation: ShownTranslation;
  onTranslation: (value: ShownTranslation) => void;
  layout: ShareLayout;
  onLayout: (value: ShareLayout) => void;
  /** Whether Phrases mode is on (#100). */
  phrases: boolean;
  onPhrases: (on: boolean) => void;
  /** Whether marking Allah references is on (#152). */
  allahReferences: boolean;
  onAllahReferences: (on: boolean) => void;
  /** Which Passages are collapsed: Expand all and Collapse all read and change it. */
  collapsing: Pick<CollapsedPassages, "allCollapsed" | "noneCollapsed" | "expandAll" | "collapseAll">;
}

export function Toolbar(props: Props) {
  const { allCollapsed, noneCollapsed, expandAll, collapseAll } = props.collapsing;
  return (
    <div role="toolbar" aria-label="Review Passages" className={styles.toolbar}>
      <div className={styles.switches}>
        <Switch name="Ayah translation" options={TRANSLATIONS} names={TRANSLATION_NAME} value={props.translation} onChange={props.onTranslation} />
        <Switch name="Ayah layout" options={SHARE_LAYOUTS} names={LAYOUT_NAME} value={props.layout} onChange={props.onLayout} />
      </div>
      <div className={styles.icons}>
        <OnOff name="Phrases" on={props.phrases} onChange={props.onPhrases} />
        <OnOff name="Allah references" on={props.allahReferences} onChange={props.onAllahReferences} endsSwitches />
        <IconButton label="Expand all Passages" icon="⊞" disabled={noneCollapsed} onClick={expandAll} />
        <IconButton label="Collapse all Passages" icon="⊟" disabled={allCollapsed} onClick={collapseAll} />
      </div>
    </div>
  );
}
