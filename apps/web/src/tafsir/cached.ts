// A Surah's Tafsir as the site reads it (#233, ADR 0053, ADR 0054), following
// the Allah references' pattern (ADR 0028): read from Neon and kept in Next's
// data cache under the Surah's own tag (tafsirTag), which a Tafsir load
// refreshes through POST /api/v1/tafsir/reloads, so a reload reaches readers
// with no deploy. Each deployment keeps its own entries (DEPLOYMENT). A read
// that fails is never cached: TafsirUnread when the database is not
// configured, cannot be reached or does not answer in time, never "none".

import { unstable_cache } from "next/cache";
import type { Language } from "@saaliheen/passages";
import { database } from "../database.ts";
import { DEPLOYMENT } from "../themes/cached.ts";
import { readTafsir, type SurahTafsirEntry } from "./tafsir.ts";

/** The cache tag of Surah `surah`'s Tafsir, in both Languages, which a Tafsir load refreshes. */
export const tafsirTag = (surah: number) => `tafsir:${surah}`;

/** How long a read may take before the database counts as unreachable. */
const READ_TIMEOUT_MS = 5_000;

/** Why the Tafsir could not be read. */
export class TafsirUnread extends Error {}

/** Surah `surah`'s Tafsir entries in `language`, cached under its tag; TafsirUnread when Neon cannot give them. */
export async function cachedTafsir(surah: number, language: Language): Promise<SurahTafsirEntry[]> {
  if (!process.env.DATABASE_URL) throw new TafsirUnread("the database is not configured");
  const read = unstable_cache(() => readTafsir(database(), surah, language), ["tafsir", language, String(surah), DEPLOYMENT], {
    tags: [tafsirTag(surah)],
  });
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([read(), timeout]);
  } catch (error) {
    throw new TafsirUnread((error as Error).message);
  } finally {
    clearTimeout(timer);
  }
}
