// Where the Supplication editor (#201, #202) is, and how it names a Supplication.

import { written } from "@saaliheen/passages";
import type { SurahName } from "@/dataset/reader";
import type { Supplication } from "@/supplications/supplications";

/** The Supplication editor's list. */
export const SUPPLICATIONS_EDITOR = "/admin/supplications";

/** Where a Supplication is added. */
export const NEW_SUPPLICATION = `${SUPPLICATIONS_EDITOR}/new`;

/** The Speakers, each edited in place. */
export const SPEAKERS_EDITOR = `${SUPPLICATIONS_EDITOR}/speakers`;

/** The editor of Supplication `id`. */
export const editorPath = (id: number) => `${SUPPLICATIONS_EDITOR}/${id}`;

/** A Supplication's name in the editor: its Surah's Latin name and its run, as the Supplications page heads it in English. */
export const supplicationName = ({ surah, ayahFrom, ayahTo }: Pick<Supplication, "surah" | "ayahFrom" | "ayahTo">, surahs: SurahName[]) =>
  `${surahs[surah - 1].nameLatin} ${surah}:${written({ from: ayahFrom, till: ayahTo })}`;
