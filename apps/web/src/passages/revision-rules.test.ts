// A Passage revision's row changes and undoing them (#174): the pure rules
// the revision list and an undo use, on Surah 107 (7 Ayahs, of 4, 4, 5, 2, 5,
// 3 and 2 Words).

import { fileURLToPath } from "node:url";
import { buildDataset } from "@saaliheen/dataset";
import { describe, expect, it } from "vitest";
import type { Passage } from "@/dataset/reader";
import { revisionChanges, undone } from "./revision-rules.ts";

const passage = (from: number, till: number, en = `${from}`): Passage => ({ from, till, en, ur: `${from} ur` });
const phrase = (first: string, last: string) => ({ first: `107:${first}`, last: `107:${last}` });
const SURAH = buildDataset({ sourceDir: fileURLToPath(new URL("../../data", import.meta.url)) }).dataset.surahs[106];

describe("a revision's row changes", () => {
  it("are the Passages and Phrases it changed, each before and after, keyed by first Ayah and first Word", () => {
    const before = { passages: [passage(1, 3), passage(4, 7)], phrases: [phrase("1:1", "1:4"), phrase("2:1", "2:2")] };
    const after = { passages: [passage(1, 7)], phrases: [phrase("1:1", "1:4"), phrase("2:1", "2:4"), phrase("5:1", "5:5")] };
    expect(revisionChanges(before, after)).toEqual({
      passages: [
        { before: passage(1, 3), after: passage(1, 7) },
        { before: passage(4, 7), after: null },
      ],
      phrases: [
        { before: phrase("2:1", "2:2"), after: phrase("2:1", "2:4") },
        { before: null, after: phrase("5:1", "5:5") },
      ],
    });
  });

  it("are none when nothing changed", () => {
    const marks = { passages: [passage(1, 7)], phrases: [phrase("1:1", "1:4")] };
    expect(revisionChanges(marks, structuredClone(marks))).toEqual({ passages: [], phrases: [] });
  });
});

describe("undoing a revision", () => {
  const before = { passages: [passage(1, 3), passage(4, 7)], phrases: [] };
  const after = { passages: [passage(1, 7)], phrases: [phrase("1:1", "1:4")] };
  const changes = revisionChanges(before, after);

  it("puts back every row it changed when each still stands as it left it", () => {
    expect(undone(SURAH, after, changes, {})).toEqual(before);
  });

  it("keeps a later revision's own changes to other rows", () => {
    const now = { passages: [passage(1, 7)], phrases: [phrase("1:1", "1:4"), phrase("5:1", "5:5")] };
    expect(undone(SURAH, now, changes, {})).toEqual({ passages: before.passages, phrases: [phrase("5:1", "5:5")] });
  });

  it("is a clash, naming the row, when a later revision changed a row it changed", () => {
    const now = { passages: [passage(1, 7, "retitled later")], phrases: [phrase("1:1", "1:4")] };
    expect(undone(SURAH, now, changes, {})).toEqual({ clash: expect.stringMatching(/Passage 1–7/) });
    const unmarked = { passages: [passage(1, 7)], phrases: [] };
    expect(undone(SURAH, unmarked, changes, {})).toEqual({ clash: expect.stringMatching(/Phrase 1:1–1:4/) });
  });

  it("is a clash when what it would leave breaks a Passage or Phrase rule", () => {
    // A later revision marked a Phrase across Ayahs 3 and 4, which the undone join's boundary would cut.
    const now = { passages: [passage(1, 7)], phrases: [phrase("1:1", "1:4"), phrase("3:5", "4:1")] };
    expect(undone(SURAH, now, changes, {})).toEqual({ clash: expect.stringMatching(/break a rule.*Phrase/) });
  });

  it("is a clash, naming the entry, when a Passage it would put back splits a Tafsir entry (#235)", () => {
    const tafsir = { ur: [{ firstAyah: 1, lastAyah: 3 }, { firstAyah: 4, lastAyah: 7 }], en: [{ firstAyah: 1, lastAyah: 5 }, { firstAyah: 6, lastAyah: 7 }] };
    expect(undone(SURAH, after, changes, tafsir)).toEqual({ clash: "The undo would break a rule: Passage 4–7: splits the English Tafsir entry 1–5" });
  });
});
