// What Phrases mode shows (#100): every Passage's Phrases tinted, covered or
// not, each Passage's progress in Words, and the Phrase named when one breaks
// the Phrase rules.

import { describe, expect, it } from "vitest";
import type { Passage } from "@/dataset/reader";
import { phrasesShown, progressText, type AyahLocations } from "./phrases";

const passage = (from: number, till: number): Passage => ({ from, till, en: `${from}`, ur: `${from}` });
const ayah = (number: number, words: number): AyahLocations => ({
  number,
  words: Array.from({ length: words }, (_, i) => ({ location: `18:${number}:${i + 1}` })),
});
const PASSAGES = [passage(1, 2), passage(3, 3)];
const AYAHS = [ayah(1, 3), ayah(2, 2), ayah(3, 4)];

describe("Phrases mode", () => {
  it("tints every Passage's Phrases, covered or not, and counts each Passage's Words in a Phrase", () => {
    const shown = phrasesShown(18, PASSAGES, AYAHS, [
      { first: "18:3:1", last: "18:3:2" },
      { first: "18:1:1", last: "18:1:3" },
      { first: "18:2:1", last: "18:2:2" },
    ]);
    if ("problem" in shown) throw new Error(shown.problem);
    expect([...shown.colours]).toEqual([
      ["18:1:1", "a"],
      ["18:1:2", "a"],
      ["18:1:3", "a"],
      ["18:2:1", "b"],
      ["18:2:2", "b"],
      ["18:3:1", "a"],
      ["18:3:2", "a"],
    ]);
    expect([...shown.progress]).toEqual([
      [1, { marked: 5, size: 5 }],
      [3, { marked: 2, size: 4 }],
    ]);
  });

  it("counts nothing marked in a Passage with no Phrases", () => {
    const shown = phrasesShown(18, PASSAGES, AYAHS, []);
    expect("progress" in shown && [...shown.progress]).toEqual([
      [1, { marked: 0, size: 5 }],
      [3, { marked: 0, size: 4 }],
    ]);
  });

  it("names the Phrase that breaks the rules", () => {
    const shown = phrasesShown(18, PASSAGES, AYAHS, [{ first: "18:2:2", last: "18:3:1" }]);
    expect(shown).toEqual({ problem: expect.stringContaining("Phrase 18:2:2–18:3:1: crosses a Passage's edge") });
  });

  it("writes a Passage heading's progress, with a tick once every Word is in a Phrase", () => {
    expect(progressText({ marked: 5, size: 5 })).toBe("Phrases ✓");
    expect(progressText({ marked: 2, size: 4 })).toBe("Phrases 2 / 4 Words");
  });
});
