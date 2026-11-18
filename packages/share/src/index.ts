// The Share rules (#55, #56), a shared package since #76: which Shared Ayahs
// may be shared, a Share page's address and link, and the text Share hands
// over, as pure functions, so the website's Share page and edit strip and the
// mobile app's Share page hold to one copy of them.
//
// Shared Ayahs are allowed when they exist, from ≤ to, within one Surah, at
// most 10 Ayahs, except that a run exactly matching a Passage is always
// allowed. A Share page's address is
// /<lang>/share/<surah>/<from>[-<to>]/<script>[/<layout>]: the Language, the
// Surah, the from and to Ayahs (a single Ayah is just <from>), the sharer's
// Script and, for a run, the Share layout (none means Ayah by Ayah). It carries
// nothing per-viewer and records Ayah numbers, never a Passage. Its link is the
// same path on the production site, wherever the page making it is served.

import { LANGUAGES, SCRIPTS, type Language, type Script } from "@saaliheen/dataset/types";

/** Where Saaliheen is published: every Share page link points here. */
export const SITE_URL = "https://saaliheen.com";

export type ShareLayout = "ayah-by-ayah" | "flowing";

/** Every Share layout, in the order they are offered. */
export const SHARE_LAYOUTS: readonly ShareLayout[] = ["ayah-by-ayah", "flowing"];

/** `from`, `from` + 1, …, `to`. */
export const ayahNumbers = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => from + k);

/** Ayahs `from`..`to` as an address writes them: `from` for a single Ayah, else `from-to`. */
export const ayahsSegment = (from: number, to: number) => (from === to ? `${from}` : `${from}-${to}`);

/** The most Ayahs a run may hold, unless it is exactly a Passage. */
export const MAX_SHARED_AYAHS = 10;

/** A Passage's first and last Ayah. */
export interface PassageRun {
  from: number;
  till: number;
}

/** What the allowed Shared Ayahs of a Surah depend on: how many Ayahs it has and its Passages. */
export interface SurahShape {
  ayahCount: number;
  passages: PassageRun[];
}

/** The Passage that is exactly Ayahs `from`..`to`, if any. */
export const passageOf = <P extends PassageRun>(passages: P[], from: number, to: number) => passages.find((p) => p.from === from && p.till === to);

/** Whether Ayahs `from`..`to` of a Surah shaped `surah` may be shared. */
export function isAllowed(surah: SurahShape, from: number, to: number): boolean {
  if (from < 1 || to < from || to > surah.ayahCount) return false;
  return to - from + 1 <= MAX_SHARED_AYAHS || passageOf(surah.passages, from, to) !== undefined;
}

/** The to Ayahs allowed from Ayah `from`: up to 10 Ayahs within the Surah, then the end of any longer Passage beginning there. */
export function allowedTo(surah: SurahShape, from: number): number[] {
  const last = Math.min(surah.ayahCount, from + MAX_SHARED_AYAHS - 1);
  const run = ayahNumbers(from, last);
  const passages = surah.passages.filter((p) => p.from === from && p.till > last).map((p) => p.till);
  return [...run, ...passages];
}

/** The to Ayah once the from Ayah moves to `from`: kept when still allowed, else moved as little as the limits need. */
export function toAfterFrom(surah: SurahShape, from: number, to: number): number {
  if (isAllowed(surah, from, to)) return to;
  return Math.min(Math.max(from, to), from + MAX_SHARED_AYAHS - 1, surah.ayahCount);
}

/** Where a Share page's address points. */
export interface ShareTarget {
  lang: Language;
  surah: number;
  from: number;
  to: number;
  script: Script;
  /** Ignored for a single Ayah; Ayah by Ayah is named by no layout. */
  layout?: ShareLayout | null;
}

/** A Share page's path. */
export function sharePath({ lang, surah, from, to, script, layout }: ShareTarget): string {
  const named = from !== to && layout === "flowing" ? "/flowing" : "";
  return `/${lang}/share/${surah}/${ayahsSegment(from, to)}/${script}${named}`;
}

/** A Share page's link: its path on the production site. */
export const shareLink = (target: ShareTarget) => SITE_URL + sharePath(target);

/** The start of every Share page's path, one per Language: what the app claims of the site's links (ADR 0048). */
export const SHARE_PATH_PREFIXES: readonly string[] = LANGUAGES.map((lang) => `/${lang}/share/`);

/** An address's parts, as the website's route hands them over. */
export interface ShareAddress {
  lang: string;
  surah: string;
  ayahs: string;
  script: string;
  layout?: string;
}

/** What an address names, read but not yet held to its Surah: the Share layout is null for a single Ayah, which has none. */
export interface NamedShare extends ShareTarget {
  layout: ShareLayout | null;
}

/** `value` if it is one of `known`, else undefined. */
const oneOf = <T extends string>(known: readonly T[], value: string | undefined) => known.find((k) => k === value);

/** A positive whole number written plainly (no sign, no leading zero), else NaN. */
const plainNumber = (s: string) => (/^[1-9]\d*$/.test(s) ? Number(s) : NaN);

/** `<from>` or `<from>-<to>` with from < to; a single Ayah is never written `n-n`. */
function parseAyahs(s: string): { from: number; to: number } | undefined {
  const [first, second, ...rest] = s.split("-");
  const from = plainNumber(first);
  const to = second === undefined ? from : plainNumber(second);
  if (rest.length > 0 || !(from <= to) || (second !== undefined && from === to)) return undefined;
  return { from, to };
}

/** The layout an address names: Ayah by Ayah when a run names none; undefined when it names an unknown one or a single Ayah names any. */
function layoutOf(single: boolean, layout: string | undefined): ShareLayout | null | undefined {
  if (single) return layout === undefined ? null : undefined;
  return layout === undefined ? "ayah-by-ayah" : oneOf(SHARE_LAYOUTS, layout);
}

/**
 * What an address names, or undefined when any part of it is unknown: a
 * Language, a Script, a Surah number, Ayahs and a Share layout as an address
 * writes them. Whether the Surah has those Ayahs, and whether they may be
 * shared, is for its Surah to say (isAllowed).
 */
export function namedShare(address: ShareAddress): NamedShare | undefined {
  const lang = oneOf(LANGUAGES, address.lang);
  const script = oneOf(SCRIPTS, address.script);
  const ayahs = parseAyahs(address.ayahs);
  const surah = plainNumber(address.surah);
  if (!lang || !script || !ayahs || Number.isNaN(surah)) return undefined;
  const layout = layoutOf(ayahs.from === ayahs.to, address.layout);
  return layout === undefined ? undefined : { lang, script, surah, ...ayahs, layout };
}

/** What a Share page's path names (namedShare), or undefined when it is not a Share page's path. */
export function namedShareOfPath(path: string): NamedShare | undefined {
  const [empty, lang, share, surah, ayahs, script, layout, ...rest] = path.split("/");
  if (empty !== "" || share !== "share" || script === undefined || rest.length > 0) return undefined;
  return namedShare({ lang, surah, ayahs, script, layout });
}

/** The Shared Ayahs as the headpiece writes them: `18:83–88`, or `2:255` for one Ayah. */
export const ayahsLabel = (surah: number, from: number, to: number) => (from === to ? `${surah}:${from}` : `${surah}:${from}–${to}`);

/** The reference: the Surah's English name, then the Ayahs as the headpiece writes them (`Al-Kahf 18:83–88`). */
export const reference = (surahName: string, ayahs: string) => `${surahName} ${ayahs}`;

/** The parts of a handed-over text, blank lines between. */
export const paragraphs = (parts: string[]) => parts.join("\n\n");

/** What Share hands over: the reference and the link, a blank line between, so the Link preview does the talking. */
export const shareText = (ref: string, link: string) => paragraphs([ref, link]);
