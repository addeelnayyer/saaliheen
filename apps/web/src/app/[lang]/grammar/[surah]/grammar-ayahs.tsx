// A Grammar page's Ayahs (#275, #278), set out as a Surah page sets out its
// own: each Ayah its Words, right to left, then its Ayah translation, shown
// while the reader has Ayah translation on; above the first Ayah of each
// Passage, once Passage headings are released, its Passage heading. Each Word
// is its Arabic, underlined in its Part of speech colour, its Word meaning and
// its Grammar line (ADR 0064). None of the Surah page's tints reach them: the
// Phrase colours, Allah reference colour, Known words colour and Hide Word
// meanings are drawn on the Surah page's Word cards only. No Tafsir, no chips.
// Each Word is a button that opens its Word grammar dialog (#277).

import { memo } from "react";
import type { PartPassage } from "@saaliheen/dataset/types";
import type { Language } from "@/dataset/reader";
import type { GrammarAyah, GrammarWord } from "@/grammar/parts";
import { passageRange } from "../../[surah]/passage-range";
import { ScriptText } from "../../[surah]/script-text";
import { PASSAGE_HEADINGS } from "../../release";
import { inLanguage, STRINGS } from "../../strings";
import styles from "./grammar.module.css";

// As on a Surah page: an Ayah heading ranks below the Passage headings, once they are shown.
const AyahHeadingTag = PASSAGE_HEADINGS ? "h3" : "h2";

/** One Word: its Arabic, underlined in its Part of speech colour, its Word meaning, and its Grammar line, or that it has no Word grammar (ADR 0064); it opens its Word grammar dialog. */
function WordWithGrammar({ word, lang }: { word: GrammarWord; lang: Language }) {
  const { line } = word;
  return (
    <li>
      <button
        type="button"
        className={styles.word}
        id={word.location}
        data-word=""
        data-part-of-speech={line?.partOfSpeech}
        aria-haspopup="dialog"
      >
      <ScriptText uthmani={word.uthmani} indopak={word.indopak}>
        {(text, script) => (
          <span className={`${styles.ar} ${script}`.trim()} lang="ar">
            {text}
          </span>
        )}
      </ScriptText>
      <span className={styles.mean} {...inLanguage(lang)}>
        {word.meaning || STRINGS.noMeaning}
      </span>
      <span className={styles.line}>
        {line ? line.en : STRINGS.noWordGrammar}
        {line?.ar && (
          <>
            {" · "}
            <span lang="ar">{line.ar}</span>
          </>
        )}
      </span>
      </button>
    </li>
  );
}

/** A Passage heading: its title in the Language and its Ayah range, leading to its first Ayah. */
function PassageHeading({ passage, anchor, lang }: { passage: PartPassage; anchor: string; lang: Language }) {
  return (
    <h2 className={styles.passage} {...inLanguage(lang)}>
      <a className={styles.passageLink} href={`#${anchor}`}>
        <span className={styles.passageTitle} {...inLanguage(lang)}>
          {passage.title}
        </span>{" "}
        <span className={styles.passageRange} dir="ltr" lang="en">
          {passageRange(passage)}
        </span>
      </a>
    </h2>
  );
}

/**
 * One Ayah: its Passage heading when it begins a Passage, its heading, its Words and its Ayah translation. Memoised:
 * each part's Ayahs keep their identity as later parts arrive, so those already on screen are not drawn again.
 */
const GrammarAyahSection = memo(function GrammarAyahSection({ surah, ayah, lang }: { surah: number; ayah: GrammarAyah; lang: Language }) {
  const id = `${surah}:${ayah.number}`;
  return (
    <section id={id} className={styles.ayah}>
      {PASSAGE_HEADINGS && ayah.passage && <PassageHeading passage={ayah.passage} anchor={id} lang={lang} />}
      <AyahHeadingTag className={styles.ayahHead} dir="ltr" lang="en">
        {STRINGS.ayah(ayah.number)}
      </AyahHeadingTag>
      <ol className={styles.words} lang="ar" dir="rtl">
        {ayah.words.map((word) => (
          <WordWithGrammar key={word.location} word={word} lang={lang} />
        ))}
      </ol>
      <p className={styles.translation} {...inLanguage(lang)}>
        {ayah.translation}
      </p>
    </section>
  );
});

export function GrammarAyahs({ surah, ayahs, lang }: { surah: number; ayahs: GrammarAyah[]; lang: Language }) {
  return ayahs.map((ayah) => <GrammarAyahSection key={ayah.number} surah={surah} ayah={ayah} lang={lang} />);
}
