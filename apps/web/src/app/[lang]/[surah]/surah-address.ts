// A Surah's address, /<lang>/<Surah>, as the Surah page and its parts read it
// (ADR 0024): the pages take any params so a refreshed cache tag renders them
// again, so each checks its own and leaves anything else not found, without
// reading Neon.

import { notFound } from "next/navigation";
import { isLanguage, isSurahNumber, type Language } from "@/dataset/reader";

/** The Language and Surah number `lang` and `surah` name, or undefined when either names none (`/fr/1`, `/en/115`, `/en/01`). */
export function surahAddress(lang: string, surah: string): { lang: Language; surah: number } | undefined {
  const known = isLanguage(lang) && isSurahNumber(Number(surah)) && String(Number(surah)) === surah;
  return known ? { lang, surah: Number(surah) } : undefined;
}

/** The Language and Surah number a Surah page's `params` name; not found when they name none. */
export async function pageSurahAddress(params: Promise<{ lang: string; surah: string }>): Promise<{ lang: Language; surah: number }> {
  const { lang, surah } = await params;
  const address = surahAddress(lang, surah);
  if (!address) notFound();
  return address;
}
