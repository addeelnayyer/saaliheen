"use client";

// The Word grammar dialog (#277): tapping a Word on a Grammar page opens a
// dialog like the Root dialog, its head the Word in the reader's Script and
// its Word location, then its Segments in order (وَ + بِ + ٱلْ + يَوْمِ), each
// in the Corpus's Uthmani text with its Part of speech and every feature the
// Corpus gives it (@saaliheen/dataset/grammar's segmentTerms), and an
// Indo-Pak reader is told the Segments are in Uthmani. Below them, the Word's
// Root tag opens its Root dialog over this one, on this Word as a Word
// card's does (#325), or for a Word with no Root its Particle tag its Particle
// dialog: Saaliheen's Root and particle, the ones Study shows, never the
// Corpus's (ADR 0064).
// It opens at once with the Word; the rest is its Ayah's static file,
// /word-grammar/<surah>/<ayah>.json, fetched only when a dialog first opens
// on one of the Ayah's Words. It is shadcn/ui's Dialog (#303), the Root
// dialog's TagDialog with its head (../../[surah]/root-dialog): it closes with
// its close button, Escape or a click outside, keeps its head in view, holds
// the page still (src/components/ui/dialog.tsx) and gives focus back to the
// Word.
// The dialog is English, the grammar terms in Arabic beside it.

import { segmentTerms, type Segment } from "@saaliheen/dataset/grammar";
import { DialogTitle } from "@/components/ui/dialog";
import type { WordGrammar } from "@/dataset/reader";
import { fetchJsonOnce } from "../../caches";
import { STRINGS } from "../../strings";
import { CloseButton, TagDialog, useTagDialog } from "../../[surah]/root-dialog";
import { ScriptText } from "../../[surah]/script-text";
import { ParticleTagButton, RootTagButton } from "../../[surah]/word-card";
import rootStyles from "../../[surah]/root-dialog.module.css";
import styles from "./word-grammar-dialog.module.css";

/** A Grammar page's Words: each a button with its Word location as its id. */
const WORDS = "main [data-word]";

const loaded = new Map<string, Promise<Record<string, WordGrammar>>>();

/** Word `location`'s grammar, from its Ayah's file, fetched once per page. */
async function loadWord(location: string): Promise<WordGrammar> {
  const [surah, ayah] = location.split(":");
  const words = await fetchJsonOnce(loaded, `${surah}:${ayah}`, `/word-grammar/${surah}/${ayah}.json`);
  return words[location];
}

/** A Word as its button shows it: its Word location and its text in each Script, one element when both read alike. */
interface ShownWord {
  id: string;
  uthmani: string;
  indopak: string;
}

function shownWord(word: HTMLElement): ShownWord {
  const [uthmani, indopak = uthmani] = [...word.querySelectorAll(":scope > [lang=ar]")].map((e) => e.textContent ?? "");
  return { id: word.id, uthmani, indopak };
}

/** Opens the Word grammar dialog for whichever Word on the Grammar page is tapped or pressed. */
export function WordGrammarDialog() {
  const { open, close, returnFocus } = useTagDialog(WORDS, shownWord, loadWord);
  return open ? (
    <TagDialog key={open.tag.id} onClose={close} onClosed={returnFocus} data-word-grammar-dialog="">
      <WordGrammarSheet word={open.tag} grammar={open.file} />
    </TagDialog>
  ) : null;
}

/** The dialog's head, the Word, then its grammar once its Ayah's file (null until then) has loaded. */
function WordGrammarSheet({ word, grammar }: { word: ShownWord; grammar: WordGrammar | null }) {
  return (
    <div className={rootStyles.body}>
      <header className={rootStyles.head}>
        <div className={rootStyles.headText}>
          <div className={rootStyles.lab}>{STRINGS.wordGrammarLabel}</div>
          <DialogTitle className={rootStyles.letters} lang="ar">
            <ScriptText uthmani={word.uthmani} indopak={word.indopak}>
              {(text, script) => <span className={script || undefined}>{text}</span>}
            </ScriptText>
          </DialogTitle>
          <p className={rootStyles.translit} dir="ltr">
            {word.id}
          </p>
        </div>
        <CloseButton />
      </header>
      {grammar ? <WordGrammarBody location={word.id} grammar={grammar} /> : <p className={rootStyles.loading} aria-busy="true" />}
    </div>
  );
}

/** The Word's Segments, or that it has none, and its Root tag, which opens the Root dialog on the Word at `location` (#325), or Particle tag. */
function WordGrammarBody({ location, grammar: { segments, root, particle } }: { location: string; grammar: WordGrammar }) {
  return (
    <>
      {segments.length > 0 ? (
        <>
          <h3 className={rootStyles.title}>{STRINGS.segmentsTitle}</h3>
          <p className={styles.uthmaniNote}>{STRINGS.segmentsInUthmani}</p>
          <ol className={styles.segments}>
            {segments.map((segment) => (
              <SegmentItem key={segment.position} segment={segment} />
            ))}
          </ol>
        </>
      ) : (
        <p className={rootStyles.stat}>{STRINGS.noWordGrammar}</p>
      )}
      {(root || particle) && (
        <p className={styles.lead}>
          <span className={styles.leadLabel}>{root ? STRINGS.rootLabel : STRINGS.particleLabel}</span>
          {root && <RootTagButton root={root} location={location} className={styles.tag} />}
          {particle && <ParticleTagButton particle={particle} location={location} className={styles.tag} />}
        </p>
      )}
    </>
  );
}

/** One Segment: its Corpus Uthmani text (some are written with none, #275), and its Part of speech then each feature, in English with the Arabic term beside it. */
function SegmentItem({ segment }: { segment: Segment }) {
  return (
    <li className={styles.segment} data-part-of-speech={segment.partOfSpeech}>
      {segment.uthmani ? (
        <span className={styles.segmentText} lang="ar" dir="rtl">
          {segment.uthmani}
        </span>
      ) : (
        <span className={`${styles.segmentText} ${styles.empty}`}>{STRINGS.emptySegment}</span>
      )}
      <ul className={styles.terms}>
        {segmentTerms(segment).map(({ en, ar }) => (
          <li key={en} className={styles.term}>
            {en}
            {" · "}
            <span lang="ar">{ar}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
