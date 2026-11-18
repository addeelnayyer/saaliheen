// The Iltifat pages' Link previews (#144): what a link pasted into WhatsApp, X
// or another app shows for the Iltifat overview or an Iltifat direction page.
// The overview's names Iltifat and how many there are; a direction page's
// names its Iltifat direction and how many Iltifat turn that way. Disputed
// Iltifat are left out of both counts, as the pages leave them out. The
// interface of the Iltifat pages is English in both Languages, and so is
// every preview: no Arabic (ADR 0007). The counts come from Neon through the
// Iltifat module's cache (ADR 0016), read on request like the pages' own.

import { cachedIltifatCounts, cachedIltifatOfDirection } from "@/iltifat/cached";
import type { IltifatCount, IltifatDirection } from "@/iltifat/iltifat";
import type { Headpiece } from "../link-preview-frame";
import { STRINGS } from "../strings";
import { DIRECTION_WORDS } from "./directions";

/** One Iltifat page's Link preview: its tags' title and description, and its picture's words and alt text. */
interface IltifatPreview {
  title: string;
  description: string;
  head: Headpiece;
  body: string;
  alt: string;
}

/** The overview's total of `key` across the four Iltifat directions. */
export const total = (counts: IltifatCount[], key: "counted" | "disputed") => counts.reduce((sum, c) => sum + c[key], 0);

const OVERVIEW_BODY = "Sudden turns between the one speaking, the one spoken to and the one spoken about";

/** The picture's alt text: what it shows, in the order it shows it, as a Theme page's picture's. */
const altOf = (name: string, count: string) => `${name} · ${count}, on an illuminated page from ${STRINGS.brand}`;

/** The overview's Link preview, with the number of Iltifat that are not Disputed as Neon holds it. */
export async function readOverviewPreview(): Promise<IltifatPreview> {
  const counts = await cachedIltifatCounts();
  const count = STRINGS.iltifatCount(total(counts, "counted"));
  return {
    title: STRINGS.iltifat,
    description: `${count} in the Quran: ${OVERVIEW_BODY.toLowerCase()}, on ${STRINGS.brand}`,
    head: { label: count, title: STRINGS.iltifat },
    body: `${OVERVIEW_BODY}.`,
    alt: altOf(STRINGS.iltifat, count),
  };
}

/** `direction`'s page's Link preview, with its number of Iltifat that are not Disputed as Neon holds it. */
export async function readDirectionPreview(direction: IltifatDirection): Promise<IltifatPreview> {
  const list = await cachedIltifatOfDirection(direction);
  const { name, description } = DIRECTION_WORDS[direction];
  const count = STRINGS.iltifatCount(list.filter((iltifat) => !iltifat.disputed).length);
  return {
    title: `${name} · ${count}`,
    description: `${count} in the Quran turn this way. ${description} On ${STRINGS.brand}`,
    head: { label: count, title: name },
    body: description,
    alt: altOf(name, count),
  };
}
