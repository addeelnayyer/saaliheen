// The Tafsir as Neon holds it (#233, ADR 0053, ADR 0054): a Surah's Tafsir
// entries in one Language, in order, as the cached read (./cached.ts) reads
// them, and the credit line each
// Language's edition is shown with (ADR 0011); and a Surah's entry ranges in
// every Language, which the Passage rules check Passages against (#235).

import type { Pool, PoolClient } from "pg";
import type { Language, TafsirRanges } from "@saaliheen/passages";
import type { TafsirEntryText } from "@saaliheen/dataset/types";

/** One Tafsir entry of a Surah: its Ayahs and its text as published, as the pages carry it. */
export type SurahTafsirEntry = TafsirEntryText;

/** The line crediting each Language's edition of al-Mukhtasar wherever its Tafsir is shown, kept with Quran Chat's shared rules so the mobile app's answers credit it too (#81). */
export { TAFSIR_CREDITS } from "@saaliheen/quran-chat";

/** Surah `surah`'s Tafsir entries in `language` as stored now, by their first Ayah; [] when it has none. */
export async function readTafsir(db: Pool, surah: number, language: Language): Promise<SurahTafsirEntry[]> {
  const { rows } = await db.query<SurahTafsirEntry>(
    `select first_ayah as "firstAyah", last_ayah as "lastAyah", text from tafsir_entry
      where language = $1 and surah = $2 order by first_ayah`,
    [language, surah],
  );
  return rows;
}

/** Surah `surah`'s Tafsir entry ranges in each Language Neon holds entries in, by their first Ayah, read through `db` uncached. */
export async function readTafsirRanges(db: Pool | PoolClient, surah: number): Promise<TafsirRanges> {
  const { rows } = await db.query<{ language: Language; firstAyah: number; lastAyah: number }>(
    `select language, first_ayah as "firstAyah", last_ayah as "lastAyah" from tafsir_entry where surah = $1 order by language, first_ayah`,
    [surah],
  );
  const ranges: TafsirRanges = {};
  for (const { language, firstAyah, lastAyah } of rows) (ranges[language] ??= []).push({ firstAyah, lastAyah });
  return ranges;
}
