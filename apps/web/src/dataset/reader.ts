// The dataset reader: the only code pages call for Quran data. The Quran
// text, Word meanings, Ayah translations, Surah metadata, Word counts and
// Recitation timings are read from Neon (#172, ADR 0049), through Next's data
// cache (src/quran/cached.ts), so every read is async and each page that makes
// one renders on request (ADR 0020). The Admin area, and the saves and
// Publishes it makes, read through the `…Now` reads instead: from Neon on each
// request, past that cache, so an Admin sees and is checked against the rows
// as they are. Every Root, with its Lemmas and Spellings, and each Script's
// Juz list are read from Neon too (#173), and each Word's grammar (#275),
// through the same cache: no generated file is read.

import { joinedScripts, spellingParts, themeGroupInLanguage } from "@saaliheen/dataset/parts";
import { LANGUAGES } from "@saaliheen/dataset/types";
import type { JuzLists, Language, ListedParticle, ListedRoot, ListedRootRow, Particle, ParticleTag, PartThemeGroup, Passage, Recitation, Root, RootTag, Script, Surah, SurahSummary, ThemeGroup, Word } from "@saaliheen/dataset/types";
import { cachedAyahGrammar, cachedAyahWordCounts, cachedJuz, cachedParticle, cachedParticleList, cachedRecitation, cachedRoot, cachedRootId, cachedSpellingPart, cachedRootList, cachedRootRows, cachedSurah, cachedSurahGrammarLines, cachedSurahSummaries } from "../quran/cached.ts";
import type { GrammarLine, Segment } from "@saaliheen/dataset/grammar";
import { isSurahNumber, readAyahWordCounts, readSurah, readSurahSummaries } from "../quran/quran.ts";
import type { SpellingAyah } from "../quran/roots.ts";


export type {
  Ayah,
  Language,
  Juz,
  JuzLists,
  Lemma,
  ListedParticle,
  PartAyah,
  PartPassage,
  PartThemeAyah,
  PartThemeGroup,
  PartWord,
  PassageTafsir,
  Passage,
  Recitation,
  Particle,
  ParticleKind,
  ParticleTag,
  Root,
  RootTag,
  Script,
  SectionMarks,
  Spelling,
  Surah,
  SurahSummary,
  Theme,
  ThemeCategory,
  ThemeGroup,
  Word,
} from "@saaliheen/dataset/types";
export type { SurahPart } from "@saaliheen/dataset/parts";
export { surahAyahs } from "@saaliheen/dataset/parts";
export { LANGUAGES, SCRIPTS } from "@saaliheen/dataset/types";

/** Whether `value` names a Language: a page that takes any params checks its own (ADR 0024). */
export const isLanguage = (value: string): value is Language => (LANGUAGES as readonly string[]).includes(value);

export { isSurahNumber };

/** All 114 Surahs in order, without their Ayahs. */
export const listSurahs = (): Promise<SurahSummary[]> => cachedSurahSummaries();

/** A Surah's number, its Arabic and Latin names and how many Ayahs it has. */
export type SurahName = Pick<SurahSummary, "number" | "nameArabic" | "nameLatin" | "ayahCount">;

const namesOf = (surahs: SurahSummary[]): SurahName[] =>
  surahs.map(({ number, nameArabic, nameLatin, ayahCount }) => ({ number, nameArabic, nameLatin, ayahCount }));

/** All 114 Surahs' names, in order. */
export const listSurahNames = async (): Promise<SurahName[]> => namesOf(await listSurahs());

/** All 114 Surahs' names, in order, as Neon holds them now: for the admin area (#42). */
export const listSurahNamesNow = async (): Promise<SurahName[]> => namesOf(await readSurahSummaries());

/** How many Words each Ayah of every Surah holds, Surah 1 first, as Neon holds it now: what a save or Publish checks Word locations against. */
export const listAyahWordCountsNow = (): Promise<number[][]> => readAyahWordCounts();

/** One Surah with its Ayahs and Words, or undefined when `number` is not 1..114. */
export async function getSurah(number: number): Promise<Surah | undefined> {
  return isSurahNumber(number) ? cachedSurah(number) : undefined;
}

/** Surah `number`'s Grammar lines (#275) by Word location, none for a Word without Word grammar; empty when `number` is not 1..114. */
export async function getSurahGrammarLines(number: number): Promise<Record<string, GrammarLine>> {
  return isSurahNumber(number) ? cachedSurahGrammarLines(number) : {};
}

/** A Word as its Word grammar dialog shows it (#277): its Segments, none for a Word without Word grammar, and the Root, or else the particle, Study gives it. */
export interface WordGrammar {
  segments: Segment[];
  root: RootTag | null;
  particle?: ParticleTag;
}

/** Each Word of Ayah `surah`:`ayah` as its Word grammar dialog shows it, by Word location; undefined when there is no such Ayah. */
export async function getAyahGrammar(surah: number, ayah: number): Promise<Record<string, WordGrammar> | undefined> {
  const words = (await getSurah(surah))?.ayahs[ayah - 1]?.words;
  if (!words) return undefined;
  const segments = await cachedAyahGrammar(surah, ayah);
  return Object.fromEntries(
    words.map(({ location, root, particle }) => [location, { segments: segments[location] ?? [], root, ...(particle && { particle }) }]),
  );
}

/** Surah `number` as Neon holds it now, or undefined when `number` is not 1..114: what a Publish checks against. */
export const getSurahNow = (number: number): Promise<Surah | undefined> => readSurah(number);

/** How many Words each Ayah of Surah `number` holds, Ayah 1 first; undefined when `number` is not 1..114. */
export async function ayahWordCounts(number: number): Promise<number[] | undefined> {
  return isSurahNumber(number) ? (await cachedAyahWordCounts())[number - 1] : undefined;
}

/** A Word as the Passage editor's Phrases mode shows it (#100): its Word location, its Arabic in each Script and its Word meanings. */
export type AyahWord = Pick<Word, "location" | "uthmani" | "indopak" | "meaning">;

/**
 * An Ayah as the Passage editor shows it (#44): its Arabic in each Script, its
 * Words joined by spaces, its Indo-Pak end as Digital Khatt writes it (#86, for
 * Flowing), its Ayah translation in each Language, and its Words one by one
 * for Phrases mode (#100), without the built copy's Phrase colours.
 */
export interface AyahText {
  number: number;
  uthmani: string;
  indopak: string;
  indopakEnd: string;
  translation: Record<Language, string>;
  words: AyahWord[];
}

/** Surah `number`'s Ayahs as the Passage editor shows them, Ayah 1 first; [] when `number` is not 1..114. */
export async function surahAyahTexts(number: number): Promise<AyahText[]> {
  const surah = await getSurah(number);
  return surah ? ayahTextsOf(surah) : [];
}

/** Surah `number`'s Ayahs as `surahAyahTexts` gives them, as Neon holds them now: for the admin area. */
export async function surahAyahTextsNow(number: number): Promise<AyahText[]> {
  const surah = await readSurah(number);
  return surah ? ayahTextsOf(surah) : [];
}

/** `surah`'s Ayahs as `surahAyahTexts` gives them. */
export const ayahTextsOf = (surah: Surah): AyahText[] =>
  surah.ayahs.map(({ number, words, indopakEnd, translation }) => ({
    number,
    ...joinedScripts(words),
    indopakEnd,
    translation,
    words: words.map(({ location, uthmani, indopak, meaning }) => ({ location, uthmani, indopak, meaning })),
  }));

/** The Bismillah in each Script, shown before Ayah 1 of a Surah whose `bismillah` is true. */
export type Bismillah = Record<Script, string>;

/** The Bismillah: Ayah 1:1's Words in each Script (in Al-Fatihah it is that Ayah), joined by spaces. */
export async function getBismillah(): Promise<Bismillah> {
  const { words } = (await getSurah(1))!.ayahs[0];
  return { uthmani: words.map((w) => w.uthmani).join(" "), indopak: words.map((w) => w.indopak).join(" ") };
}

/** One Root with its Lemmas and Spellings, or undefined when no Root has QUL id `id`. */
export async function getRoot(id: number): Promise<Root | undefined> {
  return Number.isSafeInteger(id) && id > 0 ? cachedRoot(id) : undefined;
}

/** The Root a Root page names by its letters, spaces taken out (#287, ADR 0065), or undefined when none has them. */
export async function getRootByLetters(letters: string): Promise<Root | undefined> {
  const id = await cachedRootId(letters);
  return id === undefined ? undefined : cachedRoot(id);
}

/**
 * Part `part` of the Ayahs of Spelling `spelling` of Lemma `lemma` of `root`,
 * all counted from 1 in the Root's order (#288): the Ayahs its Word locations
 * are in, each once and in Quran order, fifty at a time (spellingParts).
 * Undefined when there is no such part.
 */
export async function getSpellingPart(root: Root, lemma: number, spelling: number, part: number): Promise<SpellingAyah[] | undefined> {
  const locations = root.lemmas[lemma - 1]?.spellings[spelling - 1]?.locations;
  const keys = locations && spellingParts(locations)[part - 1];
  return keys && cachedSpellingPart(root.id, lemma, spelling, part, keys);
}

/** Every Root (#248), by ascending QUL id: its letters and its Lemmas' representative meanings in each Language, most frequent Lemma first. */
export const listRoots = (): Promise<ListedRoot[]> => cachedRootList();

/** Every Root (#290), by ascending QUL id: its letters, transliteration and count of occurrences, as the Roots list shows them. */
export const listRootRows = (): Promise<ListedRootRow[]> => cachedRootRows();

/** One particle with its Spellings (#249), or undefined when no particle is numbered `id`. */
export async function getParticle(id: number): Promise<Particle | undefined> {
  return Number.isSafeInteger(id) && id > 0 ? cachedParticle(id) : undefined;
}

/** Every particle (#251), by number, so most frequent first: its tag and its Spellings' meanings in each Language. */
export const listParticles = (): Promise<ListedParticle[]> => cachedParticleList();

/** Surah `number`'s Recitation (#115), or undefined when `number` is not 1..114. */
export async function getRecitation(number: number): Promise<Recitation | undefined> {
  return isSurahNumber(number) ? cachedRecitation(number) : undefined;
}

/** Each Script's 30 Juz (#193), Juz 1 first: number, name in that Script, first and last Ayah. */
export const listJuz = (): Promise<JuzLists> => cachedJuz();

/**
 * Passage groups `groups` as a Theme page in `lang` shows them, and its Theme
 * parts carry them: each group's Passage title is its Surah's in `passages`,
 * Neon's (#171), not its file's.
 */
export async function themeGroupsInLanguage(groups: ThemeGroup[], lang: Language, passages: ReadonlyMap<number, Passage[]>): Promise<PartThemeGroup[]> {
  const surahs = await surahsByNumber(groups.map((g) => g.surah));
  return groups.map((group) => themeGroupInLanguage({ ...surahs.get(group.surah)!, passages: passages.get(group.surah) ?? [] }, group, lang));
}

/** Each Surah numbered in `numbers` (each 1..114), read once by `read`, by number. */
export async function surahsByNumber(numbers: Iterable<number>, read: (number: number) => Promise<Surah | undefined> = getSurah): Promise<Map<number, Surah>> {
  return new Map(await Promise.all([...new Set(numbers)].map(async (n) => [n, (await read(n))!] as const)));
}
