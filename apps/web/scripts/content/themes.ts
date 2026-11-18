// The Theme tables and their one load (#170, ADR 0012, ADR 0015, ADR 0037).
// The load carries its own input, 0008-load-themes-file.json beside it: the
// Themes file as last committed (5127e94), never edited (ADR 0041). It is read
// here, and only here, once per database, inside the content migration's transaction. The load
// makes the checks the dataset build made: every Ayah of the Quran has at
// least one Theme, and every Theme it names is one the input holds; a refusal
// names the Ayah (and the Theme) and, rolled back with its transaction, writes
// nothing and is not recorded as run.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import type { SurahSummary } from "@saaliheen/dataset/types";
import { readSurahSummaries } from "../../src/quran/quran.ts";
import { auditTable } from "./content-audit.ts";

const LOAD_INPUT = fileURLToPath(new URL("./0008-load-themes-file.json", import.meta.url));

/** The Themes file's shape: its Theme categories, its Themes, and each Ayah's Theme slugs in tagged order, keyed `s:a`. */
export interface ThemesInput {
  categories: { slug: string; en: string; ur: string }[];
  themes: { slug: string; en: string; ur: string; category: string; description: string }[];
  ayahs: Record<string, string[]>;
}

/**
 * Create `theme_category`, `theme` and `ayah_theme` (ADR 0037), each audited in
 * `content_audit` (ADR 0038). Slugs sort by their bytes (`collate "C"`), the
 * same on every Postgres whatever its locale. A Theme category's and a Theme's
 * `position` is its place in the Themes list, from 1 (ADR 0039).
 */
export async function createThemeTables(client: PoolClient): Promise<void> {
  await client.query(`
    create table theme_category (
      slug text collate "C" primary key,
      name_en text not null,
      name_ur text not null,
      position smallint unique check (position >= 1)
    )`);
  await client.query(`
    create table theme (
      slug text collate "C" primary key,
      category text collate "C" not null references theme_category (slug),
      name_en text not null,
      name_ur text not null,
      description text not null,
      position smallint unique check (position >= 1)
    )`);
  await client.query(`
    create table ayah_theme (
      surah smallint not null check (surah between 1 and 114),
      ayah smallint not null check (ayah >= 1),
      position smallint not null check (position >= 1),
      theme text collate "C" not null references theme (slug),
      primary key (surah, ayah, position),
      unique (surah, ayah, theme)
    )`);
  await client.query(`create index ayah_theme_by_theme on ayah_theme (theme, surah, ayah)`);
  for (const table of ["theme_category", "theme", "ayah_theme"]) await auditTable(client, table);
}

/** Every Ayah of `surahs`, the Quran's, `s:a`, in Quran order. */
const quranAyahs = (surahs: SurahSummary[]): string[] =>
  surahs.flatMap(({ number, ayahCount }) => Array.from({ length: ayahCount }, (_, i) => `${number}:${i + 1}`));

/** Throws, naming the Ayah (and the Theme), when `ayah` has no Theme or names one `known` does not hold. */
function checkAyah(input: ThemesInput, known: Set<string>, ayah: string) {
  const slugs = input.ayahs[ayah];
  if (!slugs) throw new Error(`Theme load: Ayah ${ayah} is missing from the Themes file; every Ayah has at least one Theme`);
  if (slugs.length === 0) throw new Error(`Theme load: Ayah ${ayah} has no Theme; every Ayah has at least one`);
  const unknown = slugs.find((slug) => !known.has(slug));
  if (unknown !== undefined) throw new Error(`Theme load: Ayah ${ayah} names the unknown Theme ${unknown}`);
}

/** Throws, naming it, at the first Ayah `input` leaves without a Theme, gives an unknown one, or that the Quran does not have. */
function checkThemes(input: ThemesInput, surahs: SurahSummary[]) {
  const known = new Set(input.themes.map((t) => t.slug));
  const ayahs = quranAyahs(surahs);
  for (const ayah of ayahs) checkAyah(input, known, ayah);
  const all = new Set(ayahs);
  const extra = Object.keys(input.ayahs).find((ayah) => !all.has(ayah));
  if (extra !== undefined) throw new Error(`Theme load: the Themes file names the Ayah ${extra}, which the Quran text does not have`);
}

/** Each Ayah's Themes as `ayah_theme` rows, by position from 1. */
const ayahThemeRows = (ayahs: ThemesInput["ayahs"]) =>
  Object.entries(ayahs).flatMap(([key, slugs]) => {
    const [surah, ayah] = key.split(":").map(Number);
    return slugs.map((theme, i) => ({ surah, ayah, position: i + 1, theme }));
  });

/** Write `rows` into `table`, one statement, its columns typed as `columns` gives them. */
export async function insertAll(client: PoolClient, table: string, columns: string, rows: object[]) {
  const names = columns.split(",").map((c) => c.trim().split(" ")[0]).join(", ");
  await client.query(`insert into ${table} (${names}) select ${names} from jsonb_to_recordset($1::jsonb) as r(${columns})`, [
    JSON.stringify(rows),
  ]);
}

/**
 * Load every Theme category, Theme and Ayah's Themes from `input` (by default
 * the Themes file), each Theme category and Theme at its place in the file. Throws, naming the Ayah and the Theme, when an Ayah has no
 * Theme or names one `input` does not hold. The Quran is `client`'s, as the
 * import loads it before the content migrations run (ADR 0049).
 */
export async function loadThemes(client: PoolClient, input: ThemesInput = readThemesFile()): Promise<void> {
  checkThemes(input, await readSurahSummaries(client));
  await insertAll(
    client,
    "theme_category",
    "slug text, name_en text, name_ur text, position smallint",
    input.categories.map(({ slug, en, ur }, i) => ({ slug, name_en: en, name_ur: ur, position: i + 1 })),
  );
  await insertAll(
    client,
    "theme",
    "slug text, category text, name_en text, name_ur text, description text, position smallint",
    input.themes.map(({ slug, category, en, ur, description }, i) => ({ slug, category, name_en: en, name_ur: ur, description, position: i + 1 })),
  );
  await insertAll(client, "ayah_theme", "surah smallint, ayah smallint, position smallint, theme text", ayahThemeRows(input.ayahs));
}

/** The load's input, the Themes file as last committed. */
function readThemesFile(): ThemesInput {
  return JSON.parse(fs.readFileSync(LOAD_INPUT, "utf8")) as ThemesInput;
}
