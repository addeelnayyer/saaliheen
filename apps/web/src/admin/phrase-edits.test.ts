// The Passage editor's Phrase edits (#100), and Passage edits kept from
// cutting a Phrase: the pure rules both the browser and Publish replay.

import { describe, expect, it } from "vitest";
import type { Passage } from "@/dataset/reader";
import { replayed, tried, markedAfter, passageEditsMade, type Edit, type Marked } from "./passage-edits";
import { phraseCut, phraseHolding, phrasesEdited, pickedRun, tapped } from "./phrase-edits";

const passage = (from: number, till: number): Passage => ({ from, till, en: `${from}`, ur: `${from}` });
const PASSAGES = [passage(99, 102), passage(103, 106), passage(107, 110)];
const at = (ref: string) => `18:${ref}`;
const phrase = (first: string, last: string) => ({ first: at(first), last: at(last) });
const PHRASES = [phrase("99:1", "100:1"), phrase("100:2", "100:5"), phrase("101:1", "102:14"), phrase("103:1", "103:5")];
const BASE: Marked = { passages: PASSAGES, phrases: PHRASES };

const edited = (edit: Parameters<typeof phrasesEdited>[2]) => phrasesEdited(PASSAGES, PHRASES, edit);

describe("Phrase edits", () => {
  it("marks a run across an Ayah end within its Passage, in Quran order", () => {
    expect(edited({ kind: "mark", first: at("104:3"), last: at("105:2") })).toEqual({ phrases: [...PHRASES, phrase("104:3", "105:2")] });
  });

  it("marks a single Word, and a run tapped last Word first", () => {
    expect(edited({ kind: "mark", first: at("106:4"), last: at("106:4") })).toEqual({ phrases: [...PHRASES, phrase("106:4", "106:4")] });
    expect(edited({ kind: "mark", first: at("105:2"), last: at("104:3") })).toEqual({ phrases: [...PHRASES, phrase("104:3", "105:2")] });
  });

  it("refuses a run over another Phrase, or out of its Passage, saying why", () => {
    expect(edited({ kind: "mark", first: at("103:5"), last: at("104:1") })).toEqual({ refusal: expect.stringMatching(/overlap the Phrase 103:1–103:5/) });
    expect(edited({ kind: "mark", first: at("106:9"), last: at("107:1") })).toEqual({ refusal: expect.stringMatching(/leave Passage 103–106/) });
    expect(phrasesEdited([], [], { kind: "mark", first: at("1:1"), last: at("1:2") })).toEqual({ refusal: expect.stringMatching(/leave its Passage/) });
  });

  it("unmarks a Phrase, named by its first Word", () => {
    expect(edited({ kind: "unmark", phrase: at("103:1") })).toEqual({ phrases: PHRASES.slice(0, 3) });
    expect(edited({ kind: "unmark", phrase: at("103:2") })).toBeNull();
  });

  it("moves either end, under the same rules", () => {
    expect(edited({ kind: "moveEnd", phrase: at("103:1"), end: "last", to: at("104:3") })).toEqual({ phrases: [...PHRASES.slice(0, 3), phrase("103:1", "104:3")] });
    expect(edited({ kind: "moveEnd", phrase: at("103:1"), end: "first", to: at("103:3") })).toEqual({ phrases: [...PHRASES.slice(0, 3), phrase("103:3", "103:5")] });
    expect(edited({ kind: "moveEnd", phrase: at("103:1"), end: "last", to: at("107:1") })).toHaveProperty("refusal");
    expect(edited({ kind: "moveEnd", phrase: at("99:1"), end: "last", to: at("100:3") })).toEqual({ refusal: expect.stringMatching(/overlap/) });
    expect(edited({ kind: "moveEnd", phrase: at("103:1"), end: "last", to: at("103:5") })).toBeNull();
    expect(edited({ kind: "moveEnd", phrase: at("104:1"), end: "last", to: at("104:2") })).toBeNull();
  });

  it("finds the Phrase a Passage boundary would cut", () => {
    expect(phraseCut(PASSAGES, PHRASES)).toBeUndefined();
    expect(phraseCut([passage(99, 99), passage(100, 106)], PHRASES)).toEqual(PHRASES[0]);
    expect(phraseHolding(PHRASES, at("102:3"))).toEqual(PHRASES[2]);
  });
});

describe("Passage and Phrase edits together", () => {
  it("refuses a split or a moved start inside a Phrase, explaining the Phrase must be changed first", () => {
    for (const edit of [{ kind: "split", from: 99, at: 100 }, { kind: "moveStart", from: 103, to: 102 }] as Edit[]) {
      const { changes, refusal } = tried(BASE, replayed(BASE, []), edit);
      expect(changes.edits).toEqual([]);
      expect(refusal).toMatch(/Phrase .+ must be changed first/);
    }
  });

  it("splits between Phrases, joins keeping both Passages' Phrases, and replays in the order made", () => {
    const edits: Edit[] = [
      { kind: "split", from: 99, at: 101 },
      { kind: "mark", first: at("104:3"), last: at("105:2") },
      { kind: "join", from: 103 },
      { kind: "unmark", phrase: at("103:1") },
      { kind: "mark", first: at("110:1"), last: at("103:9") },
    ];
    const changes = replayed(BASE, edits);
    expect(changes.edits).toEqual(edits.slice(0, 4));
    expect(markedAfter(BASE, changes).passages.map((p) => [p.from, p.till])).toEqual([[99, 100], [101, 106], [107, 110]]);
    expect(markedAfter(BASE, changes).phrases).toEqual([...PHRASES.slice(0, 3), phrase("104:3", "105:2")]);
    expect(passageEditsMade(changes)).toHaveLength(2);
  });
});

describe("Tapping Word cards", () => {
  it("picks a first Word, then marks up to the next Word tapped", () => {
    const first = tapped(null, PHRASES, at("104:3"));
    expect(first).toEqual({ next: { kind: "first", word: at("104:3") } });
    expect(pickedRun(first.next)).toEqual(phrase("104:3", "104:3"));
    expect(tapped(first.next, PHRASES, at("105:2"))).toEqual({ edit: { kind: "mark", first: at("104:3"), last: at("105:2") }, next: null });
  });

  it("selects the Phrase holding a Word, and moves the end chosen to the next Word tapped", () => {
    const selected = tapped(null, PHRASES, at("103:2")).next;
    expect(selected).toEqual({ kind: "selected", phrase: PHRASES[3] });
    expect(pickedRun(selected)).toEqual(PHRASES[3]);
    expect(pickedRun(null)).toBeNull();
    expect(tapped({ kind: "moving", phrase: PHRASES[3], end: "last" }, PHRASES, at("104:3"))).toEqual({
      edit: { kind: "moveEnd", phrase: at("103:1"), end: "last", to: at("104:3") },
      next: null,
    });
  });
});
