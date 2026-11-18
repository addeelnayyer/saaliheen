// The Tafsir as a Surah's screen shows it (#236, ADR 0053): a Surah's Tafsir
// entries in one Language, as GET /api/v1/tafsir/{surah}?lang= answers them
// (#233), each Passage's after its last Ayah. A Passage's Tafsir is the
// entries whose last Ayah is in it, so an entry a Passage not yet redrawn
// splits is shown whole, after the later Passage, and never cut short. An
// entry's text is read into runs of bold, italic, both or neither: only
// <b>, <strong>, <i> and <em> are honoured, and any other markup is shown as
// text. Like the Quran Analysis module, it imports nothing from React Native
// or Expo.

import type { Language, Surah } from "@saaliheen/dataset/types";
import { ayahs, written } from "@saaliheen/passages";

/** One Tafsir entry as GET /api/v1/tafsir/{surah} answers it: its Ayahs and its text as published. */
export interface TafsirEntry {
  firstAyah: number;
  lastAyah: number;
  text: string;
}

/** A Surah's Tafsir in one Language as GET /api/v1/tafsir/{surah}?lang= answers it (#233). */
export interface TafsirAnswer {
  surah: number;
  language: Language;
  credit: string;
  entries: TafsirEntry[];
}

/** Whether `answer` is a Tafsir as the endpoint answers it, every entry with its Ayahs and text, so one that is not is never shown (#236). */
export function isTafsirAnswer(answer: unknown): answer is TafsirAnswer {
  const { credit, entries } = (answer ?? {}) as Partial<TafsirAnswer>;
  return (
    typeof credit === "string" &&
    Array.isArray(entries) &&
    entries.every((e) => Number.isInteger(e?.firstAyah) && Number.isInteger(e?.lastAyah) && typeof e?.text === "string")
  );
}

/** A stretch of a Tafsir entry's text in one style. */
export interface TafsirRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** A Tafsir entry as shown: its Ayah range ("3–4", or one number for one Ayah), that range as its label names it ("Ayahs 3–4"), and its text in runs. */
export interface TafsirEntryView {
  range: string;
  label: string;
  runs: TafsirRun[];
}

/** A Passage's Tafsir, after its last Ayah: its entries in order, then the edition's credit line. */
export interface PassageTafsir {
  kind: "tafsir";
  entries: TafsirEntryView[];
  credit: string;
}

/** The markup honoured, each tag by the style it sets. */
const STYLE_OF: Record<string, "bold" | "italic"> = { b: "bold", strong: "bold", i: "italic", em: "italic" };
const HONOURED = /<(\/?)(b|strong|i|em)>/gi;

/** `text` in runs of one style each, by its bold and italic tags; any other markup stays in the text. */
export function tafsirRuns(text: string): TafsirRun[] {
  const open = { bold: 0, italic: 0 };
  const runs: TafsirRun[] = [];
  const add = (stretch: string) => {
    if (!stretch) return;
    const [bold, italic] = [open.bold > 0, open.italic > 0];
    const last = runs.at(-1);
    if (last && last.bold === bold && last.italic === italic) last.text += stretch;
    else runs.push({ text: stretch, bold, italic });
  };
  let from = 0;
  for (const tag of text.matchAll(HONOURED)) {
    add(text.slice(from, tag.index));
    const style = STYLE_OF[tag[2].toLowerCase()];
    open[style] = Math.max(0, open[style] + (tag[1] ? -1 : 1));
    from = tag.index + tag[0].length;
  }
  add(text.slice(from));
  return runs;
}

/**
 * `answer`'s entries as `surah`'s Passages' Tafsir, by the Ayah each is shown
 * after: the last Ayah of the Passage holding the entry's last Ayah, or that
 * Ayah itself when no Passage holds it. Empty when there are no entries.
 */
export function tafsirByAyah(surah: Pick<Surah, "passages">, answer: TafsirAnswer): Map<number, PassageTafsir> {
  const shown = new Map<number, PassageTafsir>();
  for (const entry of answer.entries) {
    const after = surah.passages.find((p) => p.from <= entry.lastAyah && entry.lastAyah <= p.till)?.till ?? entry.lastAyah;
    const tafsir = shown.get(after) ?? { kind: "tafsir", entries: [], credit: answer.credit };
    const [from, till] = [entry.firstAyah, entry.lastAyah];
    tafsir.entries.push({ range: written({ from, till }), label: ayahs(from, till), runs: tafsirRuns(entry.text) });
    shown.set(after, tafsir);
  }
  return shown;
}
