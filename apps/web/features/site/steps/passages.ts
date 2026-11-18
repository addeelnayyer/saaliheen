// The Passages file, read as the tests' source of every
// Passage and Passage title (#41, #43): never typed into a feature or a step.
// It is read as last committed before Passages moved into Neon (#171,
// ../committed-output.ts), so it outlives the file's deletion.

import { committedPassages, type CommittedPassage } from "../committed-output";
import type { Language } from "../support";

export type FilePassage = CommittedPassage;

export const filePassages = (): FilePassage[] => committedPassages();

/**
 * `p`'s Passage title in `lang` as a page shows it: its runs of white space as
 * one space and none at either end, as HTML renders them. A title stored with
 * spaces around it (3:98–99's English one) reads the same on the page.
 */
export const titleOf = (p: FilePassage, lang: Language) => (lang === "ur" ? p.title_ur : p.title_en).replace(/\s+/g, " ").trim();

/** The Passages of Surah `surah`, in order. */
export function passagesOf(surah: number): FilePassage[] {
  const ps = filePassages().filter((p) => p.surah_no === surah);
  if (ps.length === 0) throw new Error(`the Passages file has no Passage in Surah ${surah}`);
  return ps;
}

/** The Passage that holds `ayah` (`s:a`). */
export function passageHolding(ayah: string): FilePassage {
  const [s, a] = ayah.split(":").map(Number);
  const p = filePassages().find((x) => x.surah_no === s && x.ayah_from <= a && a <= x.ayah_till);
  if (!p) throw new Error(`no Passage in the Passages file holds ${ayah}`);
  return p;
}
