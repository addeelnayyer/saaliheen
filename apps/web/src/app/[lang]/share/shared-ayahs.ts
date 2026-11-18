// A Share page's address and the Shared Ayahs it names (#55). The address is
// /<lang>/share/<surah>/<from>[-<to>]/<script>[/<layout>]: the Language, the
// Surah, the from and to Ayahs (a single Ayah is just <from>), the sharer's
// Script and, for a run, the Share layout (none means Ayah by Ayah). It
// carries nothing per-viewer and records Ayah numbers, never a Passage.
//
// Shared Ayahs are allowed when they exist, from ≤ to, within one Surah, at
// most 10 Ayahs, except that a run exactly matching a Passage is always
// allowed (@saaliheen/share, which the edit strip and the mobile app hold to too). Any other
// address is not found. The Passages it holds to are Neon's (#171,
// src/passages/), read under the Surah's Passage tag, so a Publish that makes
// a run a Passage, or no longer one, changes what may be shared with no deploy.

import { isSurahNumber, surahAyahs, type Language, type PartAyah, type Script, type Surah } from "@/dataset/reader";
import { surahWithPassages } from "@/passages/on-pages";
import { ayahsLabel as sharedLabel, isAllowed, namedShare, passageOf, type ShareAddress, type ShareLayout } from "@saaliheen/share";

/** What a Share page shows: its Surah, the Shared Ayahs in its Language, and how to set them out. */
export interface SharedAyahs {
  lang: Language;
  script: Script;
  surah: Surah;
  from: number;
  to: number;
  ayahs: PartAyah[];
  /** The Share layout the address names; null for a single Ayah, which has none. */
  layout: ShareLayout | null;
  /** The Passage these Ayahs exactly are, if any. */
  passageTitle?: string;
}

/** What an address names, its Surah's Passages from Neon, when it may be shared; Neon is read only for a Surah that exists. */
async function named(address: ShareAddress) {
  const share = namedShare(address);
  const surah = share && isSurahNumber(share.surah) && (await surahWithPassages(share.surah));
  if (!share || !surah || !isAllowed(surah, share.from, share.to)) return undefined;
  return { ...share, surah };
}

/**
 * The Shared Ayahs an address names, or undefined when it is not found.
 * Passage titles show only when `passageTitles`. Rejects when Neon cannot
 * answer for a Surah the address names.
 */
export async function sharedAyahsOf(address: ShareAddress, passageTitles: boolean): Promise<SharedAyahs | undefined> {
  const found = await named(address);
  if (!found) return undefined;
  const { surah, from, to, lang } = found;
  const passage = passageTitles ? passageOf(surah.passages, from, to) : undefined;
  return { ...found, ayahs: surahAyahs(surah, lang).slice(from - 1, to), passageTitle: passage?.[lang] };
}

/** The Shared Ayahs as the headpiece writes them: `18:83–88`, or `2:255` for one Ayah. */
export const ayahsLabel = ({ surah, from, to }: Pick<SharedAyahs, "surah" | "from" | "to">) => sharedLabel(surah.number, from, to);
