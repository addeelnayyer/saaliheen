import { describe, expect, it } from "vitest";
import { knownWordsStyle } from "./known-words-tint";

/** The texts of one kind of Known word a style tints, in its order: Roots' letters unless `attribute` says otherwise. */
const tinted = (style: string, attribute = "data-root-letters") =>
  [...style.matchAll(new RegExp(`\\[${attribute}="((?:[^"\\\\]|\\\\.)*)"\\]`, "g"))].map((m) => m[1]);

const entry = (text: string, known: boolean, markedAt: number, kind = "root") => ({ kind, text, known, markedAt });
const stored = (...entries: unknown[]) => JSON.stringify(entries);

describe("knownWordsStyle", () => {
  it("tints nothing when nothing is stored, or what is stored is not a list", () => {
    for (const value of [null, "", "not json", "{}", "[]", "42"]) expect(knownWordsStyle(value)).toBe("");
  });

  it("tints the Words of every Known Root", () => {
    const style = knownWordsStyle(stored(entry("ر ح م", true, 1), entry("ك ت ب", true, 2)));
    expect(tinted(style)).toEqual(["ر ح م", "ك ت ب"]);
    expect(style).toContain("--known-word-tint");
  });

  it("leaves out an unmarked Root", () => {
    const style = knownWordsStyle(stored(entry("ر ح م", false, 1), entry("ك ت ب", true, 2)));
    expect(tinted(style)).toEqual(["ك ت ب"]);
  });

  it("tints the Words of every Known particle, by its Lemma or by its Spelling, and of no unmarked one", () => {
    const style = knownWordsStyle(
      stored(entry("مِن", true, 1, "lemma"), entry("هُوَ", true, 2, "spelling"), entry("فِي", false, 3, "lemma"), entry("ر ح م", true, 4)),
    );
    expect(tinted(style, "data-particle-lemma")).toEqual(["مِن"]);
    expect(tinted(style, "data-particle-spelling")).toEqual(["هُوَ"]);
    expect(tinted(style)).toEqual(["ر ح م"]);
  });

  it("keeps a Lemma and a Spelling particle with the same text apart", () => {
    const style = knownWordsStyle(stored(entry("مِن", true, 1, "lemma"), entry("مِن", false, 2, "spelling")));
    expect(tinted(style, "data-particle-lemma")).toEqual(["مِن"]);
    expect(tinted(style, "data-particle-spelling")).toEqual([]);
  });

  it("takes the newer of two entries for one Root, a tie going to the unmark, in either order", () => {
    expect(tinted(knownWordsStyle(stored(entry("ر ح م", true, 1), entry("ر ح م", false, 2))))).toEqual([]);
    expect(tinted(knownWordsStyle(stored(entry("ر ح م", false, 2), entry("ر ح م", true, 1))))).toEqual([]);
    expect(tinted(knownWordsStyle(stored(entry("ر ح م", false, 1), entry("ر ح م", true, 2))))).toEqual(["ر ح م"]);
    expect(tinted(knownWordsStyle(stored(entry("ر ح م", true, 3), entry("ر ح م", false, 3))))).toEqual([]);
    expect(tinted(knownWordsStyle(stored(entry("ر ح م", false, 3), entry("ر ح م", true, 3))))).toEqual([]);
  });

  it("drops malformed entries", () => {
    const style = knownWordsStyle(stored(null, 7, { kind: "root", text: "", known: true, markedAt: 1 }, { kind: "root", text: "ع ل م", known: "yes", markedAt: 1 }, entry("ع ل م", true, Number.NaN), entry("ع ل م", true, 1.5), entry("ع ل م", true, -1), entry("ع".repeat(65), true, 1), entry("ق و ل", true, 4)));
    expect(tinted(style)).toEqual(["ق و ل"]);
  });

  it("keeps a stored text with quotes or backslashes inside its selector", () => {
    const style = knownWordsStyle(stored(entry('a"]{}b\\', true, 1)));
    expect(tinted(style)).toEqual(['a\\"]{}b\\\\']);
    expect(style.split("{").length).toBe(3);
  });
});
