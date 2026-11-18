// The Passages module (#41, ADR 0006), a shared package since #64: the pure
// Passage rules for Saaliheen's Passages, with no file or network access, so
// the dataset build, the website's admin area and the coming mobile app use
// one copy of them.
//
// The dataset builder checks each Surah's Passages with `problems` and fails,
// naming the Surah and Ayahs, on a gap, an overlap, a Passage running past its
// Surah's end (or into the next Surah), or a missing English or Urdu Passage
// title. Given each Language's Tafsir entry ranges too (#235, ADR 0053), as
// the Passage editor and a Publish give them, `problems` also names every
// Passage that begins inside a Tafsir entry, splitting it. The edit rules
// (retitle, split, join, moveStart), the publish check and the summary are
// what an Admin's edits to Passages use. No edit changes the Passages it is
// given; each returns new ones.

import { LANGUAGES, type Language } from "./language.ts";

export { LANGUAGES, type Language } from "./language.ts";

/** A Passage within one Surah: its first and last Ayah, both included, and its Passage title in each Language. */
export interface Passage {
  from: number;
  till: number;
  en: string;
  ur: string;
}

/** The Ayahs one Tafsir entry was written for, both included, within one Surah. */
export interface TafsirEntryRange {
  firstAyah: number;
  lastAyah: number;
}

/** A Surah's Tafsir entry ranges in each Language that has them; a Language left out, or with none, splits nothing. */
export type TafsirRanges = Partial<Record<Language, TafsirEntryRange[]>>;

/** A Passage as a Surah part in one Language carries it, on the Ayah the Passage begins at: its title in that Language only. */
export interface PartPassage {
  from: number;
  till: number;
  title: string;
}

/** One edit to a Surah's Passages: the Passages after it, and how the summary names it (`split 83–88 at 86`). */
export interface PassageEdit {
  passages: Passage[];
  label: string;
}

/** A Passage's Ayahs as the summary writes it: `83–88`, or `88` for one Ayah. */
export const written = ({ from, till }: { from: number; till: number }) =>
  from === till ? `${from}` : `${from}–${till}`;

/** Ayahs `from`..`till` as a problem names them: `Ayahs 83–88`, or `Ayah 88`. */
export const ayahs = (from: number, till: number) => `${from === till ? "Ayah" : "Ayahs"} ${written({ from, till })}`;

/** Each Language as a problem names it. */
export const LANGUAGE_NAME: Record<Language, string> = { en: "English", ur: "Urdu" };

/** `passage` in `lang`, as the Surah part carries it on the Ayah it begins at. */
export const passageInLanguage = (passage: Passage, lang: Language): PartPassage => ({
  from: passage.from,
  till: passage.till,
  title: passage[lang],
});

/**
 * Everything wrong with a Surah of `ayahCount` Ayahs having `passages`, in
 * order, each naming its Ayahs (`Ayah 88: in no Passage`); none when they cover
 * its Ayahs once each, in order, every Passage has both Passage titles, and
 * none begins inside one of `tafsir`'s entries
 * (`Passage 89–91: splits the English Tafsir entry 88–89`).
 * A title of only whitespace is missing.
 */
export function problems(passages: Passage[], ayahCount: number, tafsir: TafsirRanges = {}): string[] {
  const found: string[] = [];
  let next = 1; // the first Ayah no Passage so far covers
  for (const passage of passages) {
    found.push(...coverageProblems(passage, next, ayahCount), ...titleProblems(passage), ...tafsirProblems(passage, tafsir));
    next = Math.max(next, passage.till + 1);
  }
  if (next <= ayahCount) found.push(`${ayahs(next, ayahCount)}: in no Passage`);
  if (next - 1 > ayahCount) found.push(`${ayahs(ayahCount + 1, next - 1)}: past the Surah's end (it has ${ayahCount} Ayahs)`);
  return found;
}

/**
 * A gap before `passage`, its overlap with the Passages before it, or its
 * ending before it begins. A gap names only Ayahs the Surah has: a Passage
 * starting beyond its end is named once, as running past it.
 */
function coverageProblems({ from, till }: Passage, next: number, ayahCount: number): string[] {
  if (till < from) return [`Passage ${from}–${till}: ends before it begins`];
  const gapEnd = Math.min(from - 1, ayahCount);
  if (gapEnd >= next) return [`${ayahs(next, gapEnd)}: in no Passage`];
  if (from < next) return [`${ayahs(from, Math.min(next - 1, till))}: in more than one Passage`];
  return [];
}

function titleProblems(passage: Passage): string[] {
  return LANGUAGES.filter((lang) => !passage[lang].trim()).map(
    (lang) => `${ayahs(passage.from, passage.till)}: no ${LANGUAGE_NAME[lang]} Passage title`,
  );
}

/** How a problem names `lang`'s Tafsir entry `entry`: `the English Tafsir entry 88–89`. */
export const tafsirEntryName = (lang: Language, entry: TafsirEntryRange) =>
  `the ${LANGUAGE_NAME[lang]} Tafsir entry ${written({ from: entry.firstAyah, till: entry.lastAyah })}`;

/** The Tafsir entries of `tafsir`, Language by Language, that a Passage beginning at Ayah `ayah` splits by beginning inside them. */
export const entriesSplitAt = (ayah: number, tafsir: TafsirRanges): { lang: Language; entry: TafsirEntryRange }[] =>
  LANGUAGES.flatMap((lang) => (tafsir[lang] ?? []).filter((e) => e.firstAyah < ayah && ayah <= e.lastAyah).map((entry) => ({ lang, entry })));

/** The Tafsir entries, in each Language of `tafsir`, that `passage` splits. */
const tafsirProblems = (passage: Passage, tafsir: TafsirRanges): string[] =>
  entriesSplitAt(passage.from, tafsir).map(({ lang, entry }) => `Passage ${written(passage)}: splits ${tafsirEntryName(lang, entry)}`);

/** Every Tafsir entry of `tafsir` that `passages` split, in Passage order, each named as problems() names it. */
export const tafsirSplits = (passages: Passage[], tafsir: TafsirRanges): string[] => passages.flatMap((p) => tafsirProblems(p, tafsir));

/**
 * Whether a Surah of `ayahCount` Ayahs may publish `passages`: they cover its
 * Ayahs once each, every Passage has an English and an Urdu title, and none
 * splits one of `tafsir`'s entries.
 */
export function publishable(passages: Passage[], ayahCount: number, tafsir: TafsirRanges = {}): boolean {
  return problems(passages, ayahCount, tafsir).length === 0;
}

/** `passages` with the `count` Passages from index `at` replaced by `replacement`. */
const replaced = (passages: Passage[], at: number, count: number, ...replacement: Passage[]) => [
  ...passages.slice(0, at),
  ...replacement,
  ...passages.slice(at + count),
];

const indexOf = (passages: Passage[], from: number) => passages.findIndex((p) => p.from === from);

/**
 * Give the Passage starting at Ayah `from` the titles `en` and `ur`. Null when
 * both titles are unchanged (a no-op) or no Passage starts at `from`.
 */
export function retitle(passages: Passage[], from: number, en: string, ur: string): PassageEdit | null {
  const i = indexOf(passages, from);
  const passage = passages[i];
  if (!passage || (passage.en === en && passage.ur === ur)) return null;
  return { passages: replaced(passages, i, 1, { ...passage, en, ur }), label: `retitle ${written(passage)}` };
}

/**
 * Split the Passage starting at Ayah `from` before Ayah `at`: it keeps its
 * titles and ends at `at - 1`; a new Passage `at`..its end has no titles.
 * Null unless `from < at <= till`.
 */
export function split(passages: Passage[], from: number, at: number): PassageEdit | null {
  const i = indexOf(passages, from);
  const passage = passages[i];
  if (!passage || at <= passage.from || at > passage.till) return null;
  return {
    passages: replaced(passages, i, 1, { ...passage, till: at - 1 }, { from: at, till: passage.till, en: "", ur: "" }),
    label: `split ${written(passage)} at ${at}`,
  };
}

/** Join the Passage starting at Ayah `from` into the one above, which keeps its titles. Null for the Surah's first Passage. */
export function join(passages: Passage[], from: number): PassageEdit | null {
  const i = indexOf(passages, from);
  if (i < 1) return null;
  const [above, passage] = [passages[i - 1], passages[i]];
  return {
    passages: replaced(passages, i - 1, 2, { ...above, till: passage.till }),
    label: `join ${written(passage)} into ${written(above)}`,
  };
}

/**
 * Move the start of the Passage starting at Ayah `from` to Ayah `to`; the one
 * above then ends at `to - 1`. Null for the Surah's first Passage, unless
 * `above.from < to <= till`, and when `to` is where it already starts.
 */
export function moveStart(passages: Passage[], from: number, to: number): PassageEdit | null {
  const i = indexOf(passages, from);
  if (i < 1) return null;
  const [above, passage] = [passages[i - 1], passages[i]];
  if (to <= above.from || to > passage.till || to === passage.from) return null;
  return {
    passages: replaced(passages, i - 1, 2, { ...above, till: to - 1 }, { ...passage, from: to }),
    label: `move start of ${written(passage)} to ${to}`,
  };
}

/** The summary for `edits` to Surah `surah`'s Passages, in order: `Surah 18: split 83–88 at 86; retitle 89–91`. */
export function message(surah: number, edits: PassageEdit[]): string {
  return `Surah ${surah}: ${edits.map((edit) => edit.label).join("; ")}`;
}
