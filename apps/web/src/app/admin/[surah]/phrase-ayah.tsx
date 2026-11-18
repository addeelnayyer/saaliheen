"use client";

// An Ayah in Phrases mode (#100): its number, its Words as Word cards like a
// Surah page's (Arabic in the active Script and the Word meaning), and the
// Ayah translation when one is shown. Each card is tinted with its Phrase's
// colour, the reader's tint A or B; a Word in no Phrase has no tint, a dashed
// outline and is described to a screen reader as "Unmarked". Each card is a
// button: tapping it marks or selects a Phrase (phrase-controls.tsx), and the
// picked Words are ringed. Marking Allah references (#152) shows the same Word
// cards with no tint, each Allah reference's Arabic in Allah reference colour,
// a tap turning its Word into one or out of one.

import type { KeyboardEvent } from "react";
import type { Phrase, PhraseColour } from "@saaliheen/dataset/types";
import { phraseHolding } from "@/admin/phrase-edits";
import type { AyahText, AyahWord, Language } from "@/dataset/reader";
import { ScriptText } from "../../[lang]/[surah]/script-text";
import { inLanguage } from "../../[lang]/strings";
import type { ShownTranslation } from "./editor-choices";
import { translationLook } from "./flowing-ayahs";
import styles from "./editor.module.css";

/** The id of the one hidden "Unmarked" description every unmarked Word card points to. */
const UNMARKED_ID = "phrases-unmarked";

/** The hidden description an unmarked Word card points to; rendered once per editor. */
export const UnmarkedDescription = () => (
  <span id={UNMARKED_ID} hidden>
    Unmarked
  </span>
);

/** How a Word card is drawn beyond its Word: its attributes, and whether it shows as pressed. */
interface CardLook {
  attributes: Partial<Record<`data-${string}` | "aria-describedby", string>>;
  pressed: boolean;
}

/** A Word card's look in Phrases mode: its Phrase colour, or "none" and the "Unmarked" description; pressed while picked. */
const phraseLook = (colour: PhraseColour | undefined, picked: boolean): CardLook => ({
  attributes: { "data-phrase": colour ?? "none", "aria-describedby": colour ? undefined : UNMARKED_ID, "data-picked": picked ? "" : undefined },
  pressed: picked,
});

/** A Word card's look while marking Allah references: marked, and pressed, while it is an Allah reference. */
const allahReferenceLook = (marked: boolean): CardLook => ({
  attributes: { "data-allah-reference": marked ? "" : undefined },
  pressed: marked,
});

/** Whether `e` presses a button: Enter or Space, the page not scrolled by Space. */
function pressed(e: KeyboardEvent): boolean {
  if (e.key !== "Enter" && e.key !== " ") return false;
  e.preventDefault();
  return true;
}

interface CardProps {
  word: AyahWord;
  look: CardLook;
  lang: Language;
  onTap: (location: string) => void;
}

/** A Word card, its Word location as its id, tapped as a button. */
function WordCard({ word, look, lang, onTap }: CardProps) {
  const tap = () => onTap(word.location);
  return (
    <div
      className={styles.word}
      id={word.location}
      {...look.attributes}
      role="button"
      tabIndex={0}
      aria-pressed={look.pressed}
      onClick={tap}
      onKeyDown={(e) => pressed(e) && tap()}
    >
      <ScriptText uthmani={word.uthmani} indopak={word.indopak}>
        {(text, scriptClass) => (
          <span className={`${styles.wordArabic} ${scriptClass}`.trim()} lang="ar">
            {text}
          </span>
        )}
      </ScriptText>
      <span className={styles.wordMeaning} {...inLanguage(lang)}>
        {word.meaning[lang]}
      </span>
    </div>
  );
}

interface AyahProps {
  surah: number;
  ayah: AyahText;
  translation: ShownTranslation;
  onTap: (location: string) => void;
}

/** An Ayah's Word cards, each drawn as `lookOf` says; Word meanings in Urdu while the Urdu translation is shown, else English. */
function WordCardsAyah({ surah, ayah, translation, onTap, lookOf }: AyahProps & { lookOf: (location: string) => CardLook }) {
  const lang: Language = translation === "ur" ? "ur" : "en";
  return (
    <div className={styles.ayah}>
      <span className={styles.number}>
        {surah}:{ayah.number}
      </span>
      <div className={styles.words} dir="rtl">
        {ayah.words.map((word) => (
          <WordCard key={word.location} word={word} look={lookOf(word.location)} lang={lang} onTap={onTap} />
        ))}
      </div>
      {translation !== "off" && <p {...translationLook(translation)}>{ayah.translation[translation]}</p>}
    </div>
  );
}

interface PhraseProps extends AyahProps {
  colours: Map<string, PhraseColour>;
  /** The Words picked by tapping, as a run; null when none are. */
  picked: Phrase | null;
}

/** An Ayah's Word cards in Phrases mode, tinted by `colours`, the picked Words ringed. */
export function PhraseAyah({ colours, picked, ...ayah }: PhraseProps) {
  const lookOf = (location: string) => phraseLook(colours.get(location), !!picked && !!phraseHolding([picked], location));
  return <WordCardsAyah {...ayah} lookOf={lookOf} />;
}

/** An Ayah's Word cards while marking Allah references, the Arabic of each of `marked` in Allah reference colour. */
export function AllahReferenceAyah({ marked, ...ayah }: AyahProps & { marked: Set<string> }) {
  return <WordCardsAyah {...ayah} lookOf={(location) => allahReferenceLook(marked.has(location))} />;
}
