// Tafsir entries as the #235 scenarios give them, for both the dataset
// scenarios and the site's: a Surah's entries in one Language "one per Ayah,
// but" the groups named (`85–86`, `82–83 and 91–92`), each one entry.

import { LANGUAGE_NAME, LANGUAGES, type Language, type TafsirEntryRange } from "@saaliheen/passages";

/** Each Language by the name a scenario gives it: `English` → `en`. */
export const LANGUAGE_NAMED = Object.fromEntries(LANGUAGES.map((lang) => [LANGUAGE_NAME[lang], lang])) as Record<string, Language>;

/** The entries of a Surah of `ayahCount` Ayahs, one per Ayah but those `grouped` names, each one entry. */
export function tafsirEntries(ayahCount: number, grouped: string | undefined): TafsirEntryRange[] {
  const groups = (grouped ? grouped.split(" and ") : []).map((g) => {
    const [from, till = from] = g.trim().split("–").map(Number);
    return { from, till };
  });
  const entries: TafsirEntryRange[] = [];
  for (let ayah = 1; ayah <= ayahCount; ayah++) {
    if (groups.some((g) => g.from < ayah && ayah <= g.till)) continue;
    entries.push({ firstAyah: ayah, lastAyah: groups.find((g) => g.from === ayah)?.till ?? ayah });
  }
  return entries;
}
