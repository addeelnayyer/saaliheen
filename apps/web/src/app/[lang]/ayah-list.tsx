// Ayahs listed Ayah by Ayah outside a Surah page (#129, #138): each Ayah's
// Arabic in the reader's Script and size, never selectable (ADR 0004), and its
// Ayah translation, already in the Language, at the Meaning size while the
// switch is on. No Word cards, Phrase colours or Recitation. An Iltifat page
// passes its entry's Marked Words (#143): each is drawn on its side's tint, its
// side said to a screen reader. The Supplications page passes its entry's
// spans (#270, ADR 0063): each is drawn as one tinted group per Ayah it
// touches, named "Supplication" to a screen reader; its Ayah translation is
// never marked. A Root page (#287) passes the Words of one of its Root's
// Spellings, each drawn on the Root's pale tint and said as marked, and lists
// Ayahs of many Surahs, each carrying its own. A Theme page
// (./themes/[slug]/theme-groups.tsx) links each Ayah to its place in its
// Surah, and a Root page to its first marked Word; an Iltifat page does not.
// The Supplication editor (#201) shows every Ayah translation whatever the
// setting, as the admin area has no settings drawer.

import Link from "next/link";
import { Fragment } from "react";
import type { Language, PartThemeAyah, Script } from "@/dataset/reader";
import { holds, type SupplicationSpan } from "@/supplications/spans";
import { drawnAyahEnd } from "./[surah]/ayah-end";
import scriptStyles from "./[surah]/script-text.module.css";
import { InReadersScript, WhileTranslationOn } from "./as-the-reader-sets";
import { ayahId, locationPath } from "./reading-place";
import { inLanguage, SUPPLICATION_SPAN_LABEL } from "./strings";
import styles from "./ayah-list.module.css";

/** One Word of an Ayah, in each Script. */
type ListedWord = { location: string } & Record<Script, string>;
/**
 * An Ayah as listed: its Words as well, where a page marks some of them; its
 * Surah, where the list holds Ayahs of more than one; and the Word location its
 * link opens, where that is not the Ayah itself.
 */
export type ListedAyahText = PartThemeAyah & { words?: ListedWord[]; surah?: number; opens?: string };

/** The tints a marked Word is drawn on, each a class of the list's styles: an Iltifat side's (#143), or a Root's Words' pale one (#287). */
type Tint = "from" | "to" | "root";
/** A marked Word as the list draws it, on its tint; `said` is what a screen reader hears of it. */
export interface Mark {
  tint: Tint;
  said: string;
}
/** Marked Words by Word location. */
export type Marks = ReadonlyMap<string, Mark>;

/** A Word in `script`: a marked Word on its tint, what it is said with it; any other, its plain text. */
function Word({ word, script, marks }: { word: ListedWord; script: Script; marks: Marks }) {
  const mark = marks.get(word.location);
  if (!mark) return word[script];
  return (
    <span className={`${styles.marked} ${styles[mark.tint]}`} data-location={word.location} data-tint={mark.tint} role="group" aria-label={mark.said}>
      {word[script]}
    </span>
  );
}

/** An Ayah's Words one by one, its last Word kept on one line with its end. */
function MarkedWords({ words, end, script, marks }: { words: ListedWord[]; end: string; script: Script; marks: Marks }) {
  const last = words.at(-1)!;
  return (
    <>
      {words.slice(0, -1).map((word) => (
        <Fragment key={word.location}>
          <Word word={word} script={script} marks={marks} />{" "}
        </Fragment>
      ))}
      <span className={styles.ending}>
        <Word word={last} script={script} marks={marks} />
        {` ${end}`}
      </span>
    </>
  );
}

/** An Ayah's Arabic as one text, its last Word kept on one line with its end. */
function Joined({ words, end }: { words: string; end: string }) {
  const cut = words.lastIndexOf(" ") + 1;
  return (
    <>
      {words.slice(0, cut)}
      <span className={styles.ending}>{`${words.slice(cut)} ${end}`}</span>
    </>
  );
}

/** One piece of an Ayah: a run of its Words, under one span or under none. */
interface Piece {
  words: ListedWord[];
  span?: SupplicationSpan;
}

/** `words` cut into pieces, each a run of Words under one span, or under none. */
function piecesOf(words: ListedWord[], spans: readonly SupplicationSpan[]): Piece[] {
  const pieces: Piece[] = [];
  for (const word of words) {
    const span = spans.find((s) => holds(s, word.location));
    const last = pieces.at(-1);
    if (last && last.span === span) last.words.push(word);
    else pieces.push({ words: [word], span });
  }
  return pieces;
}

/**
 * An Ayah's Words in pieces: each under a span drawn as one tinted group
 * holding exactly its Words, the spaces between them tinted too; the last
 * Word kept on one line with its end.
 */
function SpannedWords({ pieces, end, script, label }: { pieces: Piece[]; end: string; script: Script; label: string }) {
  const last = pieces.length - 1;
  return (
    <>
      {pieces.map((piece, n) => {
        const text = piece.words.map((w) => w[script]).join(" ");
        const ending = n === last;
        return (
          <Fragment key={piece.words[0].location}>
            {n > 0 && " "}
            {piece.span ? (
              <>
                <span className={styles.span} role="group" aria-label={label}>
                  {text}
                </span>
                {ending && `\u00A0${end}`}
              </>
            ) : ending ? (
              <Joined words={text} end={end} />
            ) : (
              text
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/** Whether any of `ayah`'s Words is marked. */
const holdsMarks = (ayah: ListedAyahText, marks: Marks) => marks.size > 0 && (ayah.words ?? []).some((w) => marks.has(w.location));

/** An Ayah's Arabic in `script`: its Words, its last Word kept on one line with its end. */
function Arabic({ ayah, script, marks, pieces, label }: { ayah: ListedAyahText; script: Script; marks: Marks; pieces: Piece[]; label: string }) {
  const end = drawnAyahEnd(ayah, script);
  return (
    <p className={`${styles.arabic} ${styles[script] ?? ""} ${scriptStyles[script]}`} lang="ar" dir="rtl">
      {pieces.some((p) => p.span) ? (
        <SpannedWords pieces={pieces} end={end} script={script} label={label} />
      ) : holdsMarks(ayah, marks) ? (
        <MarkedWords words={ayah.words!} end={end} script={script} marks={marks} />
      ) : (
        <Joined words={ayah[script]} end={end} />
      )}
    </p>
  );
}

const NO_MARKS: Marks = new Map();
const NO_SPANS: readonly SupplicationSpan[] = [];

/** One Ayah; `data-ayah` is its `s:a`, by which a Theme page's Back and Forward find where a visit was left (./themes/[slug]/theme-visit.tsx). */
function ListedAyah({ lang, surah, ayah, linked, marks, spans }: Required<Omit<Props, "ayahs" | "surah">> & { surah: number; ayah: ListedAyahText }) {
  const place = ayahId({ surah, ayah: ayah.number });
  const pieces = spans.length > 0 && ayah.words ? piecesOf(ayah.words, spans) : [];
  const arabic = (script: Script) => <Arabic ayah={ayah} script={script} marks={marks} pieces={pieces} label={SUPPLICATION_SPAN_LABEL[lang]} />;
  return (
    <li className={styles.ayah} data-ayah={place}>
      <InReadersScript uthmani={arabic("uthmani")} indopak={arabic("indopak")} />
      <WhileTranslationOn>
        <p className={styles.translation} {...inLanguage(lang)}>
          {ayah.translation}
        </p>
      </WhileTranslationOn>
      {linked && (
        <Link className={styles.ayahLink} href={locationPath(lang, ayah.opens ?? place)}>
          {place}
        </Link>
      )}
    </li>
  );
}

interface Props {
  lang: Language;
  /** The Surah of every Ayah that does not carry its own. */
  surah?: number;
  ayahs: ListedAyahText[];
  linked?: boolean;
  marks?: Marks;
  /** A Supplication's spans, in reading order. */
  spans?: readonly SupplicationSpan[];
}

/**
 * Ayahs of Surah `surah`, or each of its own, in the order given; `linked` adds each Ayah's link into its Surah, `marks`
 * tints those Words, and `spans` tints each span's Words as one group per Ayah.
 */
export function AyahList({ lang, surah, ayahs, linked = false, marks = NO_MARKS, spans = NO_SPANS }: Props) {
  return (
    <ol className={styles.ayahs}>
      {ayahs.map((ayah) => {
        const its = (ayah.surah ?? surah)!;
        return <ListedAyah key={`${its}:${ayah.number}`} lang={lang} surah={its} ayah={ayah} linked={linked} marks={marks} spans={spans} />;
      })}
    </ol>
  );
}
