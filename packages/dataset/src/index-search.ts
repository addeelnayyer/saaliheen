// The Surah index's search rules and Juz rows (#193), shared by the website
// and the mobile app. A number (Latin, Urdu or Arabic-Indic digits) matches
// only the Surah and the Juz with that number; Arabic-script text matches part
// of a Surah's Arabic name, other text part of its Latin one, whatever the
// Language; a Juz matches when a Surah it holds part of does. Latin names and
// queries are folded to lower case without accents, apostrophes, hyphens or
// spaces ("yasin" finds Ya-Sin); Arabic ones without harakat, tatweel or
// spaces, each look-alike alef, yeh, kaf and heh written as one letter, so a
// name typed with an Urdu keyboard finds QUL's Arabic spelling (the approved
// mockup's `normAr`). A blank query finds everything; one that folds to
// nothing finds nothing. This module imports nothing from Node, React or
// React Native, so both apps run it as it is.

import type { Juz } from "./types.ts";

/** What the search reads of a Surah. */
export interface NamedSurah {
  number: number;
  nameArabic: string;
  nameLatin: string;
}

/** Urdu and Arabic-Indic digits written as Latin ones. */
const latinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** An Arabic name folded for matching: without harakat, tatweel or spaces, each look-alike alef, yeh, kaf and heh as one letter. */
const foldArabic = (s: string) =>
  s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[يىیئ]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/[هہۃةھ]/g, "ہ")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, "");

/** A Latin name folded for matching: lower case, without accents, apostrophes, hyphens or spaces ("Ya-Sin" is "yasin"); the Roots list folds transliterations so too (#290). */
export const foldLatin = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ'’ʿʾ-]/g, "")
    .replace(/\s+/g, "");

/** Each Surah's names, folded once so many queries can reuse them. */
export const foldNames = (surahs: NamedSurah[]) => surahs.map((s) => ({ arabic: foldArabic(s.nameArabic), latin: foldLatin(s.nameLatin) }));
export type FoldedNames = ReturnType<typeof foldNames>;

/** A query as the index reads it: nothing, a number, or a folded name in Arabic or Latin letters. */
type Query = { kind: "all" } | { kind: "number"; n: number } | { kind: "name"; arabic: boolean; folded: string };

function readQuery(query: string): Query {
  const q = latinDigits(query.trim());
  if (!q) return { kind: "all" };
  if (/^\d+$/.test(q)) return { kind: "number", n: Number(q) };
  const arabic = /[؀-ۿ]/.test(q);
  return { kind: "name", arabic, folded: (arabic ? foldArabic : foldLatin)(q) };
}

/** The numbers of the Surahs whose name holds the folded name `q`. */
const surahsNamed = (q: Extract<Query, { kind: "name" }>, surahs: NamedSurah[], names: FoldedNames) =>
  new Set(q.folded === "" ? [] : surahs.filter((_, i) => (q.arabic ? names[i].arabic : names[i].latin).includes(q.folded)).map((s) => s.number));

/** The Surahs `query` finds, in order. `names` is `foldNames(surahs)`. */
export function findSurahs<S extends NamedSurah>(query: string, surahs: S[], names: FoldedNames = foldNames(surahs)): S[] {
  const q = readQuery(query);
  if (q.kind === "all") return surahs;
  if (q.kind === "number") return surahs.filter((s) => s.number === q.n);
  const named = surahsNamed(q, surahs, names);
  return surahs.filter((s) => named.has(s.number));
}

/** "36:28" as [36, 28]. */
const ayahOf = (id: string) => id.split(":").map(Number) as [number, number];

/** Whether Juz `juz` holds at least one Ayah of a Surah in `numbers`. */
function holdsAnyOf(juz: Juz, numbers: Set<number>): boolean {
  const [[from], [to]] = [ayahOf(juz.firstAyah), ayahOf(juz.lastAyah)];
  return [...numbers].some((n) => from <= n && n <= to);
}

/** The Juz `query` finds, in order: by Juz number, or by a Surah they hold part of. `names` is `foldNames(surahs)`. */
export function findJuz<J extends Juz>(query: string, juz: J[], surahs: NamedSurah[], names: FoldedNames = foldNames(surahs)): J[] {
  const q = readQuery(query);
  if (q.kind === "all") return juz;
  if (q.kind === "number") return juz.filter((j) => j.number === q.n);
  const named = surahsNamed(q, surahs, names);
  return juz.filter((j) => holdsAnyOf(j, named));
}

/** Where Juz `juz` runs: "Al-Baqarah 142 → 252" within one Surah, "Ya-Sin 28 → Az-Zumar 31" across Surahs. */
export function juzRuns(juz: Juz, nameOf: (surah: number) => string): string {
  const [[fromSurah, fromAyah], [toSurah, toAyah]] = [ayahOf(juz.firstAyah), ayahOf(juz.lastAyah)];
  const to = toSurah === fromSurah ? String(toAyah) : `${nameOf(toSurah)} ${toAyah}`;
  return `${nameOf(fromSurah)} ${fromAyah} → ${to}`;
}

/** An Ayah as one number in Quran order. */
const order = ([surah, ayah]: [number, number]) => surah * 1000 + ayah;

/** Whether Juz `juz` holds Ayah `ayah` of Surah `surah`. */
export function juzHolds(juz: Juz, surah: number, ayah: number): boolean {
  const at = order([surah, ayah]);
  return order(ayahOf(juz.firstAyah)) <= at && at <= order(ayahOf(juz.lastAyah));
}
