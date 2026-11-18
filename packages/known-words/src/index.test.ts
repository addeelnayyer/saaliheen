import { describe, expect, it } from "vitest";
import { compareRootLetters, hasLetters, isKnown, isKnownWordEntry, rootHasLetters, isKnownWord, knownEntries, knownLookup, knownRootLetters, knownTexts, markKnown, mergeKnownWords, parseKnownWords, writeKnownWords, type KnownWordEntry } from "./index.ts";

const rahma: KnownWordEntry = { kind: "root", text: "ر ح م", known: true, markedAt: 1000 };
const min: KnownWordEntry = { kind: "lemma", text: "مِن", known: true, markedAt: 2000 };
const huwa: KnownWordEntry = { kind: "spelling", text: "هُوَ", known: false, markedAt: 3000 };

describe("the stored list", () => {
  it("reads back what was written", () => {
    expect(parseKnownWords(writeKnownWords([rahma, min, huwa]))).toEqual([rahma, min, huwa]);
  });

  it("drops malformed entries and keeps the rest", () => {
    const stored = JSON.stringify([
      rahma,
      { kind: "word", text: "ك ت ب", known: true, markedAt: 1 },
      { kind: "root", text: "", known: true, markedAt: 1 },
      { kind: "root", text: 7, known: true, markedAt: 1 },
      { kind: "root", text: "ع ل م", known: "yes", markedAt: 1 },
      { kind: "root", text: "ع ل م", known: true, markedAt: "today" },
      { kind: "root", text: "ع ل م", known: true },
      null,
      "ر ح م",
      min,
    ]);
    expect(parseKnownWords(stored)).toEqual([rahma, min]);
  });

  it("keeps only an entry's own fields", () => {
    expect(parseKnownWords(JSON.stringify([{ ...rahma, colour: "green" }]))).toEqual([rahma]);
  });

  it("keeps one entry per Root or particle: the one merging would keep", () => {
    const unmarked = { ...rahma, known: false, markedAt: 4000 };
    expect(parseKnownWords(JSON.stringify([unmarked, rahma]))).toEqual([unmarked]);
  });

  it("is empty when nothing is stored or it is not a JSON array", () => {
    expect(parseKnownWords(null)).toEqual([]);
    expect(parseKnownWords(undefined)).toEqual([]);
    expect(parseKnownWords("not json")).toEqual([]);
    expect(parseKnownWords('{"kind":"root"}')).toEqual([]);
  });
});

describe("a Known words entry", () => {
  it("is a kind, a non-empty text, a known flag and a whole, non-negative markedAt in milliseconds", () => {
    expect([rahma, min, huwa, { ...rahma, markedAt: 0 }].every(isKnownWordEntry)).toBe(true);
  });

  it("is not one with a fractional, negative or unsafe markedAt", () => {
    for (const markedAt of [1000.5, -1, 2 ** 53, Infinity, NaN]) expect(isKnownWordEntry({ ...rahma, markedAt }), String(markedAt)).toBe(false);
  });

  it("is not one with a text longer than any Root or particle", () => {
    expect(isKnownWordEntry({ ...rahma, text: "ر".repeat(65) })).toBe(false);
  });
});

describe("marking and unmarking", () => {
  it("marks a Root not yet in the list", () => {
    expect(markKnown([min], { kind: "root", text: "ر ح م" }, true, 1000)).toEqual([min, rahma]);
  });

  it("keeps an unmark as an entry, not a deletion", () => {
    expect(markKnown([rahma, min], { kind: "root", text: "ر ح م" }, false, 5000)).toEqual([
      min,
      { kind: "root", text: "ر ح م", known: false, markedAt: 5000 },
    ]);
  });

  it("tells a Root from a particle with the same text", () => {
    const list = markKnown([], { kind: "lemma", text: "ر ح م" }, true, 1);
    expect(isKnown(list, { kind: "lemma", text: "ر ح م" })).toBe(true);
    expect(isKnown(list, { kind: "root", text: "ر ح م" })).toBe(false);
  });

  it("answers whether each entry is known: marked, unmarked, never marked", () => {
    const list = [rahma, min, huwa];
    expect(isKnown(list, { kind: "root", text: "ر ح م" })).toBe(true);
    expect(isKnown(list, { kind: "spelling", text: "هُوَ" })).toBe(false);
    expect(isKnown(list, { kind: "root", text: "ك ت ب" })).toBe(false);
  });

  it("changes nothing it is given", () => {
    const list = [rahma, min];
    const before = list.map((e) => ({ ...e }));
    markKnown(list, { kind: "root", text: "ر ح م" }, false, 5000);
    expect(list).toEqual(before);
  });
});

describe("merging lists", () => {
  const rahmaUnmarked = (markedAt: number): KnownWordEntry => ({ ...rahma, known: false, markedAt });

  it("keeps every entry only one list holds", () => {
    expect(mergeKnownWords([rahma], [min, huwa])).toEqual([rahma, min, huwa]);
  });

  it("the newer mark wins over an older unmark", () => {
    expect(mergeKnownWords([rahmaUnmarked(500)], [rahma])).toEqual([rahma]);
  });

  it("the newer unmark wins over an older mark", () => {
    expect(mergeKnownWords([rahma], [rahmaUnmarked(4000)])).toEqual([rahmaUnmarked(4000)]);
  });

  it("a tie goes to the unmark", () => {
    expect(mergeKnownWords([rahma], [rahmaUnmarked(1000)])).toEqual([rahmaUnmarked(1000)]);
    expect(mergeKnownWords([rahmaUnmarked(1000)], [rahma])).toEqual([rahmaUnmarked(1000)]);
  });

  it("is the same in any order", () => {
    const a = [rahma, min];
    const b = [rahmaUnmarked(4000), huwa];
    const c = [{ ...min, known: false, markedAt: 1500 }, { ...huwa, known: true, markedAt: 9000 }];
    const merged = mergeKnownWords(a, b, c);
    expect(mergeKnownWords(c, b, a)).toEqual(merged);
    expect(mergeKnownWords(b, a, c)).toEqual(merged);
    expect(merged).toEqual([min, rahmaUnmarked(4000), { ...huwa, known: true, markedAt: 9000 }]);
  });

  it("changes nothing it is given", () => {
    const a = [rahma];
    const b = [rahmaUnmarked(4000)];
    mergeKnownWords(a, b);
    expect(a).toEqual([rahma]);
    expect(b).toEqual([rahmaUnmarked(4000)]);
  });
});

describe("known Words", () => {
  const list = [rahma, min, huwa, { kind: "spelling", text: "لَهُمْ", known: true, markedAt: 4000 } satisfies KnownWordEntry];

  it("the known set holds only the marked entries", () => {
    expect(knownEntries(list)).toEqual([rahma, min, list[3]]);
  });

  it("the Known Roots are the marked Roots' letters, and no particle's", () => {
    expect(knownRootLetters([...list, { kind: "root", text: "ك ت ب", known: false, markedAt: 5000 }])).toEqual(new Set(["ر ح م"]));
  });

  it("the Known particles of a kind are the marked particles' texts of that kind, and no Root's or unmark's", () => {
    const ila: KnownWordEntry = { kind: "lemma", text: "إِلَىٰ", known: false, markedAt: 4000 };
    const lahum: KnownWordEntry = { kind: "spelling", text: "لَهُمۡ", known: true, markedAt: 5000 };
    const entries = [rahma, min, huwa, ila, lahum, { ...rahma, kind: "lemma" as const }];
    expect([...knownTexts(entries, "lemma")].sort()).toEqual(["ر ح م", "مِن"]);
    expect([...knownTexts(entries, "spelling")]).toEqual(["لَهُمۡ"]);
    expect([...knownTexts(entries, "root")]).toEqual(["ر ح م"]);
  });

  it("looks up a Root or particle as known by its kind and text together", () => {
    const entries: KnownWordEntry[] = [rahma, { kind: "lemma", text: "إِلَّا", known: true, markedAt: 1 }, huwa];
    const known = knownLookup(entries);
    expect(known({ kind: "root", text: "ر ح م" })).toBe(true);
    expect(known({ kind: "lemma", text: "إِلَّا" })).toBe(true);
    expect(known({ kind: "spelling", text: "إِلَّا" })).toBe(false);
    expect(known({ kind: "spelling", text: "هُوَ" })).toBe(false);
  });

  it("a Word is known through its Root", () => {
    expect(isKnownWord(list, { root: "ر ح م" })).toBe(true);
    expect(isKnownWord(list, { root: "ك ت ب" })).toBe(false);
  });

  it("a rootless Word is known through its particle's Lemma", () => {
    expect(isKnownWord(list, { particle: { kind: "lemma", text: "مِن" } })).toBe(true);
    expect(isKnownWord(list, { particle: { kind: "lemma", text: "فِى" } })).toBe(false);
  });

  it("a rootless Word with no Lemma is known through its Spelling, unless it was unmarked", () => {
    expect(isKnownWord(list, { particle: { kind: "spelling", text: "لَهُمْ" } })).toBe(true);
    expect(isKnownWord(list, { particle: { kind: "spelling", text: "هُوَ" } })).toBe(false);
  });

  it("a Word with neither Root nor particle is not known", () => {
    expect(isKnownWord(list, {})).toBe(false);
  });
});

describe("Roots by their letters", () => {
  it("are in Arabic letter order, letter by letter", () => {
    const roots = ["ي و م", "ر ح م", "ب ي ن", "ف ع ل", "ا م ن", "ر ب ب", "ك ت ب", "ه د ي", "ن و ر", "ر ح ب"];
    expect(roots.sort(compareRootLetters)).toEqual(["ا م ن", "ب ي ن", "ر ب ب", "ر ح ب", "ر ح م", "ف ع ل", "ك ت ب", "ن و ر", "ه د ي", "ي و م"]);
  });

  it("put a shorter Root before a longer one it begins", () => {
    expect(["ز ل ز ل", "ز ل ل"].sort(compareRootLetters)).toEqual(["ز ل ز ل", "ز ل ل"]);
    expect(["ر ح م ن", "ر ح م"].sort(compareRootLetters)).toEqual(["ر ح م", "ر ح م ن"]);
  });

  it("are found by their letters, with or without spaces or vowel marks", () => {
    expect(rootHasLetters("ر ح م", "رحم")).toBe(true);
    expect(rootHasLetters("ر ح م", "ر ح م")).toBe(true);
    expect(rootHasLetters("ر ح م", "رَحِمَ")).toBe(true);
    expect(rootHasLetters("ر ح م", "رح")).toBe(true);
    expect(rootHasLetters("ر ح م", "رحب")).toBe(false);
  });

  it("are found by a hamza written as alif, and a final ى as ي", () => {
    expect(rootHasLetters("ا م ن", "أمن")).toBe(true);
    expect(rootHasLetters("ه د ي", "هدى")).toBe(true);
  });

  it("are not found by a search with no Arabic letters", () => {
    expect(rootHasLetters("ر ح م", "mercy")).toBe(false);
    expect(rootHasLetters("ر ح م", "  ")).toBe(false);
  });
});

describe("particles by their letters", () => {
  it("are found by their letters, with or without vowel marks", () => {
    expect(hasLetters("مِن", "من")).toBe(true);
    expect(hasLetters("مِن", "مِنْ")).toBe(true);
    expect(hasLetters("فِي", "في")).toBe(true);
    expect(hasLetters("لَهُمۡ", "لهم")).toBe(true);
    expect(hasLetters("مِن", "في")).toBe(false);
  });

  it("are found by a hamza written as alif, and a final ى as ي", () => {
    expect(hasLetters("إِلَّا", "الا")).toBe(true);
    expect(hasLetters("عَلَىٰ", "على")).toBe(true);
  });

  it("are not found by a search with no Arabic letters", () => {
    expect(hasLetters("مِن", "from")).toBe(false);
  });
});
