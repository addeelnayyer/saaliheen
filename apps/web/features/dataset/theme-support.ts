// Shared by the Theme page features (#129, #131), since Themes moved into Neon
// (#170, ADR 0037, ADR 0041). The dataset build holds no Themes any more: each
// Ayah's Themes are those the content migration 0008-load-themes-file loads
// into Neon, from its own frozen input
// (scripts/content/0008-load-themes-file.json, the Themes file as last
// committed). A Theme page groups its Ayahs by the Passages, which live in
// Neon too (#171): the Passages file as last committed, which the Passage load
// carries into Neon, with `themeGroups` from
// @saaliheen/dataset/parts, as the website's Theme pages do
// (src/themes/on-pages.ts). These features read the input, not the
// database, since `pnpm test` runs them with no Postgres; the API's
// theme-load feature checks that Neon holds exactly that input.
//
// The input's shape:
//
//   {
//     "categories": [{ "slug": "hereafter", "en": "Hereafter", "ur": "…" }, …],   // the 13 Theme categories
//     "themes": [{ "slug": "day-of-judgment", "en": "Day of Judgment", "ur": "…",
//                  "category": "hereafter", "description": "…" }, …],             // the 258 Themes
//     "ayahs": { "1:1": ["mercy-of-allah", "remembrance-of-allah"], … }          // every Ayah's Themes, in tagged order
//   }

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import type { BuildResult, Theme, ThemeCategory, ThemeGroup } from "@saaliheen/dataset";
import { themeGroups, type AyahKey } from "@saaliheen/dataset/parts";
import { filePassages } from "./passage-support";

/** The Theme load's own input (ADR 0041). */
export const THEME_LOAD_INPUT = fileURLToPath(new URL("../../scripts/content/0008-load-themes-file.json", import.meta.url));

/** The Theme load's input. */
export interface ThemesInput {
  categories: ThemeCategory[];
  themes: { slug: string; en: string; ur: string; category: string; description: string }[];
  ayahs: Record<string, string[]>;
}

let input: ThemesInput | undefined;

/** The Theme load's input, failing an assertion while the migration does not carry it. */
export function readThemeLoadInput(): ThemesInput {
  expect(fs.existsSync(THEME_LOAD_INPUT), "the Theme load carries no input at scripts/content/0008-load-themes-file.json").toBe(true);
  return (input ??= JSON.parse(fs.readFileSync(THEME_LOAD_INPUT, "utf8")) as ThemesInput);
}

export type { ThemeGroup };

/** Every Theme, as its Theme page shows it, and the Theme categories. */
export interface ThemesDataset {
  themes: Theme[];
  themeCategories: ThemeCategory[];
}

/**
 * Every Theme of the load's input with its count of Ayahs and its Theme page's
 * Passage groups, grouped by the Passages as last committed (the Passage load's, #171).
 */
export function themesOf(result: BuildResult): ThemesDataset {
  const { categories, themes, ayahs } = readThemeLoadInput();
  const ayahsOf = new Map(themes.map((t) => [t.slug, [] as AyahKey[]]));
  for (const surah of result.dataset.surahs)
    for (const ayah of surah.ayahs) for (const slug of ayahs[`${surah.number}:${ayah.number}`] ?? []) ayahsOf.get(slug)?.push({ surah: surah.number, ayah: ayah.number });
  const passagesOf = (n: number) => filePassages(n);
  return {
    themeCategories: categories,
    themes: themes.map((t) => {
      const own = ayahsOf.get(t.slug)!;
      return { ...t, ayahCount: own.length, groups: themeGroups(own, passagesOf) };
    }),
  };
}

/** An Ayah's Themes' slugs in tagged order, as the load gives them. */
export function ayahThemes(_result: BuildResult, ayah: string): string[] {
  const found = readThemeLoadInput().ayahs[ayah];
  expect(found, `Ayah ${ayah} has no Themes in the load's input`).toBeInstanceOf(Array);
  return found;
}

/** The Theme with English name `en`. */
export function themeNamed(dataset: ThemesDataset, en: string): Theme {
  const theme = dataset.themes.find((t) => t.en === en);
  expect(theme, `no Theme named "${en}"`).toBeDefined();
  return theme!;
}
