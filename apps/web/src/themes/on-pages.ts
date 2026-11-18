// The Themes as the pages show them (#170): ./cached.ts's reads from Neon,
// joined with the Quran the pages read beside them, Neon's too (#172). A Theme page
// groups its Ayahs by Neon's Passages of the Surahs it holds (#171,
// ../passages/), so it carries each of those Surahs' Passage tags, and a
// Surah's Ayahs are the Quran's with each Ayah's Themes from Neon in place of
// the file's.

import { themeGroups, themeParts } from "@saaliheen/dataset/parts";
import type { Language, PartAyah, PartThemeGroup, Passage, Surah, ThemeGroup } from "@saaliheen/dataset/types";
import { themeGroupsInLanguage } from "../dataset/reader.ts";
import { passagesBySurah } from "../passages/on-pages.ts";
import { placeThemes, withAyahThemes } from "../passages/served-surah.ts";
import { cachedAyahThemes, cachedThemeIndex, cachedThemeWithAyahs } from "./cached.ts";
import type { ThemeWithAyahs } from "./themes.ts";

/** A Theme page: its Theme, Theme category and Ayahs, its Passage groups, the Theme parts they are cut into, and its Surahs' Passages. */
export interface ThemePage extends ThemeWithAyahs {
  groups: ThemeGroup[];
  parts: ThemeGroup[][];
  passages: Map<number, Passage[]>;
}

/** The Theme whose slug is `slug`, from the cached index; undefined when none is. */
export const findTheme = async (slug: string) => (await cachedThemeIndex()).themes.find((t) => t.slug === slug);

/** Theme `slug`'s page, or undefined when no Theme has that slug; an address naming none reads nothing more. */
export async function readThemePage(slug: string): Promise<ThemePage | undefined> {
  const found = (await findTheme(slug)) ? await cachedThemeWithAyahs(slug) : null;
  if (!found) return undefined;
  const passages = await passagesBySurah(found.ayahs.map((a) => a.surah));
  const groups = themeGroups(found.ayahs, (surah) => passages.get(surah) ?? []);
  return { ...found, groups, parts: themeParts(groups), passages };
}

/** Passage groups `groups` of `page` as it shows them in `lang`. */
export const themeGroupsOf = (page: ThemePage, groups: ThemeGroup[], lang: Language): Promise<PartThemeGroup[]> =>
  themeGroupsInLanguage(groups, lang, page.passages);

/** Theme part `part` (from 1) of `page` in `lang`, or undefined when there is no such part. */
export async function themePartOf(page: ThemePage, lang: Language, part: number): Promise<PartThemeGroup[] | undefined> {
  const groups = page.parts[part - 1];
  return groups && (await themeGroupsOf(page, groups, lang));
}

/** Every Theme's name in `lang` by its slug, as Theme chips show them. */
export async function themeNames(lang: Language): Promise<Record<string, string>> {
  return Object.fromEntries((await cachedThemeIndex()).themes.map((t) => [t.slug, t[lang]]));
}

/** Each Ayah's Themes of Surah `surah` out of every Surah's, `all`, Ayah 1 first. */
const themesOf = (all: string[][][], surah: number): string[][] => all[surah - 1] ?? [];

/** Each Ayah's Themes of Surah `surah`, Ayah 1 first. */
const surahThemes = async (surah: number): Promise<string[][]> => themesOf(await cachedAyahThemes(), surah);

/** Surah `surah`'s `ayahs` (any run of them) with each Ayah's Themes from Neon. */
export async function withThemes(surah: number, ayahs: PartAyah[]): Promise<PartAyah[]> {
  return placeThemes(ayahs, await surahThemes(surah));
}

/** Every Surah of `surahs` whole, each Ayah's Themes from Neon, read once: its published Surah file's shape, key for key. */
export async function surahsWithThemes(surahs: Surah[]): Promise<Surah[]> {
  const all = await cachedAyahThemes();
  return surahs.map((surah) => withAyahThemes(surah, themesOf(all, surah.number)));
}

/** The names in `lang` of the Themes Surah `surah`'s Ayahs have, by slug: only those its Theme chips show. */
export async function surahThemeNames(surah: number, lang: Language): Promise<Record<string, string>> {
  const [names, themes] = await Promise.all([themeNames(lang), surahThemes(surah)]);
  return Object.fromEntries(themes.flat().map((slug) => [slug, names[slug]]));
}
