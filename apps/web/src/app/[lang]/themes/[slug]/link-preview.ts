// A Theme page's Link preview (#132): what a link pasted into WhatsApp, X or
// another app shows for its Theme. The preview tags (title, description) name
// the Theme in the page's Language; the picture (link-preview-picture.tsx),
// and its alt text, are always in English, as a Share page's are (#57):
// next/og cannot draw the site's Urdu typeface, Dubai. Neither holds Quranic
// Arabic (ADR 0007).

import type { ThemeSummary as Theme } from "@/themes/themes";
import type { Headpiece } from "../../link-preview-frame";
import { STRINGS } from "../../strings";

/** What the picture's cartouche writes: the Theme's number of Ayahs, then its English name. */
export const pictureHead = (theme: Theme): Headpiece => ({ label: STRINGS.ayahCount(theme.ayahCount), title: theme.en });

/** The picture's alt text: what it shows, in the order it shows it. */
export const pictureAlt = (theme: Theme) => `${theme.en} · ${STRINGS.ayahCount(theme.ayahCount)}, on an illuminated page from ${STRINGS.brand}`;

/** The Link preview's description: the Theme's number of Ayahs. */
export const previewDescription = (theme: Theme) => `${STRINGS.ayahCount(theme.ayahCount)} of the Quran with this Theme, on ${STRINGS.brand}`;
