// The Themes, read from Neon (#170, ADR 0037): the server-side module every
// page that shows Themes reads through, never the Themes file the content
// migration loaded them from (scripts/content/themes.ts). Three reads: the
// Themes list's index (every Theme category and Theme, with its count of
// Ayahs), one Theme with its Ayahs, and every Ayah's Themes in tagged order.
// ./cached.ts keeps each in Next's data cache under tags.

import type { Pool } from "pg";
import type { AyahKey } from "@saaliheen/dataset/parts";
import type { Theme, ThemeCategory } from "@saaliheen/dataset/types";
import { database } from "../database.ts";

/** A Theme as the Themes list, the Theme chips and the Link previews name it: no description, no Passage groups. */
export type ThemeSummary = Pick<Theme, "slug" | "en" | "ur" | "category" | "ayahCount">;

/** Every Theme category and every Theme, each in the Themes list's order. */
export interface ThemeIndex {
  categories: ThemeCategory[];
  themes: ThemeSummary[];
}

/** One Theme as its Theme page shows it: its names and count, its Theme category, and its Ayahs in Quran order. */
export interface ThemeWithAyahs {
  theme: ThemeSummary;
  category: ThemeCategory;
  ayahs: AyahKey[];
}

/**
 * Every Ayah's Themes, by Surah then Ayah from 1: `[surah - 1][ayah - 1]` is
 * that Ayah's Theme slugs in tagged order.
 */
export type AyahThemes = string[][][];

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

/** The Themes list's order: by place, the slug settling any Theme added without one. */
const LIST_ORDER = "position nulls last, slug";

const SUMMARY = `t.slug, t.name_en as en, t.name_ur as ur, t.category,
  (select count(*) from ayah_theme a where a.theme = t.slug)::int as "ayahCount"`;

/** Every Theme category and Theme, in the Themes list's order, each Theme with its count of Ayahs. */
export async function themeIndex(db: Database = database()): Promise<ThemeIndex> {
  const [categories, themes] = await Promise.all([
    db.query<ThemeCategory>(`select slug, name_en as en, name_ur as ur from theme_category order by ${LIST_ORDER}`),
    db.query<ThemeSummary>(`select ${SUMMARY} from theme t order by ${LIST_ORDER}`),
  ]);
  return { categories: categories.rows, themes: themes.rows };
}

/** Theme `slug` with its Theme category and its Ayahs in Quran order, or null when no Theme has that slug. */
export async function themeWithAyahs(slug: string, db: Database = database()): Promise<ThemeWithAyahs | null> {
  const [found, ayahs] = await Promise.all([
    db.query<ThemeSummary & { categoryEn: string; categoryUr: string }>(
      `select ${SUMMARY}, c.name_en as "categoryEn", c.name_ur as "categoryUr"
         from theme t join theme_category c on c.slug = t.category where t.slug = $1`,
      [slug],
    ),
    db.query<AyahKey>(`select surah, ayah from ayah_theme where theme = $1 order by surah, ayah`, [slug]),
  ]);
  if (found.rowCount === 0) return null;
  const { categoryEn, categoryUr, ...theme } = found.rows[0];
  return { theme, category: { slug: theme.category, en: categoryEn, ur: categoryUr }, ayahs: ayahs.rows };
}

/** Every Ayah's Themes in tagged order, by Surah and Ayah (AyahThemes). */
export async function everyAyahThemes(db: Database = database()): Promise<AyahThemes> {
  const { rows } = await db.query<AyahKey & { theme: string }>(`select surah, ayah, theme from ayah_theme order by surah, ayah, position`);
  const bySurah: AyahThemes = [];
  for (const { surah, ayah, theme } of rows) ((bySurah[surah - 1] ??= [])[ayah - 1] ??= []).push(theme);
  return bySurah;
}
