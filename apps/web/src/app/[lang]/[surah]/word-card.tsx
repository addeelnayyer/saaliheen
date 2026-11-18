// A Word card: its Arabic in each Script and its Word meaning, and on a Surah
// page its Root tag, or for a Word with no Root its Particle tag (#249); never
// its Word location (#35). Shared by the Surah page, the
// Surah opened in parts and the Settings drawer's preview. An Allah reference's
// card draws its Arabic, and only its Arabic, in Allah reference colour (#147).

import type { Language, ParticleTag, PartWord, RootTag } from "@/dataset/reader";
import { inLanguage, STRINGS } from "../strings";
import { ScriptText } from "./script-text";
import styles from "./surah.module.css";

/** A Word as the Settings drawer's preview shows it: no Root tag. */
export type SampleWord = Pick<PartWord, "location" | "uthmani" | "indopak" | "meaning">;

/** A Surah page's card's attributes: its Word location's id, its Phrase colour, and whether it is an Allah reference (#147). */
const pageCardAttributes = (word: PartWord) => ({
  id: word.location,
  "data-phrase": word.phraseColour,
  "data-allah-reference": word.allahReference ? "" : undefined,
  // Its Root's letters, or its particle's text by kind, for the Known words' tint (#250, #251): the same on every reader's page.
  "data-root-letters": word.root?.letters,
  "data-particle-lemma": word.particle?.kind === "lemma" ? word.particle.text : undefined,
  "data-particle-spelling": word.particle?.kind === "spelling" ? word.particle.text : undefined,
});

/**
 * On a Surah page a card is the target of its Word location's deep link and
 * carries its Root tag. A sample card (the Settings drawer's preview) has
 * neither: it is not the page's Word, and its Root tag would open the Root dialog.
 * Either way the Word has its meaning in the page's Language only.
 */
export function WordCard({ word, lang }: { word: PartWord | SampleWord; lang: Language }) {
  const onPage = "root" in word;
  const root = onPage ? word.root : null;
  const particle = onPage ? word.particle : undefined;
  return (
    <div className={styles.tile} {...(onPage ? pageCardAttributes(word) : {})}>
      <ScriptText uthmani={word.uthmani} indopak={word.indopak}>
        {(text, script) => <span className={`${styles.ar} ${script}`.trim()}>{text}</span>}
      </ScriptText>
      <span className={styles.mean} {...inLanguage(lang)}>
        {word.meaning || STRINGS.noMeaning}
      </span>
      {root && <RootTagButton root={root} location={word.location} className={styles.wordTag} />}
      {particle && <ParticleTagButton particle={particle} location={word.location} className={styles.wordTag} />}
    </div>
  );
}

/**
 * A Root tag: it opens the Root dialog (RootDialog listens for clicks on any
 * Root tag), on a Word card or in the Word grammar dialog (#277). Either gives
 * its Word's `location`, which the Root dialog opens on (#322, #325).
 */
export function RootTagButton({ root, location, className }: { root: RootTag; location: string; className?: string }) {
  return (
    <button type="button" className={className} data-root={root.id} data-location={location} lang="ar">
      {root.letters}
    </button>
  );
}

/**
 * A Particle tag: it opens the Particle dialog (ParticleDialog listens for
 * clicks on any Particle tag), which reads the particle from its Script texts
 * and opens on its Word's `location` (#327).
 */
export function ParticleTagButton({ particle, location, className }: { particle: ParticleTag; location: string; className?: string }) {
  return (
    <button type="button" className={className} data-particle={particle.id} data-kind={particle.kind} data-location={location} lang="ar">
      <ScriptText uthmani={particle.text} indopak={particle.indopak}>
        {(text, script) => <span className={script || undefined}>{text}</span>}
      </ScriptText>
    </button>
  );
}
