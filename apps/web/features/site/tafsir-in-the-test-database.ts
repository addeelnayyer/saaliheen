// What the site tests' own Postgres holds of the Tafsir (#234): QUL's English
// file is committed by hand (#237) and the Urdu edition is put in by the
// owner, so neither is in the run's database until ./start-test-database.ts
// puts in the tests' own entries, through the loader a Tafsir load uses
// (src/tafsir/load.ts), before the server starts. Every scenario reads its
// expectations from `testTafsir`, never typed text.
//
// Al-Fatihah has both Languages, 1:6–7 one grouped entry and 1:2's text
// holding bold, italic and other markup; Al-Baqarah's first 30 Ayahs English
// only, 2:3–4 grouped, so the page follows the Recited Word past their Tafsir;
// Al-Kahf both Languages, one entry per Ayah, so switching Ayah layout meets
// Tafsir between its Passages, but none for the Passage 18:83–88, so the
// heading above 18:89 stays on screen below 18:88 for the Passage headings'
// scenarios; Al-Kawthar none at all.

import { Pool } from "pg";
import type { Language } from "../../src/dataset/reader";
import { loadTafsir } from "../../src/tafsir/load.ts";
import type { TafsirEntry } from "../../src/tafsir/qul";
import type { TestDatabase } from "./test-database.ts";

/** 1:2's text in each Language: bold and italic to keep, a <span> to show as text. */
export const MARKED_UP: Record<Language, string> = {
  en: 'All <b>praise and thanks</b> belong to <i>Allah alone</i>, <span class="lord">the Lord</span> of everything that exists.',
  ur: 'تمام <b>تعریف اور شکر</b> صرف <i>اللہ</i> کے لیے ہے، <span class="lord">جو رب</span> ہے ہر اس چیز کا جو موجود ہے۔',
};

/** The text of the entry for Ayahs `range` (`1:6–7`) in `lang`: long enough to fill several lines. */
function textFor(range: string, lang: Language): string {
  return lang === "en"
    ? `The test Tafsir of ${range}. It explains what these Ayahs mean, as a Tafsir entry does, at length enough to fill several lines of the page on a phone and on a desktop alike, so that it stands between this Passage and the next.`
    : `آیات ${range} کی آزمائشی تفسیر۔ یہ بتاتی ہے کہ ان آیات کا مطلب کیا ہے، جیسا کہ تفسیر کرتی ہے، اتنی طوالت سے کہ فون اور ڈیسک ٹاپ دونوں پر صفحے کی کئی سطریں بھر دے۔`;
}

/** Ayahs `first`..`last` of Surah `surah` as the pages write them: `1:6–7`, or `1:5` for one Ayah. */
export const ayahRange = (surah: number, first: number, last: number) => (first === last ? `${surah}:${first}` : `${surah}:${first}–${last}`);

/** Surah `surah`'s entries `ranges`, each [first, last], in `lang`. */
const entriesOf = (surah: number, lang: Language, ranges: [number, number][]): TafsirEntry[] =>
  ranges.map(([firstAyah, lastAyah]) => {
    const text = surah === 1 && firstAyah === 2 ? MARKED_UP[lang] : textFor(ayahRange(surah, firstAyah, lastAyah), lang);
    return { surah, firstAyah, lastAyah, text };
  });

/** One entry per Ayah from `first` to `last`, but `grouped` as one. */
function ranges(first: number, last: number, grouped?: [number, number]): [number, number][] {
  const out: [number, number][] = [];
  for (let a = first; a <= last; a++) {
    if (grouped && a === grouped[0]) {
      out.push(grouped);
      a = grouped[1];
    } else out.push([a, a]);
  }
  return out;
}

/** Every Tafsir entry the run's database holds in `lang`, in Quran order. */
export function testTafsir(lang: Language): TafsirEntry[] {
  return [
    ...entriesOf(1, lang, ranges(1, 7, [6, 7])),
    ...(lang === "en" ? entriesOf(2, lang, ranges(1, 30, [3, 4])) : []),
    ...entriesOf(18, lang, [...ranges(1, 82), ...ranges(89, 110)]),
  ];
}

/** Put the tests' Tafsir into the run's database `db`, in both Languages. */
export async function putTafsirIn(db: TestDatabase) {
  const pool = new Pool({ connectionString: db.url, max: 1 });
  try {
    for (const lang of ["en", "ur"] as const) await loadTafsir(pool, lang, testTafsir(lang));
  } finally {
    await pool.end();
  }
}
