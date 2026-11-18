// How a Surah, and a Theme page, is split into parts for opening it from
// inside the app (#24, #131, ADR 0005 and 0014): the screen shows at once and
// fills in part by part, each part a static file. A Root page's Spelling's
// Ayahs are split too, fifty at a time (#288). A Surah part is a run of
// whole, consecutive Ayahs cut by Word count; a Theme part a run of whole,
// consecutive Passage groups cut by Ayah count. Either way the first part is
// small, so the first Ayahs show soon, and later parts are larger, so a long
// Surah or Theme takes fewer requests. An Ayah, or a Passage group, longer
// than a part's budget is a part on its own.

import { passageInLanguage } from "@saaliheen/passages";
import type { Ayah, Language, PartAyah, PartThemeAyah, PartThemeGroup, Passage, Surah, ThemeGroup, Word } from "./types.ts";

/** The Ayahs of one part, by Ayah number, both ends included. */
export interface SurahPart {
  first: number;
  last: number;
}

/** The most Words the first part holds. */
export const FIRST_PART_WORDS = 60;
/** The most Words any later part holds. */
export const PART_WORDS = 400;

/**
 * `items` cut into runs, in order: each run holds whole items, the first at most
 * `firstBudget` of their `size`, every later one at most `budget`; an item
 * larger than its run's budget is a run on its own. The one rule both kinds of
 * part are cut by.
 */
function runs<T>(items: T[], size: (item: T) => number, firstBudget: number, budget: number): T[][] {
  const cut: T[][] = [];
  let held = 0;
  for (const item of items) {
    const current = cut.at(-1);
    const n = size(item);
    if (current && held + n <= (cut.length === 1 ? firstBudget : budget)) {
      current.push(item);
      held += n;
    } else {
      cut.push([item]);
      held = n;
    }
  }
  return cut;
}

/** The parts of a Surah whose Ayahs hold `wordCounts[i]` Words (Ayah i + 1), in order. */
export function surahParts(wordCounts: number[]): SurahPart[] {
  const numbered = wordCounts.map((words, i) => ({ number: i + 1, words }));
  return runs(numbered, (a) => a.words, FIRST_PART_WORDS, PART_WORDS).map((run) => ({
    first: run[0].number,
    last: run.at(-1)!.number,
  }));
}

/** The most Ayahs the first Theme part holds. */
export const FIRST_THEME_PART_AYAHS = 20;
/** The most Ayahs any later Theme part holds. */
export const THEME_PART_AYAHS = 150;

/**
 * The Theme parts of a Theme page with Passage groups `groups`, in order (#131):
 * runs of whole, consecutive groups, so a group is never split, cut by Ayah
 * count. A Theme of up to FIRST_THEME_PART_AYAHS Ayahs is a single part.
 */
export const themeParts = (groups: ThemeGroup[]): ThemeGroup[][] =>
  runs(groups, (g) => g.ayahs.length, FIRST_THEME_PART_AYAHS, THEME_PART_AYAHS);

/** One Ayah of the Quran by its Surah and Ayah numbers. */
export interface AyahKey {
  surah: number;
  ayah: number;
}

/**
 * A Theme page's Passage groups (#129) for the Theme's Ayahs `ayahs`, in Quran
 * order: the Ayahs that come one after another in that list and lie in one
 * Passage together, under the Passage's full Ayah range. `passagesOf` gives a
 * Surah's Passages, which cover every one of its Ayahs.
 */
export function themeGroups(ayahs: AyahKey[], passagesOf: (surah: number) => Pick<Passage, "from" | "till">[]): ThemeGroup[] {
  const groups: ThemeGroup[] = [];
  for (const { surah, ayah } of ayahs) {
    const last = groups.at(-1);
    if (last && last.surah === surah && last.from <= ayah && ayah <= last.till) last.ayahs.push(ayah);
    else {
      const passage = passagesOf(surah).find((p) => p.from <= ayah && ayah <= p.till)!;
      groups.push({ surah, from: passage.from, till: passage.till, ayahs: [ayah] });
    }
  }
  return groups;
}

/** How many Ayahs each part of a Spelling's Ayahs holds on a Root page (#288). */
export const SPELLING_PART_AYAHS = 50;

/**
 * The parts of the Ayahs a Spelling of a Root occurs in, as its Root page
 * fetches them (#288): the Ayahs of its Word locations `locations`, given in
 * Quran order, each once and in Quran order, cut into runs of
 * SPELLING_PART_AYAHS, the last holding what is left.
 */
export function spellingParts(locations: string[]): AyahKey[][] {
  const ayahs: AyahKey[] = [];
  for (const location of locations) {
    const [surah, ayah] = location.split(":").map(Number);
    const last = ayahs.at(-1);
    if (last?.surah !== surah || last.ayah !== ayah) ayahs.push({ surah, ayah });
  }
  return runs(ayahs, () => 1, SPELLING_PART_AYAHS, SPELLING_PART_AYAHS);
}

/** Whether a Root of `occurrences` Word locations opens with every Spelling open (#288): one of at most SPELLING_PART_AYAHS does, each Spelling then a single part; a larger one opens with each closed. */
export const spellingsStartOpen = (occurrences: number) => occurrences <= SPELLING_PART_AYAHS;

/** An Ayah's `words` joined by spaces in each Script, as the Theme pages and the Passage editor show an Ayah's text. */
export const joinedScripts = (words: Pick<Word, "uthmani" | "indopak">[]): { uthmani: string; indopak: string } => ({
  uthmani: words.map((w) => w.uthmani).join(" "),
  indopak: words.map((w) => w.indopak).join(" "),
});

/** An Ayah as a Theme page in `lang` shows it: its Words joined in each Script, its Ayah translation in `lang` only. */
const themeAyahInLanguage = ({ number, words, indopakEnd, translation }: Ayah, lang: Language): PartThemeAyah => ({
  number,
  ...joinedScripts(words),
  indopakEnd,
  translation: translation[lang],
});

/** Passage group `group` of Surah `surah` as a Theme page in `lang` shows it and its Theme part carries it. */
export function themeGroupInLanguage(surah: Surah, group: ThemeGroup, lang: Language): PartThemeGroup {
  const passage = surah.passages.find((p) => p.from === group.from)!;
  return {
    surah: surah.number,
    surahName: surah.nameLatin,
    passage: passageInLanguage(passage, lang),
    ayahs: group.ayahs.map((n) => themeAyahInLanguage(surah.ayahs[n - 1], lang)),
  };
}

/**
 * An Ayah in one Language, as a Surah page shows it and a part's file carries
 * it: each Word meaning and the Ayah translation in `lang` only, its Themes'
 * slugs (#129), and, when
 * `passage` begins at this Ayah, that Passage with its title in `lang` only.
 */
function ayahInLanguage(ayah: Ayah, lang: Language, passage?: Passage): PartAyah {
  return {
    number: ayah.number,
    indopakEnd: ayah.indopakEnd,
    words: ayah.words.map((word) => ({ ...word, meaning: word.meaning[lang] })),
    translation: ayah.translation[lang],
    themes: ayah.themes,
    ...(passage && { passage: passageInLanguage(passage, lang) }),
  };
}

/** The Ayahs of `part` as its file in `lang` carries them (ayahInLanguage), each Passage on the Ayah it begins at. */
export function partAyahs(surah: Surah, part: SurahPart, lang: Language): PartAyah[] {
  const starting = new Map(surah.passages.map((passage) => [passage.from, passage]));
  return surah.ayahs
    .slice(part.first - 1, part.last)
    .map((ayah) => ayahInLanguage(ayah, lang, starting.get(ayah.number)));
}

/** Every Ayah of `surah` in `lang`, as a directly loaded Surah shows them: the same Ayahs its parts carry. */
export const surahAyahs = (surah: Surah, lang: Language): PartAyah[] =>
  partAyahs(surah, { first: 1, last: surah.ayahs.length }, lang);

/** A part's file name, `3.json` for part 3: the last segment of its address. */
export const partFileName = (part: number) => `${part}.json`;

/** The part a file name names (`3.json` is part 3), or NaN for any other name. */
export const partFromFileName = (name: string) => (/^\d+\.json$/.test(name) ? Number(name.slice(0, -5)) : NaN);

/** The part a file name names, as partFileName writes it, from part `from` on: `3.json`, never `03.json`; undefined for any other name. */
export const canonicalPartFromFileName = (name: string, from = 1) => {
  const part = partFromFileName(name);
  return part >= from && partFileName(part) === name ? part : undefined;
};

/** The part a file name names from the second on, for a page that arrives with its first: `2.json`, never `02.json` or `1.json`; undefined for any other name. */
export const laterPartFromFileName = (name: string) => canonicalPartFromFileName(name, 2);

/** Where Surah `surah`'s parts in `lang` are served: `/parts/<lang>/<Surah>`, each at `<part>.json` below it (partUrl). */
export const surahPartsAddress = (lang: Language, surah: number) => `/parts/${lang}/${surah}`;

/** Where Theme `slug`'s Theme parts in `lang` are served (#131): `/parts/<lang>/themes/<slug>`, each at `<part>.json` below it (partUrl). */
export const themePartsAddress = (lang: Language, slug: string) => `/parts/${lang}/themes/${slug}`;

/** Where Surah `surah`'s Grammar parts in `lang` are served (#278): `/parts/<lang>/grammar/<Surah>`, each at `<part>.json` below it (partUrl). */
export const grammarPartsAddress = (lang: Language, surah: number) => `/parts/${lang}/grammar/${surah}`;

/** Where the parts of the Ayahs of Spelling `spelling` of Lemma `lemma` (each from 1) of Root `root` (its QUL id) in `lang` are served (#288): `/parts/<lang>/roots/<root>/<lemma>/<spelling>`, each at `<part>.json` below it (partUrl). */
export const spellingPartsAddress = (lang: Language, root: number, lemma: number, spelling: number) => `/parts/${lang}/roots/${root}/${lemma}/${spelling}`;

/** Where part `part` (from 1) of the parts served at `address` (surahPartsAddress, themePartsAddress, grammarPartsAddress, spellingPartsAddress) is: `<address>/<part>.json`. */
export const partUrl = (address: string, part: number) => `${address}/${partFileName(part)}`;
