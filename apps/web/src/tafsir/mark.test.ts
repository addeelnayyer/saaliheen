import { afterEach, describe, expect, it, vi } from "vitest";
import type { PartAyah } from "@saaliheen/dataset/types";
import { markTafsir, withTafsir } from "./mark.ts";

/** Ayahs `from`..`till` of a Surah, bare. */
const ayahsOf = (from: number, till: number): PartAyah[] =>
  Array.from({ length: till - from + 1 }, (_, i) => ({ number: from + i, indopakEnd: "", themes: [], words: [], translation: "" }));

const CREDIT = "Tafsir: al-Mukhtasar";

/** The Ayahs of `ayahs` carrying a Tafsir, by number, with the Ayah ranges of its entries. */
const carried = (ayahs: PartAyah[]) =>
  ayahs.filter((a) => a.tafsir).map((a) => [a.number, a.tafsir!.entries.map((e) => `${e.firstAyah}-${e.lastAyah}`), a.tafsir!.credit]);

describe("markTafsir", () => {
  it("puts each Passage's Tafsir entries, in order, with the credit line, on the Passage's last Ayah", () => {
    const passages = [
      { from: 1, till: 4 },
      { from: 5, till: 7 },
    ];
    const entries = [
      { firstAyah: 1, lastAyah: 1, text: "one" },
      { firstAyah: 2, lastAyah: 4, text: "two to four" },
      { firstAyah: 5, lastAyah: 5, text: "five" },
      { firstAyah: 6, lastAyah: 7, text: "six and seven" },
    ];
    expect(carried(markTafsir(ayahsOf(1, 7), passages, entries, CREDIT))).toEqual([
      [4, ["1-1", "2-4"], CREDIT],
      [7, ["5-5", "6-7"], CREDIT],
    ]);
  });

  it("shows an entry a Passage splits after the Passage holding its last Ayah, so it follows every Ayah it explains", () => {
    const passages = [
      { from: 1, till: 2 },
      { from: 3, till: 4 },
    ];
    const entries = [
      { firstAyah: 1, lastAyah: 1, text: "one" },
      { firstAyah: 2, lastAyah: 3, text: "two and three" },
      { firstAyah: 4, lastAyah: 4, text: "four" },
    ];
    expect(carried(markTafsir(ayahsOf(1, 4), passages, entries, CREDIT))).toEqual([
      [2, ["1-1"], CREDIT],
      [4, ["2-3", "4-4"], CREDIT],
    ]);
  });

  it("gives a Passage with no entries no Tafsir, and marks only the Ayahs given, as a Surah part carries them", () => {
    const passages = [
      { from: 1, till: 3 },
      { from: 4, till: 6 },
      { from: 7, till: 9 },
    ];
    const entries = [
      { firstAyah: 1, lastAyah: 3, text: "one to three" },
      { firstAyah: 7, lastAyah: 9, text: "seven to nine" },
    ];
    expect(carried(markTafsir(ayahsOf(2, 8), passages, entries, CREDIT))).toEqual([[3, ["1-3"], CREDIT]]);
  });

  it("leaves the Ayahs as they were when the Surah has no Tafsir in the Language", () => {
    const ayahs = ayahsOf(1, 3);
    expect(markTafsir(ayahs, [{ from: 1, till: 3 }], [], CREDIT)).toBe(ayahs);
  });
});

describe("withTafsir", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("draws the Surah without Tafsir when Neon cannot give it", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ayahs = ayahsOf(1, 7);
    expect(await withTafsir(1, "en", ayahs, [{ from: 1, till: 7 }])).toBe(ayahs);
  });
});
