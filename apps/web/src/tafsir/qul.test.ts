import { describe, expect, it } from "vitest";
import { tafsirEntriesOf, TafsirRefused } from "./qul.ts";

/** Surah lengths enough for these files: Al-Baqarah 286 Ayahs, Al-Kawthar 3. */
const ayahCount = (surah: number) => ({ 2: 286, 108: 3 })[surah] ?? 0;

describe("tafsirEntriesOf", () => {
  it("makes one entry of each Ayah key holding text, in Quran order", () => {
    const qul = {
      "108:2": { text: "second", ayah_keys: ["108:2"] },
      "2:5": { text: "fifth", ayah_keys: ["2:5"] },
      "108:1": { text: "first", ayah_keys: ["108:1"] },
    };
    expect(tafsirEntriesOf(qul, ayahCount)).toEqual([
      { surah: 2, firstAyah: 5, lastAyah: 5, text: "fifth" },
      { surah: 108, firstAyah: 1, lastAyah: 1, text: "first" },
      { surah: 108, firstAyah: 2, lastAyah: 2, text: "second" },
    ]);
  });

  it("makes a grouped entry once, its pointers folded into it", () => {
    const qul = {
      "2:3": { text: "<b>third</b> and <i>fourth</i>", ayah_keys: ["2:3", "2:4"] },
      "2:4": "2:3",
    };
    expect(tafsirEntriesOf(qul, ayahCount)).toEqual([{ surah: 2, firstAyah: 3, lastAyah: 4, text: "<b>third</b> and <i>fourth</i>" }]);
  });

  it.each([
    ["a file that is not an object", [], /JSON object/],
    ["a key that is no Ayah", { "2:300": { text: "x", ayah_keys: ["2:300"] } }, /2:300.*no Ayah/],
    ["a pointer to a key holding no text", { "2:4": "2:3" }, /2:4.*2:3/],
    ["a pointer its target does not cover", { "2:3": { text: "x", ayah_keys: ["2:3"] }, "2:4": "2:3" }, /2:4.*2:3/],
    ["an entry whose Ayahs are not consecutive", { "2:3": { text: "x", ayah_keys: ["2:3", "2:5"] } }, /2:3.*consecutive/],
    ["an entry crossing into another Surah", { "2:286": { text: "x", ayah_keys: ["2:286", "3:1"] } }, /2:286/],
    ["an entry not starting at its own key", { "2:4": { text: "x", ayah_keys: ["2:3", "2:4"] } }, /2:4/],
    ["an Ayah in two entries", { "2:3": { text: "x", ayah_keys: ["2:3", "2:4"] }, "2:4": { text: "y", ayah_keys: ["2:4"] } }, /2:4.*twice|more than one/],
    ["an empty text", { "2:3": { text: " ", ayah_keys: ["2:3"] } }, /2:3.*text/],
  ])("refuses %s, naming it", (_, qul, message) => {
    expect(() => tafsirEntriesOf(qul, ayahCount)).toThrow(TafsirRefused);
    expect(() => tafsirEntriesOf(qul, ayahCount)).toThrow(message);
  });
});
