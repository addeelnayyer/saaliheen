"use client";

// The reader settings' controls (shadcn/ui's ToggleGroup, Switch and Button, #305), shown in the Settings drawer: the Arabic size
// and Meaning size steppers, Reset sizes, the Script and theme switches and the
// Ayah translation, Phrase colours, Allah reference colour, Known words colour (#250) and Hide Word meanings switches, Section marks (#194); and, on the Surah bar's full
// form, the Ayah layout switch (#125). <html>'s data attributes are the one source of
// truth: the pre-paint script sets them from storage, these controls read them
// and, when clicked, change them and store the choice. Which option looks
// selected is CSS on those attributes (site-bar.module.css) as well as ARIA
// state, so a control shows the saved setting in the first frame it is drawn.

import { useId, useRef, useSyncExternalStore, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Script } from "@/dataset/reader";
import {
  AYAH_LAYOUTS,
  DEFAULT_SIZE,
  parseAyahLayout,
  parseScript,
  parseSectionMarks,
  parseSize,
  SECTION_MARKS,
  SIZE_ATTRIBUTE,
  SIZES,
  STORED_AS,
  type AyahLayout,
  type SectionMarksMode,
  type SizeSetting,
  type Theme,
} from "./settings";
import { store } from "./storage";
import { saveToAccount } from "./synced-settings";
import { STRINGS } from "./strings";
import styles from "./site-bar.module.css";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-script", "data-translation", "data-theme", "data-phrase-colours", "data-allah-reference-colour", "data-known-words-colour", "data-hide-word-meanings", "data-ayah-layout", "data-section-marks", ...Object.values(SIZE_ATTRIBUTE)],
  });
  return () => observer.disconnect();
}

/** One of <html>'s attributes; null while prerendering, as if nothing were stored. */
export const useHtmlAttribute = (name: string) =>
  useSyncExternalStore(
    subscribe,
    () => document.documentElement.getAttribute(name),
    () => null,
  );

const setAttribute = (name: string, value: string | null) => {
  if (value === null) document.documentElement.removeAttribute(name);
  else document.documentElement.setAttribute(name, value);
};

/**
 * A segmented switch: a ToggleGroup of one button per value, the chosen one
 * pressed. Choosing the pressed one again keeps it.
 */
function Segmented<V extends Script | Theme | AyahLayout | SectionMarksMode>({ values, value, onChoose, label, className }: { values: readonly V[]; value: V; onChoose: (value: V) => void; label: string; className: string }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(chosen) => chosen && onChoose(chosen as V)}
      rovingFocus={false}
      variant="segment"
      size="segment"
      className={`rounded-full bg-secondary p-[3px] ${className}`}
      aria-label={label}
    >
      {values.map((v) => (
        <ToggleGroupItem key={v} value={v} data-value={v}>
          {STRINGS[v]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function ScriptSwitch() {
  const script: Script = parseScript(useHtmlAttribute("data-script"));
  const choose = (value: Script) => {
    setAttribute("data-script", value);
    store(STORED_AS.script, value);
    saveToAccount({ script: value });
  };
  return <Segmented values={["uthmani", "indopak"] as const} value={script} onChoose={choose} label={STRINGS.scriptLabel} className={styles.scriptSeg} />;
}

export function ThemeSwitch() {
  const attribute = useHtmlAttribute("data-theme");
  const theme: Theme = attribute === "light" || attribute === "dark" ? attribute : "system";
  const choose = (value: Theme) => {
    const stored = value === "system" ? null : value;
    setAttribute("data-theme", stored);
    store(STORED_AS.theme, stored);
  };
  return <Segmented values={["system", "light", "dark"] as const} value={theme} onChoose={choose} label={STRINGS.themeLabel} className={styles.themeSeg} />;
}

/**
 * An on/off switch, its label written on it. `setting`, for a reader setting,
 * names the <html> attribute it sets, which the stylesheet draws the switch on
 * or off by, so it already looks right at first paint; without one, the switch
 * is drawn by its own state.
 */
export function OnOffSwitch({
  setting,
  on,
  onToggle,
  label,
  disabled,
  describedBy,
}: {
  setting?: string;
  on: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <Switch
      checked={on}
      onCheckedChange={onToggle}
      data-setting={setting}
      className={setting && styles.setting}
      disabled={disabled}
      aria-describedby={describedBy}
    >
      {label}
    </Switch>
  );
}

export function TranslationSwitch() {
  const on = useHtmlAttribute("data-translation") === "on";
  const toggle = () => {
    const value = on ? "off" : "on";
    setAttribute("data-translation", value);
    store(STORED_AS.translation, value);
  };
  return <OnOffSwitch setting="translation" on={on} onToggle={toggle} label={STRINGS.translation} />;
}

/**
 * An on/off switch that is on unless switched off, drawn and set by <html>'s
 * `data-<setting>` and kept on this device only, never saved to an Account.
 */
function OnUnlessOffSwitch({ setting, storedAs, label, disabled, describedBy }: { setting: "phrase-colours" | "allah-reference-colour"; storedAs: string; label: string; disabled?: boolean; describedBy?: string }) {
  const attribute = `data-${setting}`;
  const on = useHtmlAttribute(attribute) !== "off";
  const toggle = () => {
    setAttribute(attribute, on ? "off" : "on");
    store(storedAs, on ? "off" : null);
  };
  return <OnOffSwitch setting={setting} on={on} onToggle={toggle} label={label} disabled={disabled} describedBy={describedBy} />;
}

/**
 * Phrase colours (#99): the tints on the Word cards of covered Passages. While
 * Known words colour is on they are not drawn, so the switch is greyed out,
 * with a note, keeping the reader's own choice for when it is off again.
 */
export function PhraseColoursSwitch() {
  const knownWords = useHtmlAttribute("data-known-words-colour") === "on";
  const note = useId();
  return (
    <>
      <OnUnlessOffSwitch setting="phrase-colours" storedAs={STORED_AS.phraseColours} label={STRINGS.phraseColours} disabled={knownWords} describedBy={knownWords ? note : undefined} />
      <span id={note} className={`${styles.switchNote} ${styles.knownWordsNote}`}>
        {STRINGS.phraseColoursKnownNote}
      </span>
    </>
  );
}

/** Allah reference colour (#148): the gold on every Allah reference's Arabic. */
export const AllahReferenceColourSwitch = () => <OnUnlessOffSwitch setting="allah-reference-colour" storedAs={STORED_AS.allahReferenceColour} label={STRINGS.allahReferenceColour} />;

/**
 * An on/off switch that is off unless switched on, drawn and set by <html>'s
 * `data-<setting>` and kept on this device only, never saved to an Account.
 */
function OffUnlessOnSwitch({ setting, storedAs, label, disabled, describedBy }: { setting: "known-words-colour" | "hide-word-meanings"; storedAs: string; label: string; disabled?: boolean; describedBy?: string }) {
  const attribute = `data-${setting}`;
  const on = useHtmlAttribute(attribute) === "on";
  const toggle = () => {
    setAttribute(attribute, on ? "off" : "on");
    store(storedAs, on ? null : "on");
  };
  return <OnOffSwitch setting={setting} on={on} onToggle={toggle} label={label} disabled={disabled} describedBy={describedBy} />;
}

/**
 * Known words colour (#250): a green tint behind every Word of a Known Root
 * on the Surah page, off unless switched on, kept on this device only.
 */
export const KnownWordsColourSwitch = () => <OffUnlessOnSwitch setting="known-words-colour" storedAs={STORED_AS.knownWordsColour} label={STRINGS.knownWordsColour} />;

/**
 * Hide Word meanings (#256): every Word card in Study without its Word meaning,
 * off unless switched on, kept on this device only. Flowing shows no Word
 * meanings, so there the switch is greyed out, with a note that it applies to
 * Study; the stylesheet shows both by data-ayah-layout, from the first frame.
 */
export function HideWordMeaningsSwitch() {
  const flowing = parseAyahLayout(useHtmlAttribute("data-ayah-layout")) === "flowing";
  const note = useId();
  return (
    <>
      <OffUnlessOnSwitch setting="hide-word-meanings" storedAs={STORED_AS.hideWordMeanings} label={STRINGS.hideWordMeanings} disabled={flowing} describedBy={flowing ? note : undefined} />
      <span id={note} className={`${styles.switchNote} ${styles.studyNote}`}>
        {STRINGS.hideWordMeaningsNote}
      </span>
    </>
  );
}

/**
 * The Ayah layout (#125): Study or Flowing, on the Surah bar's full form. Kept
 * on this device only, never in the URL and never saved to an Account; the
 * Surah page's CSS reads data-ayah-layout on <html>. `keepInPlace` wraps the
 * switching, for the Surah page to keep its Ayah at the top of the screen there.
 */
export function AyahLayoutSwitch({ keepInPlace }: { keepInPlace: (change: () => void) => void }) {
  const layout = parseAyahLayout(useHtmlAttribute("data-ayah-layout"));
  const choose = (value: AyahLayout) => {
    keepInPlace(() => setAttribute("data-ayah-layout", value));
    store(STORED_AS.ayahLayout, value === "study" ? null : value);
  };
  return <Segmented values={AYAH_LAYOUTS} value={layout} onChoose={choose} label={STRINGS.ayahLayoutLabel} className={styles.layoutSeg} />;
}

/**
 * Section marks (#194): Hizb quarters or Rukus. Kept on this device only, never
 * saved to an Account; the Surah page draws both kinds of mark and its CSS shows
 * the one data-section-marks on <html> names, so switching draws no Ayah again.
 */
export function SectionMarksSwitch() {
  const mode = parseSectionMarks(useHtmlAttribute("data-section-marks"));
  const choose = (value: SectionMarksMode) => {
    setAttribute("data-section-marks", value);
    store(STORED_AS.sectionMarks, value === "hizb" ? null : value);
  };
  return <Segmented values={SECTION_MARKS} value={mode} onChoose={choose} label={STRINGS.sectionMarksLabel} className={styles.marksSeg} />;
}

const chooseSize = (setting: SizeSetting, value: number) => {
  setAttribute(SIZE_ATTRIBUTE[setting], String(value));
  store(STORED_AS[setting], value === DEFAULT_SIZE ? null : String(value));
};

/**
 * Arabic size or Meaning size: − and + over the fixed steps, with the current
 * step between them, announced politely. A button is disabled at its end of
 * the steps; reaching it hands focus to the other button, so focus never drops
 * out of the drawer.
 */
export function SizeStepper({ setting, className }: { setting: SizeSetting; className?: string }) {
  const size = parseSize(useHtmlAttribute(SIZE_ATTRIBUTE[setting]));
  const step = SIZES.indexOf(size);
  const smaller = useRef<HTMLButtonElement>(null);
  const larger = useRef<HTMLButtonElement>(null);
  const label = STRINGS[setting];
  const go = (by: -1 | 1) => {
    const next = step + by;
    chooseSize(setting, SIZES[next]);
    if (next === 0) larger.current?.focus();
    if (next === SIZES.length - 1) smaller.current?.focus();
  };
  return (
    <div className={className} role="group" aria-label={label}>
      <span className={styles.stepLabel} aria-hidden="true">
        {label}
      </span>
      <span className={styles.stepper}>
        <StepButton ref={smaller} aria-label={STRINGS.smaller} disabled={step === 0} onClick={() => go(-1)}>
          −
        </StepButton>
        <output aria-live="polite">{STRINGS.percent(size)}</output>
        <StepButton ref={larger} aria-label={STRINGS.larger} disabled={step === SIZES.length - 1} onClick={() => go(1)}>
          +
        </StepButton>
      </span>
    </div>
  );
}

/** A size stepper's − or +: the accent on a raised paper chip, greyed out flat at its end of the steps. */
const StepButton = (props: ComponentProps<typeof Button>) => (
  <Button
    variant="ghost"
    className="h-[26px] w-[30px] rounded-full bg-background px-1.5 py-px text-[16px] leading-none font-normal text-primary shadow-[0_1px_2px_var(--shadow)] hover:bg-background hover:text-primary disabled:bg-transparent disabled:text-muted-foreground disabled:shadow-none"
    {...props}
  />
);

/** Sets Arabic size and Meaning size back to 100%, and nothing else. */
export function ResetSizes({ className }: { className?: string }) {
  const reset = () => {
    chooseSize("arabicSize", DEFAULT_SIZE);
    chooseSize("meaningSize", DEFAULT_SIZE);
  };
  return (
    <Button variant="pill" size="pill" className={className} onClick={reset}>
      {STRINGS.resetSizes}
    </Button>
  );
}
