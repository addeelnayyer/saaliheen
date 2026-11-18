// A Share page's Link preview (#57): what a link pasted into WhatsApp, X or
// another app shows for its Shared Ayahs. The text here is the preview tags'
// (title, description) and the picture's (link-preview-picture.tsx), whose
// alt text says what the picture shows.
//
// The picture is always in English and never holds Quranic Arabic (ADR 0007):
// the Surah's English name, the Ayah range, the Passage title in English when
// the Shared Ayahs are exactly one Passage (and Passage headings are released),
// and, on an English Share page, the start of the Ayah translation. next/og
// cannot draw the site's Urdu typeface, Dubai (it throws "lookupType: 7 -
// substFormat: 1 is not yet supported"), so an Urdu Share page's picture
// leaves out its Urdu Ayah translation.

import { STRINGS } from "../strings";
import { passageOf, reference } from "@saaliheen/share";
import { ayahsLabel, type SharedAyahs } from "./shared-ayahs";

/** What a Share page's Link preview picture shows, every part in English. */
export interface PictureText {
  /** The Surah's English name, as the headpiece's cartouche writes it. */
  surahName: string;
  /** The Shared Ayahs as the headpiece writes them: `18:83–88`. */
  ayahs: string;
  passageTitle?: string;
  /** The start of the first Shared Ayah's English Ayah translation; none on an Urdu Share page. */
  translation?: string;
}

/** The longest start of an Ayah translation the picture shows. */
const START_LENGTH = 200;

/** The longest start of an Ayah translation the Link preview's description shows. */
const DESCRIPTION_LENGTH = 160;

/** `text` cut at the last word ending within `max` characters, with an ellipsis when cut. */
function startOf(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  return `${(end > 0 ? cut.slice(0, end) : text.slice(0, max)).replace(/[\s,;:.—–-]+$/, "")}…`;
}

/** The English Passage title of the Shared Ayahs, when they are exactly one Passage and the Share page shows Passage titles. */
const englishPassageTitle = ({ surah, from, to, passageTitle }: SharedAyahs) =>
  passageTitle === undefined ? undefined : passageOf(surah.passages, from, to)?.en || undefined;

export function pictureText(shared: SharedAyahs): PictureText {
  return {
    surahName: shared.surah.nameLatin,
    ayahs: ayahsLabel(shared),
    passageTitle: englishPassageTitle(shared),
    translation: shared.lang === "en" ? startOf(shared.ayahs[0].translation, START_LENGTH) : undefined,
  };
}

/** The picture's alt text: what it shows, in the order it shows it. */
export function pictureAlt({ surahName, ayahs, passageTitle, translation }: PictureText): string {
  const parts = [`Surah ${reference(surahName, ayahs)}`, passageTitle, translation && `“${translation}”`].filter(Boolean);
  return `${parts.join(" · ")}, on an illuminated page from ${STRINGS.brand}`;
}

/** The Link preview's title: the Surah's English name and the Ayah range, then any Passage title. */
export function previewTitle(shared: SharedAyahs): string {
  const ref = reference(shared.surah.nameLatin, ayahsLabel(shared));
  return shared.passageTitle ? `${ref} · ${shared.passageTitle}` : ref;
}

/** The Link preview's description: the start of the first Shared Ayah's Ayah translation, in the Share page's Language. */
export const previewDescription = (shared: SharedAyahs) => startOf(shared.ayahs[0].translation, DESCRIPTION_LENGTH);
