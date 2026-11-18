// Where a Surah's Tafsir entries start and end, as the Passage editor marks
// them (#235): on the Ayah each entry starts at, the entry in each Language
// (`English 88–89`), and in each gap between Ayahs inside an entry, the entry
// a new Passage there would split, as the Passages module decides and names
// it. Read from the Tafsir entry ranges the page was given.

import { entriesSplitAt, LANGUAGE_NAME, LANGUAGES, tafsirEntryName, written, type TafsirRanges } from "@saaliheen/passages";

/** By Ayah: the entries starting at it, and the entries a Passage starting at it would split. */
export interface TafsirMarks {
  starts: Map<number, string[]>;
  splits: Map<number, string[]>;
}

/** `tafsir`'s marks, each Language in turn. */
export function tafsirMarks(tafsir: TafsirRanges): TafsirMarks {
  const starts = new Map<number, string[]>();
  const splits = new Map<number, string[]>();
  let last = 0;
  for (const lang of LANGUAGES) {
    for (const { firstAyah, lastAyah } of tafsir[lang] ?? []) {
      const range = written({ from: firstAyah, till: lastAyah });
      starts.set(firstAyah, [...(starts.get(firstAyah) ?? []), `${LANGUAGE_NAME[lang]} ${range}`]);
      last = Math.max(last, lastAyah);
    }
  }
  for (let ayah = 2; ayah <= last; ayah++) {
    const split = entriesSplitAt(ayah, tafsir);
    if (split.length) splits.set(ayah, split.map(({ lang, entry }) => tafsirEntryName(lang, entry)));
  }
  return { starts, splits };
}
