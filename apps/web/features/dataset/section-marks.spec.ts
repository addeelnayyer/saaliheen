import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  INDOPAK,
  RUB_META,
  RUKU_META,
  UTHMANI,
  allWords,
  buildFromCommittedSources,
  hizbQuarterLabel,
  isAyahEnd,
  readSource,
  rukuLabel,
  sectionMarksOf,
  wordAt,
  type RubMeta,
  type RukuMeta,
  type SectionMark,
  type SectionMarks,
  type TextSource,
} from "./support";

const feature = await loadFeature("./section-marks.feature");

/** The sign QPC Hafs writes before the Word a Hizb quarter starts at, and the Ruku sign Digital Khatt writes into an Ayah's end. */
const HIZB_SIGN = "۞";
const RUKU_SIGN = "ࣖ";

const surahOf = (key: string) => Number(key.split(":")[0]);
const ayahOf = (key: string) => Number(key.split(":")[1]);
const count = (text: string, sign: string) => text.split(sign).length - 1;

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios }) => {
  const built = buildFromCommittedSources;
  const rub = readSource<RubMeta>(RUB_META);
  const ruku = readSource<RukuMeta>(RUKU_META);
  let uthmani: TextSource | undefined;
  let indopak: TextSource | undefined;
  const hafs = () => (uthmani ??= readSource<TextSource>(UTHMANI));
  const khatt = () => (indopak ??= readSource<TextSource>(INDOPAK));

  const marksOf = (n: number): SectionMarks => sectionMarksOf(built().dataset.surahs[n - 1], `Surah ${n}`);
  const everySurah = () => built().dataset.surahs.map((s) => ({ number: s.number, marks: sectionMarksOf(s, `Surah ${s.number}`) }));

  /** Each Ayah's Ayah-end location in QPC Hafs ("s:a:w" of its marker), by "s:a". */
  let ends: Map<string, string> | undefined;
  const ayahEnds = () => {
    if (ends) return ends;
    ends = new Map();
    for (const [location] of Object.entries(hafs())) {
      if (isAyahEnd(hafs(), location)) ends.set(location.split(":").slice(0, 2).join(":"), location);
    }
    return ends;
  };

  BeforeAllScenarios(() => {
    built();
  });

  Background(({ Given }) => {
    Given("the dataset is built from the committed sources", () => {
      expect(built().dataset.surahs).toHaveLength(114);
    });
  });

  /** The marks every Surah should carry, read from a QUL file: per Surah, its marks in Ayah order. */
  const expectedBySurah = (entries: { key: string; label: string }[]) => {
    const by = new Map<number, SectionMark[]>();
    for (const { key, label } of entries) {
      const list = by.get(surahOf(key)) ?? [];
      list.push({ ayah: ayahOf(key), label });
      by.set(surahOf(key), list);
    }
    for (const list of by.values()) list.sort((a, b) => a.ayah - b.ayah);
    return by;
  };
  const rubEntries = () => Object.values(rub).map((r) => ({ key: r.first_verse_key, label: hizbQuarterLabel(r.rub_number) }));
  const rukuCount = (surah: number) => Object.values(ruku).filter((r) => surahOf(r.first_verse_key) === surah).length;
  const rukuEntries = () =>
    Object.values(ruku).map((r) => ({
      key: r.first_verse_key,
      label: rukuLabel(r.surah_ruku_number, rukuCount(surahOf(r.first_verse_key)), r.verses_count),
    }));

  Scenario("Every Hizb quarter is marked at the Ayah it starts, labelled by its place", ({ Then, And }) => {
    Then("the Surahs hold 240 Hizb quarter marks in all", () => {
      expect(Object.keys(rub)).toHaveLength(240);
      expect(everySurah().reduce((n, s) => n + s.marks.hizbQuarters.length, 0)).toBe(240);
    });
    And("each of QUL's 240 Hizb quarters is marked once, above its first Ayah, labelled by its place in its Hizb", () => {
      const expected = expectedBySurah(rubEntries());
      for (const s of everySurah()) expect(s.marks.hizbQuarters, `Surah ${s.number}'s Hizb quarter marks`).toEqual(expected.get(s.number) ?? []);
    });
    And("each Surah's Hizb quarter marks are in Ayah order", () => {
      for (const s of everySurah()) {
        const ayahs = s.marks.hizbQuarters.map((m) => m.ayah);
        expect(ayahs, `Surah ${s.number}`).toEqual([...ayahs].sort((a, b) => a - b));
      }
    });
  });

  Scenario("The 41 Hizb quarters that start a Surah are marked above its first Ayah", ({ Then, And }) => {
    const starting = () => Object.values(rub).filter((r) => ayahOf(r.first_verse_key) === 1);
    Then("QUL's Rub' al-Hizb file has 41 Hizb quarters that start at a Surah's first Ayah", () => {
      expect(starting()).toHaveLength(41);
    });
    And("each of them is marked above Ayah 1 of its Surah, labelled by its place in its Hizb", () => {
      for (const r of starting()) {
        expect(marksOf(surahOf(r.first_verse_key)).hizbQuarters, `Hizb quarter ${r.rub_number} at ${r.first_verse_key}`).toContainEqual({
          ayah: 1,
          label: hizbQuarterLabel(r.rub_number),
        });
      }
    });
    And('Surah 1\'s only Hizb quarter mark is "Hizb 1", above Ayah 1:1', () => {
      expect(marksOf(1).hizbQuarters).toEqual([{ ayah: 1, label: "Hizb 1" }]);
    });
  });

  Scenario("Every Ruku is marked at the Ayah it starts, with its number in the Surah and its Ayah count", ({ Then, And }) => {
    Then("the Surahs hold 558 Ruku marks in all", () => {
      expect(Object.keys(ruku)).toHaveLength(558);
      expect(everySurah().reduce((n, s) => n + s.marks.rukus.length, 0)).toBe(558);
    });
    And(
      "each of QUL's 558 Rukus is marked once, above its first Ayah, labelled with its number in its Surah, its Surah's Ruku count and its Ayah count",
      () => {
        const expected = expectedBySurah(rukuEntries());
        for (const s of everySurah()) expect(s.marks.rukus, `Surah ${s.number}'s Ruku marks`).toEqual(expected.get(s.number) ?? []);
      },
    );
    And("each Surah's Ruku marks are numbered 1 upwards in Ayah order", () => {
      for (const s of everySurah()) {
        const numbers = s.marks.rukus.map((m) => Number(/^Ruku (\d+) of /.exec(m.label)?.[1]));
        expect(numbers, `Surah ${s.number}`).toEqual(numbers.map((_, k) => k + 1));
        const ayahs = s.marks.rukus.map((m) => m.ayah);
        expect(ayahs, `Surah ${s.number}`).toEqual([...ayahs].sort((a, b) => a - b));
      }
    });
  });

  Scenario('A one-Ayah Ruku says "1 Ayah"', ({ Then, And }) => {
    Then('QUL\'s Ruku file has exactly one Ruku of one Ayah, starting at "73:20"', () => {
      expect(Object.values(ruku).filter((r) => r.verses_count === 1).map((r) => r.first_verse_key)).toEqual(["73:20"]);
    });
    And('Surah 73\'s Ruku mark above Ayah 73:20 is labelled "Ruku 2 of 2 · 1 Ayah"', () => {
      expect(marksOf(73).rukus.find((m) => m.ayah === 20)).toEqual({ ayah: 20, label: "Ruku 2 of 2 · 1 Ayah" });
    });
  });

  Scenario("Surah 63 has a Hizb quarter at 63:4 and Rukus at 63:1 and 63:9", ({ When, Then, And }) => {
    const rows = (table: { ayah: string; label: string }[]) => table.map((r) => ({ ayah: Number(r.ayah), label: r.label }));
    When("I read Surah 63's Section marks", () => {
      marksOf(63);
    });
    Then("its Hizb quarter marks are exactly", (_, table: { ayah: string; label: string }[]) => {
      expect(marksOf(63).hizbQuarters).toEqual(rows(table));
    });
    And("its Ruku marks are exactly", (_, table: { ayah: string; label: string }[]) => {
      expect(marksOf(63).rukus).toEqual(rows(table));
    });
  });

  Scenario("No printed ۞ remains in the Uthmani text, and no other character changes", ({ Then, And }) => {
    const signed = () => Object.values(hafs()).filter((e) => e.text.includes(HIZB_SIGN));
    Then("QPC Hafs writes ۞ 199 times, each at the front of a Word and followed by a space", () => {
      expect(Object.values(hafs()).reduce((n, e) => n + count(e.text, HIZB_SIGN), 0)).toBe(199);
      for (const e of signed()) expect(e.text.startsWith(`${HIZB_SIGN} `), e.location).toBe(true);
    });
    And("no Word's Uthmani text holds ۞", () => {
      expect(allWords(built()).filter((w) => w.uthmani.includes(HIZB_SIGN)).map((w) => w.location)).toEqual([]);
    });
    And("each of those 199 Words' Uthmani text is its QPC Hafs text without the ۞ and the space after it", () => {
      expect(signed()).toHaveLength(199);
      for (const e of signed()) expect(wordAt(built(), e.location).uthmani, e.location).toBe(e.text.slice(`${HIZB_SIGN} `.length));
    });
    And("every other Word's Uthmani text is its QPC Hafs text unchanged", () => {
      for (const w of allWords(built())) {
        const source = hafs()[w.location].text;
        if (!source.includes(HIZB_SIGN)) expect(w.uthmani, w.location).toBe(source);
      }
    });
    And("Word 63:4:1's Uthmani text is its QPC Hafs text without its leading ۞", () => {
      const source = hafs()["63:4:1"].text;
      expect(source.startsWith(HIZB_SIGN)).toBe(true);
      expect(wordAt(built(), "63:4:1").uthmani).toBe(source.slice(`${HIZB_SIGN} `.length));
    });
  });

  Scenario("No printed Ruku sign remains in the Indo-Pak text, and no other character changes", ({ Then, And }) => {
    /** Each Ayah of the dataset with Digital Khatt's text at its Ayah-end marker. */
    const ayahsWithEnds = () =>
      built().dataset.surahs.flatMap((s) =>
        s.ayahs.map((a) => {
          const at = ayahEnds().get(`${s.number}:${a.number}`);
          expect(at, `Ayah ${s.number}:${a.number}'s Ayah-end marker`).toBeDefined();
          return { id: `${s.number}:${a.number}`, built: a.indopakEnd, source: khatt()[at!].text };
        }),
      );
    Then("Digital Khatt Indopak writes the Ruku sign U+08D6 558 times, all in Ayah-end text and none in a Word", () => {
      const endLocations = new Set(ayahEnds().values());
      const inEnds = [...endLocations].reduce((n, at) => n + count(khatt()[at].text, RUKU_SIGN), 0);
      const inWords = Object.values(khatt()).filter((e) => !endLocations.has(e.location)).reduce((n, e) => n + count(e.text, RUKU_SIGN), 0);
      expect({ inEnds, inWords }).toEqual({ inEnds: 558, inWords: 0 });
    });
    And("no Ayah's Indo-Pak end holds the Ruku sign", () => {
      expect(ayahsWithEnds().filter((a) => a.built.includes(RUKU_SIGN)).map((a) => a.id)).toEqual([]);
    });
    And("each of those 558 Ayahs' Indo-Pak end is Digital Khatt's Ayah-end text without the Ruku sign", () => {
      const signed = ayahsWithEnds().filter((a) => a.source.includes(RUKU_SIGN));
      expect(signed).toHaveLength(558);
      for (const a of signed) expect(a.built, a.id).toBe(a.source.replaceAll(RUKU_SIGN, ""));
    });
    And("every other Ayah's Indo-Pak end is Digital Khatt's Ayah-end text unchanged", () => {
      for (const a of ayahsWithEnds()) if (!a.source.includes(RUKU_SIGN)) expect(a.built, a.id).toBe(a.source);
    });
    And("every Word's Indo-Pak text is its Digital Khatt Indopak text unchanged", () => {
      for (const w of allWords(built())) expect(w.indopak, w.location).toBe(khatt()[w.location].text);
    });
  });
});
