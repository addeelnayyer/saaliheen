// Shared by the Passage features' steps (#41): the Passages file as last
// committed before Passages moved into Neon (#171, read from git at 3a52736), and Ayah ranges as the features and the commit
// message write them (`83–88`, or `88` for a single Ayah).

import { expect } from "vitest";
import type { Passage } from "@saaliheen/passages";
import { committedPassages } from "../site/committed-output";

/** One entry of the Passages file, as the file writes it. */
export interface PassageEntry {
  surah_no: number;
  ayah_from: number;
  ayah_till: number;
  title_en: string;
  title_ur: string;
}

/** The Passages file's entries as last committed before the move, in file order: a copy each call, free to change. */
export const readPassageEntries = (): PassageEntry[] => committedPassages().map((entry) => ({ ...entry }));

export const toPassage = (e: PassageEntry): Passage => ({ from: e.ayah_from, till: e.ayah_till, en: e.title_en, ur: e.title_ur });

/** Surah `surah`'s Passages as the Passages file last committed before the move lists them, in order. */
export const filePassages = (surah: number): Passage[] =>
  readPassageEntries()
    .filter((e) => e.surah_no === surah)
    .map(toPassage);

/** `83–88`, or `88` when the range is one Ayah. */
export const range = ({ from, till }: { from: number; till: number }) => (from === till ? `${from}` : `${from}–${till}`);

/** `83–88` or `88` read back into its first and last Ayah. */
export function parseRange(text: string): { from: number; till: number } {
  const m = /^(\d+)(?:–(\d+))?$/.exec(text.trim());
  expect(m, `not an Ayah range: ${text}`).not.toBeNull();
  const from = Number(m![1]);
  return { from, till: m![2] ? Number(m![2]) : from };
}

/** The Passage in `passages` whose range is written `text`. */
export function passageAt(passages: Passage[], text: string): Passage {
  const { from, till } = parseRange(text);
  const found = passages.find((p) => p.from === from && p.till === till);
  expect(found, `no Passage ${text} in ${passages.map(range).join(", ")}`).toBeDefined();
  return found!;
}
