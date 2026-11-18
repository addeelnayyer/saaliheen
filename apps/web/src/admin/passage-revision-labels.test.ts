// How the Admin area writes a Passage revision's edits and changed rows (#174).

import { describe, expect, it } from "vitest";
import { editLabel, passageChangeLabel, phraseChangeLabel } from "./passage-revision-labels";

const passage = (from: number, till: number, en: string) => ({ from, till, en, ur: "ur" });
const phrase = (first: string, last: string) => ({ first: `107:${first}`, last: `107:${last}` });

describe("a Passage revision's edits", () => {
  it("are each written by what it was sent with", () => {
    expect(editLabel({ kind: "retitle", from: 1, en: "Those who deny", ur: "منکر" })).toBe("retitle the Passage from Ayah 1: “Those who deny” · “منکر”");
    expect(editLabel({ kind: "split", from: 1, at: 2 })).toBe("split the Passage from Ayah 1 at Ayah 2");
    expect(editLabel({ kind: "join", from: 4 })).toBe("join the Passage from Ayah 4 into the one above");
    expect(editLabel({ kind: "moveStart", from: 4, to: 3 })).toBe("move the start of the Passage from Ayah 4 to Ayah 3");
    expect(editLabel({ kind: "mark", first: "107:1:1", last: "107:1:4" })).toBe("mark the Phrase 1:1–1:4");
    expect(editLabel({ kind: "unmark", phrase: "107:1:1" })).toBe("unmark the Phrase from 1:1");
    expect(editLabel({ kind: "moveEnd", phrase: "107:1:1", end: "last", to: "107:2:2" })).toBe("move the last Word of the Phrase from 1:1 to 2:2");
  });
});

describe("a Passage revision's changed rows", () => {
  it("say what was added, removed, or what a row was and is", () => {
    expect(passageChangeLabel({ before: passage(1, 3, "A"), after: passage(1, 7, "A") })).toBe("Passage 1–3 “A” → 1–7 “A”");
    expect(passageChangeLabel({ before: passage(4, 7, "B"), after: null })).toBe("Passage 4–7 “B” removed");
    expect(phraseChangeLabel({ before: null, after: phrase("1:1", "1:4") })).toBe("Phrase 1:1–1:4 added");
  });
});
