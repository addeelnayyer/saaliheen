// One Ayah of a Surah page, and the Bismillah before Ayah 1. Shared by the
// Surah page, which the server renders whole, and the Surah opened in parts
// (#24), which renders each part in the browser as it arrives. Both hand it
// the Ayah in their Language only (surahAyahs, partAyahs), as a part's file carries it.
// With the Passage headings switch on (#41), an Ayah that begins a Passage has
// the Passage heading at the top of its section, so following the heading's
// link, or a shared Ayah, brings the heading into view with the Ayah.
// Each Ayah ends with its Theme chips (#129): Study's Ayah layout only, each
// opening its Theme page inside the app (#131); an Ayah where an Iltifat is
// cited adds its Iltifat chips (#140), outlined, each opening its Iltifat on
// its direction page.
// Each Passage's Ayahs are grouped (#125), so Flowing can run them on together;
// the Ayahs and their Words keep their ids, and Study draws them as before.
// Before an Ayah stand its Section marks (#194, ADR 0020): its Hizb quarter
// and its Ruku, both always in the page, above the Ayah and so above its
// Passage heading; the stylesheet shows the kind data-section-marks on <html>
// names (ADR 0044), so switching draws no Ayah again.

import Link from "next/link";
import { Fragment, memo } from "react";
import type { Language, PartAyah, PartPassage, PassageTafsir, SectionMarks } from "@/dataset/reader";
import { tafsirRuns } from "@/tafsir/runs";
import type { IltifatChip } from "@saaliheen/dataset/types";
import { ayahId } from "../reading-place";
import { PASSAGE_HEADINGS } from "../release";
import { passageRange } from "./passage-range";
import { ayahsSegment } from "@saaliheen/share";
import { DIRECTION_WORDS } from "../iltifat/directions";
import { directionPath, iltifatFragment } from "../iltifat/iltifat-path";
import { themePath } from "../themes/theme-path";
import { inLanguage, STRINGS } from "../strings";
import { ScriptText } from "./script-text";
import { WordCard } from "./word-card";
import { Badge } from "@/components/ui/badge";
import styles from "./surah.module.css";

/** The Bismillah in each Script (only the active Script's shows). */
export function Bismillah({ uthmani, indopak }: { uthmani: string; indopak: string }) {
  return (
    <ScriptText uthmani={uthmani} indopak={indopak}>
      {(text, script) => <p className={`${styles.bismillah} ${script}`.trim()}>{text}</p>}
    </ScriptText>
  );
}

/**
 * `ayahs` grouped by Passage, in order: each group starts at an Ayah that begins
 * a Passage (it carries the Passage). The Ayahs before the first such Ayah, as
 * when a Surah opened in parts has only part of a Passage so far, form a group
 * of their own; Ayahs arriving later join the last group.
 */
function passageGroups(ayahs: PartAyah[]): PartAyah[][] {
  const groups: PartAyah[][] = [];
  for (const ayah of ayahs) {
    if (ayah.passage || groups.length === 0) groups.push([ayah]);
    else groups.at(-1)!.push(ayah);
  }
  return groups;
}

/**
 * A Surah's Ayahs, each Passage's in one group (#125): the whole Surah, or
 * the Ayahs of a Surah opened in parts arrived so far. A group is keyed by its
 * first Ayah, so a Passage split across parts stays the same element as its
 * later Ayahs join it.
 */
export function PassageAyahs({
  surah,
  ayahs,
  lang,
  themeNames,
  sectionMarks,
}: {
  surah: number;
  ayahs: PartAyah[];
  lang: Language;
  /** Every Theme's name in the Language, by slug, for the Ayahs' Theme chips (#129). */
  themeNames: Record<string, string>;
  /** The Surah's Hizb quarters and Rukus (#194), each drawn above its Ayah. */
  sectionMarks: SectionMarks;
}) {
  return passageGroups(ayahs).map((group) => (
    <div key={group[0].number} className={styles.passageAyahs}>
      {group.map((ayah) => (
        <Fragment key={ayah.number}>
          <SectionMarksAt marks={sectionMarks} ayah={ayah.number} />
          <AyahSection surah={surah} ayah={ayah} lang={lang} themeNames={themeNames} />
        </Fragment>
      ))}
      <TranslationParagraph ayahs={group} lang={lang} />
      {/* On the Passage's last Ayah, so a Passage opened in parts gains it only once that Ayah has come. */}
      <TafsirAfterPassage surah={surah} tafsir={group.at(-1)!.tafsir} lang={lang} />
    </div>
  ));
}

/** The sign in a Section mark's medallion: ۞ for a Hizb quarter, ع for a Ruku. */
const MARK_SIGN = { hizb: "۞", ruku: "ع" } as const;

/** The Section marks standing above Ayah `ayah`: its Hizb quarter and its Ruku, when it starts one. */
function SectionMarksAt({ marks, ayah }: { marks: SectionMarks; ayah: number }) {
  const hizb = marks.hizbQuarters.find((m) => m.ayah === ayah);
  const ruku = marks.rukus.find((m) => m.ayah === ayah);
  return (
    <>
      {hizb && <SectionMark kind="hizb" label={hizb.label} />}
      {ruku && <SectionMark kind="ruku" label={ruku.label} />}
    </>
  );
}

/**
 * A Section mark (#194): a rule across the column with a medallion holding its
 * sign and its label. A note named by its label for screen readers, the sign
 * hidden from them; the kind not chosen is not displayed, so neither sight nor
 * a screen reader meets it.
 */
function SectionMark({ kind, label }: { kind: keyof typeof MARK_SIGN; label: string }) {
  return (
    <div className={`${styles.sectionMark} ${kind === "hizb" ? styles.hizbMark : styles.rukuMark}`} role="note" aria-label={label} lang="en" dir="ltr">
      <span className={styles.medal}>
        <span className={styles.markSign} lang="ar" aria-hidden="true">
          <span>{MARK_SIGN[kind]}</span>
        </span>
        <span>{label}</span>
      </span>
    </div>
  );
}

/**
 * A Passage's Ayah translations as one paragraph, each after its Ayah's number
 * as a small superscript, as the Share page's Flowing sets them (#55). Drawn
 * only in Flowing with the Ayah translation switch on; Study shows each Ayah's
 * own translation instead.
 */
function TranslationParagraph({ ayahs, lang }: { ayahs: PartAyah[]; lang: Language }) {
  return (
    <p className={styles.passageTranslation} {...inLanguage(lang)}>
      {ayahs.map((a) => (
        <Fragment key={a.number}>
          <sup className={styles.ayahNumber}>{a.number}</sup> {a.translation}{" "}
        </Fragment>
      ))}
    </p>
  );
}

/** Ayahs `first`..`last` of Surah `surah` as a reader writes them: `2:3–4`, or `2:5` for one Ayah. */
const ayahRange = (surah: number, from: number, till: number) => `${surah}:${passageRange({ from, till })}`;

/**
 * A Passage's Tafsir (#234), after its last Ayah, open, in Study and in
 * Flowing: its Tafsir entries in order, each under the Ayahs it covers, set in
 * the Language (Urdu right to left in the Urdu typeface), then the line
 * crediting the edition. Only the text's bold and italic are drawn as such.
 * Nothing for a Passage without Tafsir in the Language.
 */
function TafsirAfterPassage({ surah, tafsir, lang }: { surah: number; tafsir?: PassageTafsir; lang: Language }) {
  if (!tafsir) return null;
  const { entries, credit } = tafsir;
  return (
    <div className={styles.tafsir} role="note" aria-label={STRINGS.tafsirOf(ayahRange(surah, entries[0].firstAyah, entries.at(-1)!.lastAyah))} {...inLanguage(lang)}>
      <ol className={styles.tafsirEntries}>
        {entries.map((entry) => (
          <li key={entry.firstAyah} className={styles.tafsirEntry}>
            <p className={styles.tafsirAyahs} lang="en" dir="ltr">
              {ayahRange(surah, entry.firstAyah, entry.lastAyah)}
            </p>
            <p className={styles.tafsirText}>
              {tafsirRuns(entry.text).map((run, i) => {
                const text = run.italic ? <i>{run.text}</i> : run.text;
                return <Fragment key={i}>{run.bold ? <b>{text}</b> : text}</Fragment>;
              })}
            </p>
          </li>
        ))}
      </ol>
      <p className={styles.tafsirCredit} lang="en" dir="ltr">
        {credit}
      </p>
    </div>
  );
}

/** The Ayah headings' level: under the Passage headings when they are shown, so those rank above them. */
const AyahHeadingTag = PASSAGE_HEADINGS ? "h3" : "h2";

/**
 * An Ayah: its number, which opens its Share page (#19, #56), its row of Word cards closed by its number in a star,
 * its Ayah translation and its Theme chips, named from `themeNames` (every Theme's name in `lang`, by slug). Memoised: a Surah opened in parts keeps each Ayah
 * it has shown as the same object, so the Ayahs already on screen are not
 * drawn again each time a part arrives. Opened by its Passage heading
 * when it begins a Passage and the switch is on.
 */
export const AyahSection = memo(function AyahSection({
  surah,
  ayah,
  lang,
  themeNames,
}: {
  surah: number;
  ayah: PartAyah;
  lang: Language;
  themeNames: Record<string, string>;
}) {
  // Its `surah:ayah`: how the Reading place finds and scrolls to it (ayahSections), and what its heading shares.
  const id = ayahId({ surah, ayah: ayah.number });
  return (
    <section id={id} className={styles.ayah}>
      {PASSAGE_HEADINGS && ayah.passage && <PassageHeading surah={surah} passage={ayah.passage} anchor={id} lang={lang} />}
      <AyahHeading id={id} surah={surah} number={ayah.number} />
      <div className={styles.tiles}>
        {ayah.words.slice(0, -1).map((word) => (
          <WordCard key={word.location} word={word} lang={lang} />
        ))}
        {/* The last Word and the Ayah's end, held on one line in Flowing as a printed mushaf holds them. */}
        <span className={styles.ending}>
          <WordCard word={ayah.words.at(-1)!} lang={lang} />
          <span className={styles.end} aria-hidden="true">
            {ayah.number}
          </span>
        </span>
      </div>
      {/* Shown only while the Ayah translation switch is on (data-translation on <html>), but always shared. */}
      <p className={styles.translation} {...inLanguage(lang)}>
        {ayah.translation}
      </p>
      <AyahFooter ayah={ayah} themeNames={themeNames} lang={lang} />
    </section>
  );
});

/** An Ayah's footer: its Theme chips, then its Iltifat chips (#140), in rows that wrap together. Flowing hides it. */
function AyahFooter({ ayah, themeNames, lang }: { ayah: PartAyah; themeNames: Record<string, string>; lang: Language }) {
  return (
    <div className={styles.footer}>
      <ThemeChips slugs={ayah.themes} names={themeNames} lang={lang} />
      <IltifatChips chips={ayah.iltifat ?? []} lang={lang} />
    </div>
  );
}

/** What an Ayah's Theme and Iltifat chips share: a pill of the Meaning size in the accent, wrapping anywhere. */
const CHIP = "inline-block w-auto max-w-full shrink overflow-visible whitespace-normal text-primary text-[calc(12.5px*var(--meaning-scale))] leading-[1.6] transition-none [overflow-wrap:anywhere]";

/**
 * An Ayah's Theme chips (#129): a wrapping row of links, one per Theme in
 * tagged order, each named in the Language and opening its Theme page inside
 * the app, in parts (#131). Not prefetched: a Surah has hundreds.
 */
function ThemeChips({ slugs, names, lang }: { slugs: string[]; names: Record<string, string>; lang: Language }) {
  if (slugs.length === 0) return null;
  return (
    <ul className={styles.themes} aria-label={STRINGS.themes} {...inLanguage(lang)}>
      {slugs.map((slug) => (
        <li key={slug}>
          <Badge asChild className={`${CHIP} border-0 bg-accent px-[11px] py-[2px] [a&]:hover:bg-(--hi) [&:lang(ur)]:text-[calc(13px*var(--meaning-scale))] [&:lang(ur)]:leading-(--ur-lh)`}>
            <Link href={themePath(lang, slug)} prefetch={false}>
              {names[slug]}
            </Link>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * An Ayah's Iltifat chips (#140): one outlined link per Iltifat cited at it,
 * "Iltifat · He → We" (and " · Disputed"), opening its entry on its direction
 * page as a look-up, so the Reading place stays. English whatever the
 * Language, as the Iltifat pages are; a screen reader says the turn as the
 * direction badge does.
 */
function IltifatChips({ chips, lang }: { chips: IltifatChip[]; lang: Language }) {
  if (chips.length === 0) return null;
  return (
    <ul className={styles.iltifat} aria-label={STRINGS.iltifat} lang="en" dir="ltr">
      {chips.map(({ id, direction, disputed }) => (
        <li key={id}>
          <Badge asChild variant="outline" className={`${CHIP} border-primary px-[10px] py-px [a&]:hover:bg-(--hi) [a&]:hover:text-primary`}>
            <Link
              href={`${directionPath(lang, direction)}#${iltifatFragment(id)}`}
              prefetch={false}
              aria-label={`${STRINGS.iltifat}, ${DIRECTION_WORDS[direction].said}${disputed ? `, ${STRINGS.disputed.toLowerCase()}` : ""}`}
            >
              {`${STRINGS.iltifat} · ${DIRECTION_WORDS[direction].name}${disputed ? ` · ${STRINGS.disputed}` : ""}`}
            </Link>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** A share button's `data-share`: its Shared Ayahs as `surah:from`, or `surah:from-to` (ShareButtons reads it). */
const shareData = (surah: number, from: number, to: number) => `${surah}:${ayahsSegment(from, to)}`;

/**
 * A Passage heading (#41): the Passage title in the Language and its Ayah
 * range, linking to its first Ayah's anchor `anchor`. A look-up's fragment, so
 * following it leaves the Reading place where it was. Beside it, a share
 * button that opens the Share page of exactly this Passage (#56).
 */
function PassageHeading({ surah, passage, anchor, lang }: { surah: number; passage: PartPassage; anchor: string; lang: Language }) {
  return (
    <h2 className={styles.passage} {...inLanguage(lang)}>
      <a className={styles.passageLink} href={`#${anchor}`}>
        <span className={styles.passageTitle} {...inLanguage(lang)}>
          {passage.title}
        </span>{" "}
        <span className={styles.passageRange} dir="ltr" lang="en">
          {passageRange(passage)}
        </span>
      </a>{" "}
      <button
        type="button"
        className={styles.sharePassage}
        data-share={shareData(surah, passage.from, passage.till)}
        aria-label={STRINGS.sharePassage(`${surah}:${passageRange(passage)}`)}
      />
    </h2>
  );
}

/**
 * An Ayah's heading, English inside the right-to-left, Arabic reader: a button
 * with a share icon that opens Ayah `id`'s Share page (ShareButtons listens
 * for clicks on it), and beside it a play button that listens from this Ayah
 * (#109; the RecitationProvider listens for clicks on it). The icons are drawn
 * by CSS, so long Surahs carry no markup for them. The heading is named by its
 * share button alone, as it was before the play button joined it.
 */
function AyahHeading({ id, surah, number }: { id: string; surah: number; number: number }) {
  return (
    <AyahHeadingTag className={styles.ayahHead} dir="ltr" lang="en" aria-label={STRINGS.shareAyah(id)}>
      <button type="button" className={styles.share} data-share={shareData(surah, number, number)} aria-label={STRINGS.shareAyah(id)}>
        {STRINGS.ayah(number)}
      </button>
      <button type="button" className={styles.listenAyah} data-listen={number} aria-label={STRINGS.listenFrom(id)} />
    </AyahHeadingTag>
  );
}
