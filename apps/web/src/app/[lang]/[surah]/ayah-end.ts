// An Ayah's end, the way a printed mushaf ends an Ayah: the end-of-Ayah sign
// U+06DD, its number and any pause, Ruku or sajdah marks the Script's source
// sets on it. QPC Hafs's Uthmani end is only the Ayah's number (its font draws
// the sign), so the plain sign and number is always right for Uthmani in
// text. Digital Khatt's Indo-Pak end is used verbatim.

import type { PartAyah, Script } from "@/dataset/reader";

/** Ayah `number` in Arabic-Indic digits (Ayah 2: ٢). */
const arabicDigits = (number: number) => number.toLocaleString("ar-EG", { useGrouping: false });

/** The end-of-Ayah sign with Ayah `number` in Arabic-Indic digits (Ayah 2: U+06DD then ٢). */
const plainEnd = (number: number) => "۝" + arabicDigits(number);

/**
 * Ayah `number`'s end as it is handed over in text (Copy text on the Share
 * page, #56): Digital Khatt's Indo-Pak end verbatim, or for Uthmani the
 * end-of-Ayah sign and the Ayah's number.
 */
export const sharedAyahEnd = (ayah: Pick<PartAyah, "number" | "indopakEnd">, script: Script) =>
  script === "indopak" ? ayah.indopakEnd : plainEnd(ayah.number);

/**
 * Ayah `number`'s end as a page draws it in `script` (the Share page, #55):
 * QPC Hafs's font draws the Uthmani Ayah number alone as the end-of-Ayah
 * sign, so Uthmani writes only the number; Indo-Pak writes Digital Khatt's end verbatim.
 */
export const drawnAyahEnd = (ayah: Pick<PartAyah, "number" | "indopakEnd">, script: Script) =>
  script === "indopak" ? ayah.indopakEnd : arabicDigits(ayah.number);
