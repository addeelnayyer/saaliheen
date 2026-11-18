// The Themes file (data/themes.json, #129), read as the tests' source of every
// Theme's names, its Ayahs and its Urdu name: Urdu is never typed. Its shape is
// set out in ../../dataset/theme-support.ts. Themes live in Neon since #170, and
// the file is read as last committed before the move (../committed-output.ts),
// so every Theme scenario checks what the site serves from Neon against what it
// served before.

import { expect, type Locator, type Page } from "@playwright/test";
import { committedJson } from "../committed-output";
import type { Language } from "../support";
import { passageHolding } from "./passages";

export interface FileTheme {
  slug: string;
  en: string;
  ur: string;
  category: string;
  description: string;
}

export interface ThemesFile {
  categories: { slug: string; en: string; ur: string }[];
  themes: FileTheme[];
  ayahs: Record<string, string[]>;
}

/** The Themes file as last committed before Themes moved into Neon. */
export const readThemes = (): ThemesFile => committedJson<ThemesFile>("data/themes.json");

export function themeNamed(en: string): FileTheme {
  const t = readThemes().themes.find((x) => x.en === en);
  expect(t, `the Themes file has a Theme named "${en}"`).toBeDefined();
  return t!;
}

export const nameIn = (en: string, lang: Language) => (lang === "en" ? en : themeNamed(en).ur);

export function categoryOf(t: FileTheme, lang: Language): string {
  const c = readThemes().categories.find((x) => x.slug === t.category);
  expect(c, `the Theme category "${t.category}"`).toBeDefined();
  return c![lang];
}

/** The Ayahs (`s:a`) that have Theme `slug`, in Quran order. */
export function ayahsOf(slug: string): string[] {
  const key = (a: string) => a.split(":").map(Number);
  return Object.entries(readThemes().ayahs)
    .filter(([, slugs]) => slugs.includes(slug))
    .map(([a]) => a)
    .sort((x, y) => key(x)[0] - key(y)[0] || key(x)[1] - key(y)[1]);
}

/** A Theme page's Passage group: a Passage's full range, and the Theme's Ayahs in it. */
export interface Group {
  surah: number;
  from: number;
  till: number;
  ayahs: number[];
}

/** Theme `slug`'s Passage groups: its Ayahs in Quran order, consecutive ones of the same Passage together. */
export function groupsOf(slug: string): Group[] {
  const groups: Group[] = [];
  for (const ayah of ayahsOf(slug)) {
    const p = passageHolding(ayah);
    const last = groups.at(-1);
    const a = Number(ayah.split(":")[1]);
    if (last && last.surah === p.surah_no && last.from === p.ayah_from) last.ayahs.push(a);
    else groups.push({ surah: p.surah_no, from: p.ayah_from, till: p.ayah_till, ayahs: [a] });
  }
  return groups;
}

/** An Ayah's Theme chips on a reading page: the links to Theme pages in its section. */
export const chips = (section: Locator) => section.locator('a[href*="/themes/"]');

/** Every link to a Theme page on the page. */
export const themeLinks = (page: Page) => page.locator('a[href*="/themes/"]');
