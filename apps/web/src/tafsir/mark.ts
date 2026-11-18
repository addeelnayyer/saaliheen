// A Surah's Tafsir on its Ayahs (#234): the Surah page and the Surah parts put
// each Passage's Tafsir, in the Language, on the Passage's last Ayah, so the
// server render and the Surah opened in parts draw it in the same place,
// after that Ayah, however the Passage's Ayahs arrive. Read as Iltifat chips
// are (src/iltifat/mark.ts): through the cached Tafsir module (./cached.ts),
// under the Surah's tag, so a Tafsir load reaches the pages with no deploy;
// when Neon cannot give it, the Surah is drawn without it.
//
// An entry is shown with the Passage holding its last Ayah, so it always
// follows every Ayah it explains, even where a Passage not yet redrawn around
// the Tafsir splits it (#209).

import type { Language, PartAyah, TafsirEntryText } from "@saaliheen/dataset/types";
import { cachedTafsir, TafsirUnread } from "./cached.ts";
import { TAFSIR_CREDITS } from "./tafsir.ts";

/** A Passage's first and last Ayah, by number. */
interface PassageBounds {
  from: number;
  till: number;
}

/**
 * `ayahs` with, on the last Ayah of each of `passages` that has Tafsir
 * entries among `entries`, those entries in order and `credit`. An entry is
 * the Passage's whose Ayahs hold its last Ayah.
 */
export function markTafsir(ayahs: PartAyah[], passages: PassageBounds[], entries: TafsirEntryText[], credit: string): PartAyah[] {
  const byLastAyah = new Map<number, TafsirEntryText[]>();
  for (const { from, till } of passages) {
    const own = entries.filter((e) => from <= e.lastAyah && e.lastAyah <= till);
    if (own.length > 0) byLastAyah.set(till, own);
  }
  if (byLastAyah.size === 0) return ayahs;
  return ayahs.map((ayah) => {
    const own = byLastAyah.get(ayah.number);
    return own ? { ...ayah, tafsir: { entries: own, credit } } : ayah;
  });
}

let warned = false;
/** Log `message` once per server process: an unreachable database fails every Surah's read alike. */
function warnOnce(message: string) {
  if (!warned) console.error(message);
  warned = true;
}

/** Surah `surah`'s Tafsir entries in `lang` as the module gives them now; none when Neon cannot give them. */
async function readOrNone(surah: number, lang: Language): Promise<TafsirEntryText[]> {
  try {
    return await cachedTafsir(surah, lang);
  } catch (error) {
    if (!(error instanceof TafsirUnread)) throw error;
    warnOnce(`Tafsir unread, Surahs drawn without it: ${error.message}`);
    return [];
  }
}

/** Surah `surah`'s `ayahs` in `lang`, each of its `passages`' Tafsir on the Passage's last Ayah, as the Tafsir module gives it now. */
export async function withTafsir(surah: number, lang: Language, ayahs: PartAyah[], passages: PassageBounds[]): Promise<PartAyah[]> {
  return markTafsir(ayahs, passages, await readOrNone(surah, lang), TAFSIR_CREDITS[lang]);
}
