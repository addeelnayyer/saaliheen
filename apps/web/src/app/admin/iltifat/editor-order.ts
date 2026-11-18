// The Iltifat editor's list (#142): every Iltifat by Iltifat direction, in
// the overview's order, then in Quran order, and how an Iltifat is named in
// it, by its Surah and run ("Al-Fatihah 1:2–5").

import { written } from "@saaliheen/passages";
import type { SurahName } from "@/dataset/reader";
import { ILTIFAT_DIRECTIONS, type Iltifat, type IltifatDirection } from "@/iltifat/iltifat";

/** One Iltifat direction's Iltifat, in Quran order. */
export interface DirectionGroup {
  direction: IltifatDirection;
  iltifat: Iltifat[];
}

/** `every` (in Quran order) grouped by Iltifat direction, in the overview's order. */
export const byDirection = (every: Iltifat[]): DirectionGroup[] =>
  ILTIFAT_DIRECTIONS.map((direction) => ({ direction, iltifat: every.filter((i) => i.direction === direction) }));

/** `every` in the list's order: each direction's Iltifat in turn. */
export const listOrder = (every: Iltifat[]): Iltifat[] => byDirection(every).flatMap((group) => group.iltifat);

/** The Iltifat before and after Iltifat `id` in `list`, where there is one. */
export function neighbours(list: Iltifat[], id: number): { previous?: Iltifat; next?: Iltifat } {
  const at = list.findIndex((i) => i.id === id);
  return { previous: list[at - 1], next: at < 0 ? undefined : list[at + 1] };
}

/** An Iltifat's run, "1:2–5", or "17:1" for a run of one Ayah. */
const runOf = ({ surah, ayahFrom, ayahTo }: Pick<Iltifat, "surah" | "ayahFrom" | "ayahTo">) =>
  `${surah}:${written({ from: ayahFrom, till: ayahTo })}`;

/** An Iltifat as the list names it: its Surah's name in `surahs` (every Surah's) and its run. */
export const iltifatName = (iltifat: Iltifat, surahs: SurahName[]) => `${surahs[iltifat.surah - 1].nameLatin} ${runOf(iltifat)}`;

/** The address of Iltifat `id`'s editor. */
export const editorPath = (id: number) => `/admin/iltifat/${id}`;
