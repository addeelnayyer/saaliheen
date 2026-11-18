// The site dataset's shape: what the builder writes and the website's dataset
// reader serves. Shared by both so neither imports the other.

import type { Language, PartPassage, Passage } from "@saaliheen/passages";

export type { Language, PartPassage, Passage } from "@saaliheen/passages";
export { LANGUAGES } from "@saaliheen/passages";

/** The two Scripts a Word's Arabic is shown in (ADR 0002). */
export type Script = "uthmani" | "indopak";
export const SCRIPTS: readonly Script[] = ["uthmani", "indopak"];

export interface Word {
  /** Word location, `surah:ayah:word`, counted from 1 within the Ayah. */
  location: string;
  /** Uthmani Script text (QPC Hafs word by word), less the printed Hizb quarter sign ۞ and its space (ADR 0020). */
  uthmani: string;
  /** Indo-Pak Script text (Digital Khatt Indopak word by word). */
  indopak: string;
  /** QUL's Word meaning for this Word location, per Language; "" when QUL has none (see the report). */
  meaning: Record<Language, string>;
  /** The Word's Root as its card shows it; null when QUL gives the Word no Root (a particle or pronoun). */
  root: RootTag | null;
  /** The Word's particle as its card's Particle tag shows it (#249): present exactly when the Word has no Root. */
  particle?: ParticleTag;
  /** The Phrase colour its Phrase takes (#99): present only on Words of a covered Passage. */
  phraseColour?: PhraseColour;
}

/** A Phrase (#99): a run of Words read without stopping, as its first and last Word location, within one Passage. */
export interface Phrase {
  first: string;
  last: string;
}

/** The two Phrase colours, alternating Phrase by Phrase from "a" at each covered Passage's first Phrase (#99). */
export type PhraseColour = "a" | "b";

/** A Word's Root: QUL's Root id (its Root file's name) and its single-spaced letters. */
export interface RootTag {
  id: number;
  letters: string;
}

/** One exact text within a Lemma, pause marks aside, and every Word location written that way. */
export interface Spelling {
  /** Both Scripts' text at the Spelling's first Word location. */
  uthmani: string;
  indopak: string;
  /** roots.json's meaning at the first Word location, else QUL's Word meaning there (ADR 0003). */
  meaning: Record<Language, string>;
  /** In Quran order; their number is the Spelling's occurrence count. */
  locations: string[];
}

/** A QUL Lemma within one Root, or (id and text null) the Root's Word locations QUL gives no Lemma. */
export interface Lemma {
  id: number | null;
  text: string | null;
  occurrences: number;
  /** The representative meaning: the meaning of the Lemma's most frequent (first) Spelling. */
  meaning: Record<Language, string>;
  /** Most frequent first; ties by first Word location. */
  spellings: Spelling[];
}

/** What makes a rootless Word's particle (#249): its QUL Lemma, or, when QUL gives it none, its Spelling. */
export type ParticleKind = "lemma" | "spelling";

/** A rootless Word's particle as its Particle tag shows it (#249). */
export interface ParticleTag {
  /** The particle's number, its particle file's name: 1 for the most frequent. */
  id: number;
  kind: ParticleKind;
  /** QUL's Lemma text, or the Spelling's Uthmani text with pause marks set aside: what a Known particle is kept by (ADR 0057). */
  text: string;
  /** The text in the Indo-Pak Script: a Spelling's Indo-Pak text at its first Word location; a Lemma's text, which QUL writes once. */
  indopak: string;
}

/** A particle (#249) with its Spellings, in the shape of a Root's Lemma: what its particle file holds. */
export interface Particle extends ParticleTag {
  /** How many Words it covers: the number of its Spellings' Word locations. */
  occurrences: number;
  /** Most frequent first; ties by first Word location. A Spelling particle has one. */
  spellings: Spelling[];
}

export interface Root extends RootTag {
  /** QUL's Buckwalter letters transliterated, hyphen-joined (e.g. r-ḥ-m). */
  transliteration: string;
  /** How many Word locations QUL gives the Root. */
  occurrences: number;
  /** QUL's unique Word count for the Root. */
  uniqueWords: number;
  /** Most frequent first; ties by first Word location. */
  lemmas: Lemma[];
}

/**
 * A Root as the Known words page lists it (#248), and as /data/v1/roots.json
 * gives every Root (#253): its letters and its Lemmas' representative meanings
 * in each Language, most frequent Lemma first, empty ones left out.
 */
export interface ListedRoot {
  letters: string;
  meanings: Record<Language, string[]>;
}

/** A Root as the Roots list shows it (#290): its letters, transliteration (hyphen-joined, e.g. r-ḥ-m) and count of occurrences. */
export interface ListedRootRow {
  letters: string;
  transliteration: string;
  occurrences: number;
}

/**
 * A particle as the Known words page lists it (#251): its tag and its
 * Spellings' meanings in each Language, most frequent Spelling first, empty and
 * repeated ones left out.
 */
export interface ListedParticle extends ParticleTag {
  meanings: Record<Language, string[]>;
}

export interface Ayah {
  /** Ayah number within its Surah, from 1. */
  number: number;
  /** The Ayah's Words in order; Ayah-end markers are not Words. */
  words: Word[];
  /**
   * Digital Khatt's text at the Ayah's Ayah-end marker, verbatim: the
   * end-of-Ayah sign U+06DD with its own numbering (Al-Fatihah without its
   * Bismillah) and any pause or sajdah marks, less the printed Ruku sign
   * U+08D6, which Section marks replace (ADR 0020). QPC Hafs's marker is only
   * the Ayah's number (its font draws the sign), so it is not kept.
   */
  indopakEnd: string;
  /**
   * The full Ayah translation per Language: Urdu is Fateh Muhammad Jalandhari's
   * text verbatim; English is Saheeh International's with its inline `[[…]]`
   * footnotes removed and whitespace collapsed.
   */
  translation: Record<Language, string>;
  /** The slugs of the Ayah's Themes, in tagged order (#129): empty in the generated dataset, Neon's as the website serves it (#170, ADR 0041). */
  themes: string[];
}

/** What an Ayah's Iltifat chip needs of an Iltifat (#140): its id for its fragment, its Iltifat direction's slug, and whether it is Disputed. */
export interface IltifatChip {
  id: number;
  direction: "he-to-we" | "we-to-he" | "he-to-you" | "you-to-he";
  disputed: boolean;
}

/** A Word in one Language, as a Surah page shows it and that Language's Surah part carries it: its Word meaning in that Language only. */
export interface PartWord extends Omit<Word, "meaning"> {
  meaning: string;
  /** Whether the Word is an Allah reference (#147): set by the website from Neon, never by the dataset build; absent on every other Word. */
  allahReference?: true;
}

/**
 * An Ayah in one Language, as a Surah page shows it and that Language's Surah
 * part carries it (#24): its Words and Ayah translation in that Language only,
 * and its Indo-Pak end, for sharing it (#19).
 */
export interface PartAyah extends Pick<Ayah, "number" | "indopakEnd" | "themes"> {
  words: PartWord[];
  translation: string;
  /** The Iltifat cited at this Ayah (#140): set by the website from Neon, never by the dataset build; absent on every Ayah that cites none. */
  iltifat?: IltifatChip[];
  /** The Passage that begins at this Ayah, with its Passage title in this Language only (#41); absent on every other Ayah. */
  passage?: PartPassage;
  /** The Tafsir of the Passage that ends at this Ayah, in this Language only (#234): set by the website from Neon, never by the dataset build; absent on every other Ayah. */
  tafsir?: PassageTafsir;
}

/** One Tafsir entry (#233): the Ayahs of its Surah it was written for, and its text as published, with its bold and italic markup. */
export interface TafsirEntryText {
  firstAyah: number;
  lastAyah: number;
  text: string;
}

/** A Passage's Tafsir in one Language (#234): its Tafsir entries in order, and the line crediting their edition. */
export interface PassageTafsir {
  entries: TafsirEntryText[];
  credit: string;
}

/** A Surah without its Ayahs: one entry of the Surah list. */
export interface SurahSummary {
  number: number;
  nameArabic: string;
  nameLatin: string;
  revelationPlace: "makki" | "madani";
  ayahCount: number;
  /** Whether a Bismillah is shown before the first Ayah. */
  bismillah: boolean;
}

/** One Section mark (#194, ADR 0020): the Ayah, by its number in its Surah, it stands above, and its label. */
export interface SectionMark {
  ayah: number;
  /** "Hizb 3", "¼ Hizb 3", "½ Hizb 3" or "¾ Hizb 3" for a Hizb quarter; "Ruku 2 of 2 · 3 Ayahs" (or "· 1 Ayah") for a Ruku. */
  label: string;
}

/** A Surah's Section marks from QUL's metadata, the same in both Scripts, each list in Ayah order (#194, ADR 0020). */
export interface SectionMarks {
  /** Every Hizb quarter that starts in the Surah, those at its first Ayah included. */
  hizbQuarters: SectionMark[];
  /** Every Ruku of the Surah, numbered 1 upwards. */
  rukus: SectionMark[];
}

export interface Surah extends SurahSummary {
  /** Its Hizb quarters and Rukus, from QUL's Rub' al-Hizb and Ruku files (#194). */
  sectionMarks: SectionMarks;
  /** The Surah's Passages, in order, covering its Ayahs once each (#41): [] as the dataset build writes it, Neon's as /data/v1 serves it (#171). */
  passages: Passage[];
  /** The Surah's Phrases, in Quran order (#99): [] as the dataset build writes it, Neon's as /data/v1 serves it (#171). */
  phrases: Phrase[];
  ayahs: Ayah[];
}

/**
 * A Word's timing in a Recitation (ADR 0010): its Word number within its Ayah,
 * and when the Reciter starts and stops saying it, in ms from the start of the
 * Surah's audio. QUL's own shape.
 */
export type WordTiming = [word: number, start: number, end: number];

/** One Ayah of a Recitation: where it starts and ends in the Surah's audio, in ms, and its Word timings. */
export interface RecitedAyah {
  number: number;
  from: number;
  to: number;
  /**
   * In the order the Reciter says them (by start): a Word he repeats is timed
   * again where he goes back to it, so Word numbers can run back (2:9 runs 1–9
   * then 6–10). A Word with no timing (see the report) is missing.
   */
  words: WordTiming[];
}

/** One Reciter's Recitation of one Surah (#115, ADR 0010): one audio file, timed Word by Word. */
export interface Recitation {
  surah: number;
  /** The Reciter's name, e.g. "Yasser ad-Dussary". */
  reciter: string;
  /** The address of the Surah's audio file, which starts at Ayah 1 with no Bismillah of its own. */
  audio: string;
  /** Every Ayah of the Surah, Ayah 1 first. */
  ayahs: RecitedAyah[];
}

/** A Theme category (#129): one of the 13 groups the Themes fall into, named in each Language. */
export interface ThemeCategory {
  slug: string;
  en: string;
  ur: string;
}

/**
 * One Passage group of a Theme page (#129): a Passage's full Ayah range, and
 * the Theme's Ayahs within it that come one after another in the Theme's list.
 */
export interface ThemeGroup {
  surah: number;
  /** The Passage's first and last Ayah: its whole range, not just the matching Ayahs. */
  from: number;
  till: number;
  /** The matching Ayahs' numbers, in order. */
  ayahs: number[];
}

/**
 * An Ayah as a Theme page shows it in one Language (#129) and its Theme part
 * carries it (#131): its Arabic in each Script, its Words joined by spaces, its
 * Indo-Pak end, and its Ayah translation in that Language only.
 */
export interface PartThemeAyah extends Pick<Ayah, "number" | "indopakEnd"> {
  uthmani: string;
  indopak: string;
  translation: string;
}

/**
 * A Passage group as a Theme page shows it in one Language and its Theme part
 * carries it (#131): its Surah's number and Latin name, its Passage with the
 * Passage title in that Language only, and the matching Ayahs.
 */
export interface PartThemeGroup {
  surah: number;
  surahName: string;
  passage: PartPassage;
  ayahs: PartThemeAyah[];
}

/** A Theme (#128, #129): something Ayahs speak of, from Saaliheen's Themes file. */
export interface Theme {
  /** Made from its English name, as its Theme page's address ends: `day-of-judgment`. */
  slug: string;
  en: string;
  ur: string;
  /** Its Theme category's slug. */
  category: string;
  /** Written for tagging: kept, but never shown to readers. */
  description: string;
  /** How many Ayahs have this Theme. */
  ayahCount: number;
  /** Its Theme page's Passage groups, in Quran order. */
  groups: ThemeGroup[];
}

/** One Juz of a Script's Juz list (#193, ADR 0021): its number, its name in that Script and its first and last Ayah ("36:28"). */
export interface Juz {
  number: number;
  /** The opening Words of its first Ayah in its Script, without the ۞ Hizb sign. */
  name: string;
  firstAyah: string;
  lastAyah: string;
}

/** Each Script's 30 Juz, Juz 1 first (#193): where the Juz start follows the Script (ADR 0021). */
export type JuzLists = Record<Script, Juz[]>;

export interface Dataset {
  /** All 114 Surahs, in order. */
  surahs: Surah[];
  /** Every QUL Root, by id. */
  roots: Root[];
  /** Every particle (#249), by number: most frequent first. */
  particles: Particle[];
  /** Each Surah's Recitation, Surah 1 first (#115). */
  recitations: Recitation[];
  /** Each Script's Juz list (#193). */
  juz: JuzLists;
}

/** A Word location whose Word meaning QUL lacks in one Language. */
export interface WordMeaningGap {
  location: string;
  language: Language;
  /** `missing`: no entry in the Word meaning file; `empty`: an entry with no text. */
  problem: "missing" | "empty";
}

/** A Word location whose Root differs between QUL and roots.json (every hamza read as ا), or that only one gives a Root. */
export interface RootDisagreement {
  location: string;
  /** QUL's Root letters, single-spaced; null when QUL gives none. */
  qul: string | null;
  /** roots.json's Root letters as written there; null when roots.json lists none. */
  rootsJson: string | null;
}

/** Everything the sources disagree on or lack; later issues add sections. */
export interface Report {
  /** In Word order, then Language order. */
  wordMeaningGaps: WordMeaningGap[];
  /** In Word location order (ADR 0003: listed, never resolved). */
  rootDisagreements: RootDisagreement[];
  /** The Word locations the Recitation gives no timing, in Word order (#115, ADR 0010). */
  untimedWords: string[];
}

export interface BuildResult {
  dataset: Dataset;
  report: Report;
}
