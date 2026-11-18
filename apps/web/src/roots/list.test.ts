import { describe, expect, it } from "vitest";
import type { ListedRootRow } from "@saaliheen/dataset/types";
import { findRoots, rootsByLetter } from "./list";

const root = (letters: string, transliteration: string, occurrences = 1): ListedRootRow => ({ letters, transliteration, occurrences });

const RAHIMA = root("ر ح م", "r-ḥ-m", 339);
const RABBA = root("ر ب ب", "r-b-b", 980);
const ILAH = root("ا ل ه", "ʾ-l-h", 2851);
const AMANA = root("ا م ن", "ʾ-m-n", 879);
const BADA = root("ب د ا", "b-d-ʾ", 15);
const HAMIDA = root("ح م د", "ḥ-m-d", 68);

describe("rootsByLetter", () => {
  it("puts each Root under its first letter, the letters and the Roots under each in Arabic alphabetical order", () => {
    expect(rootsByLetter([RAHIMA, HAMIDA, ILAH, BADA, RABBA, AMANA])).toEqual([
      { letter: "ا", roots: [ILAH, AMANA] },
      { letter: "ب", roots: [BADA] },
      { letter: "ح", roots: [HAMIDA] },
      { letter: "ر", roots: [RABBA, RAHIMA] },
    ]);
  });

  it("files a Root that begins with a hamza under ا", () => {
    const asked = root("ء ل ه", "ʾ-l-h");
    expect(rootsByLetter([BADA, asked])).toEqual([
      { letter: "ا", roots: [asked] },
      { letter: "ب", roots: [BADA] },
    ]);
  });
});

describe("findRoots", () => {
  const roots = [ILAH, RAHIMA, HAMIDA, RABBA];

  it("finds every Root for a blank search", () => {
    expect(findRoots("  ", roots)).toEqual(roots);
  });

  it.each(["ر ح م", "رحم", "رَحِمَ", " رح "])("finds a Root by its letters, spaces and vowel marks aside: %s", (search) => {
    expect(findRoots(search, roots)).toEqual([RAHIMA]);
  });

  it.each([
    ["کتب", "ك ت ب"],
    ["ہدی", "ه د ي"],
    ["ھدی", "ه د ي"],
  ])("finds a Root typed on an Urdu keyboard, its ک, ی and ہ the Root's letters: %s", (search, letters) => {
    const kataba = root("ك ت ب", "k-t-b");
    const hada = root("ه د ي", "h-d-y");
    const tabia = root("ت ب ع", "t-b-ʿ");
    expect(findRoots(search, [...roots, kataba, hada, tabia]).map((r) => r.letters)).toEqual([letters]);
  });

  it("finds every Root holding the letters searched for, in a row", () => {
    expect(findRoots("حم", roots)).toEqual([RAHIMA, HAMIDA]);
  });

  it.each(["r-ḥ-m", "R-Ḥ-M", "rhm", "RḤM", "r h m"])("finds a Root by its transliteration, in any case, accents and hyphens aside: %s", (search) => {
    expect(findRoots(search, roots)).toEqual([RAHIMA]);
  });

  it("finds by part of a transliteration", () => {
    expect(findRoots("hm", roots)).toEqual([RAHIMA, HAMIDA]);
  });

  it("finds nothing for a search no Root matches", () => {
    expect(findRoots("xyz", roots)).toEqual([]);
    expect(findRoots("ظظ", roots)).toEqual([]);
  });
});
