// Each Surah's Section marks (#194, ADR 0020): its Hizb quarters, read from
// QUL's Rub' al-Hizb file, and its Rukus, read from QUL's Ruku file, each
// placed above the Ayah it starts at and labelled. The signs each Script
// prints for them (QPC Hafs's ۞ on a Word, Digital Khatt's Ruku sign in an
// Ayah's end) are taken out of the text, so a mark never shows twice.

import { isObject, readJsonObject } from "./source-json.ts";
import type { SectionMark, SectionMarks } from "./types.ts";

const RUB_SOURCE = "quran-metadata-rub.json";
const RUKU_SOURCE = "quran-metadata-ruku.json";

/** QPC Hafs's Hizb quarter sign, written at the front of a Word and followed by a space. */
const PRINTED_HIZB_SIGN = /^۞ /;
/** Digital Khatt Indopak's Ruku sign, written into an Ayah's end. */
const PRINTED_RUKU_SIGN = /ࣖ/g;

/** A QPC Hafs Word's text without its printed ۞ and the space after it. */
export const withoutHizbSign = (text: string) => text.replace(PRINTED_HIZB_SIGN, "");
/** A Digital Khatt Ayah-end text without its printed Ruku sign. */
export const withoutRukuSign = (text: string) => text.replace(PRINTED_RUKU_SIGN, "");

const AYAH = /^(\d+):(\d+)$/;

/** One QUL entry's first Ayah and the numbers the label needs. */
interface Entry {
  surah: number;
  ayah: number;
  numbers: Record<string, number>;
}

/** Each entry of `name` (keyed 1..n) as its first Ayah and the integer `fields`; throws, naming the file and entry, when one is malformed. */
function readEntries(qulDir: string, name: string, fields: string[]): Entry[] {
  return Object.entries(readJsonObject(qulDir, name)).map(([key, value]) => {
    const entry = isObject(value) ? value : {};
    const at = AYAH.exec(String(entry.first_verse_key));
    if (!at || !fields.every((f) => Number.isInteger(entry[f]))) throw new Error(`${name}: malformed entry ${key}`);
    const numbers = Object.fromEntries(fields.map((f) => [f, entry[f] as number]));
    return { surah: Number(at[1]), ayah: Number(at[2]), numbers };
  });
}

/** Hizb quarter `q`'s label by its place in its Hizb: Hizb N, ¼ Hizb N, ½ Hizb N or ¾ Hizb N. */
const hizbQuarterLabel = (q: number) => `${["", "¼ ", "½ ", "¾ "][(q - 1) % 4]}Hizb ${Math.ceil(q / 4)}`;
/** A Ruku's label: its number in its Surah, the Surah's Ruku count and its Ayah count. */
const rukuLabel = (n: number, of: number, ayahs: number) => `Ruku ${n} of ${of} · ${ayahs} ${ayahs === 1 ? "Ayah" : "Ayahs"}`;

/** `marks` grouped by Surah, each Surah's in Ayah order. */
function bySurah(marks: { surah: number; mark: SectionMark }[]): Map<number, SectionMark[]> {
  const grouped = new Map<number, SectionMark[]>();
  for (const { surah, mark } of marks) {
    const list = grouped.get(surah) ?? [];
    list.push(mark);
    grouped.set(surah, list);
  }
  for (const list of grouped.values()) list.sort((a, b) => a.ayah - b.ayah);
  return grouped;
}

/** The Section marks QUL's Rub' al-Hizb and Ruku files give, by Surah number. */
export type SectionMarkSources = { hizbQuarters: Map<number, SectionMark[]>; rukus: Map<number, SectionMark[]> };

/** Read QUL's Rub' al-Hizb and Ruku files from `qulDir` into labelled marks by Surah. */
export function readSectionMarks(qulDir: string): SectionMarkSources {
  const rub = readEntries(qulDir, RUB_SOURCE, ["rub_number"]);
  const ruku = readEntries(qulDir, RUKU_SOURCE, ["surah_ruku_number", "verses_count"]);
  const rukuCount = new Map<number, number>();
  for (const r of ruku) rukuCount.set(r.surah, (rukuCount.get(r.surah) ?? 0) + 1);
  return {
    hizbQuarters: bySurah(rub.map((r) => ({ surah: r.surah, mark: { ayah: r.ayah, label: hizbQuarterLabel(r.numbers.rub_number) } }))),
    rukus: bySurah(
      ruku.map((r) => ({
        surah: r.surah,
        mark: { ayah: r.ayah, label: rukuLabel(r.numbers.surah_ruku_number, rukuCount.get(r.surah)!, r.numbers.verses_count) },
      })),
    ),
  };
}

/** Surah `n`'s Section marks; throws, naming the file, when one stands above an Ayah the Surah does not have. */
export function sectionMarksOf(sources: SectionMarkSources, n: number, ayahCount: number): SectionMarks {
  const marks = (map: Map<number, SectionMark[]>, name: string) => {
    const list = map.get(n) ?? [];
    const stray = list.find((m) => m.ayah < 1 || m.ayah > ayahCount);
    if (stray) throw new Error(`${name}: "${stray.label}" starts at ${n}:${stray.ayah}, which is not an Ayah`);
    return list;
  };
  return { hizbQuarters: marks(sources.hizbQuarters, RUB_SOURCE), rukus: marks(sources.rukus, RUKU_SOURCE) };
}
