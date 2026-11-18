"use client";

// The Surah bar's Reading settings button (#192) and the Settings drawer it opens: a modal
// dialog, shadcn/ui's Sheet (#305), a side panel on wider screens and a bottom
// sheet on a phone (src/components/ui/sheet.tsx). A preview of Ayah 1:2 as Word cards is pinned
// at its top; under it, in order, Arabic size, the Phrase colours switch, the
// Allah reference colour switch, the Known words colour switch (#250), the Hide Word meanings switch (#256), Meaning size, Reset sizes, Section marks (#194), the Script, the Ayah translation switch and the theme. Every change applies at
// once, to the preview and to the page behind. The drawer closes with its
// close button, Escape or a click outside it, and gives focus back to the
// settings button, without scrolling the page. Its content exists only while it is open. Me holds the same
// controls on its page (ReaderSettingsControls).

import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Language } from "@/dataset/reader";
import { WordCard, type SampleWord } from "./[surah]/word-card";
import { AllahReferenceColourSwitch, HideWordMeaningsSwitch, KnownWordsColourSwitch, PhraseColoursSwitch, ResetSizes, ScriptSwitch, SectionMarksSwitch, SizeStepper, ThemeSwitch, TranslationSwitch } from "./reader-settings";
import { tintKnownWords } from "./known-words";
import { applyStored } from "./settings";
import { inLanguage, STRINGS } from "./strings";
import surahStyles from "./[surah]/surah.module.css";
import styles from "./settings-drawer.module.css";

/** The preview's Ayah, in the page's Language. */
export interface SampleAyah {
  words: SampleWord[];
  translation: string;
}

/**
 * React resets <html>'s attributes when it remounts the root layout; put the
 * stored settings (and the signed-in mark) back before paint. A no-op after a
 * full page load. It also keeps the Known words' tint (#250, #251) as the stored
 * Known words are, on every mark in any tab. Every reading page's top bar holds it.
 */
export function KeepStoredSettings() {
  useLayoutEffect(() => {
    applyStored();
    return tintKnownWords();
  }, []);
  return null;
}

export function SettingsDrawer({ lang, sample, className }: { lang: Language; sample: SampleAyah; className: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const giveFocusBack = (event: Event) => {
    event.preventDefault();
    button.current?.focus({ preventScroll: true });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button ref={button} type="button" className={`${className} ${styles.open}`}>
          <svg className={styles.gear} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          <span className={styles.openText}>{STRINGS.settings}</span>
        </button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined} onCloseAutoFocus={giveFocusBack}>
        <SheetHeader>
          <SheetTitle>{STRINGS.settings}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label={STRINGS.close} className="rounded-full bg-secondary text-[20px] leading-none font-normal">
              ×
            </Button>
          </SheetClose>
        </SheetHeader>
        <Preview lang={lang} sample={sample} />
        <ReaderSettingsControls className={styles.controls} />
      </SheetContent>
    </Sheet>
  );
}

/** Every reader setting, in order: on the Settings drawer, and on Me. */
export function ReaderSettingsControls({ className }: { className: string }) {
  return (
      <div className={className}>
        <SizeStepper setting="arabicSize" className={styles.row} />
        <div className={styles.row}>
          <PhraseColoursSwitch />
        </div>
        <div className={styles.row}>
          <AllahReferenceColourSwitch />
        </div>
        <div className={styles.row}>
          <KnownWordsColourSwitch />
        </div>
        <div className={styles.row}>
          <HideWordMeaningsSwitch />
        </div>
        <SizeStepper setting="meaningSize" className={styles.row} />
        <ResetSizes className="justify-self-start" />
        <div className={styles.row}>
          <SectionMarksSwitch />
        </div>
        <div className={styles.row}>
          <ScriptSwitch />
        </div>
        <div className={styles.row}>
          <TranslationSwitch />
        </div>
        <div className={styles.row}>
          <ThemeSwitch />
        </div>
      </div>
  );
}

/**
 * Ayah 1:2 as the Surah page draws it: its Word cards and its Ayah translation,
 * which shows here whatever the Ayah translation switch says.
 */
function Preview({ lang, sample }: { lang: Language; sample: SampleAyah }) {
  return (
    <section className={styles.preview} aria-label={STRINGS.preview}>
      <div className={surahStyles.tiles} lang="ar" dir="rtl">
        {sample.words.map((word) => (
          <WordCard key={word.location} word={word} lang={lang} />
        ))}
      </div>
      <p className={`${surahStyles.translation} ${styles.translation}`} {...inLanguage(lang)}>
        {sample.translation}
      </p>
    </section>
  );
}
