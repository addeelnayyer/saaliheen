// The text a sharer hands over from a Share page (#56), as plain functions.
//
// Share hands over the reference and the link alone (@saaliheen/share's
// shareText, which the mobile app hands over too). Copy text hands over, for
// every Shared Ayah in order, its Arabic ending as a printed mushaf ends it and
// its Ayah translation; then the translator, the reference and the link. Blank
// lines separate every part. Links always point to the production site,
// wherever the page making them is served.

import type { Language } from "@/dataset/reader";
import { paragraphs } from "@saaliheen/share";
import { TRANSLATOR } from "../strings";

/** One Ayah as handed over in text: its Arabic with its end, and its Ayah translation. */
export interface AyahInText {
  arabic: string;
  translation: string;
}

/** What Copy text hands over: each Ayah's Arabic and Ayah translation, then the translator, the reference and the link. */
export const copyText = (ayahs: AyahInText[], lang: Language, ref: string, link: string) =>
  paragraphs([...ayahs.flatMap((a) => [a.arabic, a.translation]), TRANSLATOR[lang], ref, link]);
