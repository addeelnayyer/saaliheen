// #172 AC-1, AC-8: what the import writes, read back from the run's Postgres
// and held to the committed sources and to the builder's transform. Replaces
// the dataset seam's surahs, script-texts, word-meanings and ayah-translation
// features, and the Recitation timings of its recitation feature.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  ENGLISH,
  INDOPAK,
  RECITATION,
  SURAH_META,
  URDU,
  UTHMANI,
  buildFromCommittedSources,
  isAyahEnd,
  metadataAyahCount,
  readSource,
  withoutHizbSign,
  withoutRukuSign,
  type MeaningSource,
  type SurahMeta,
  type TextSource,
  type TimingSource,
} from "../dataset/support.ts";
import { builtExpected, importedCopy, readImported, type Imported, type ImportedAyah, type ImportedWord } from "./import-support.ts";

const feature = await loadFeature("./quran-import.feature");

const JALANDHARI = "ur-fatah-muhammad-jalandhari-simple.json";
const SAHEEH = "en-sahih-international-inline-footnotes.json";
type TranslationSource = Record<string, { t: string }>;
// Saheeh International writes its footnotes inline as [[…]]; single brackets are the translator's own and stay.
const FOOTNOTE = /\[\[[\s\S]*?\]\]/g;
const SINGLE_BRACKET = /(?<!\[)\[[^[\]]+\](?!\])/g;
const withoutFootnotes = (text: string) => text.replace(FOOTNOTE, "").replace(/\s+/g, " ").trim();
const END_SIGN = "۝";

describeFeature(feature, ({ Background, Scenario, BeforeAllScenarios }) => {
  const uthmani = readSource<TextSource>(UTHMANI);
  const indopak = readSource<TextSource>(INDOPAK);
  const timingSource = readSource<TimingSource>(RECITATION);
  let imported: Imported | undefined;
  let failure: unknown;
  let word: ImportedWord;
  /** The Word the scenario looked up, or a failure saying none was (the import gave no rows to look it up in). */
  const looked = () => {
    expect(word, "no imported Word was looked up").toBeDefined();
    return word;
  };

  BeforeAllScenarios(async () => {
    buildFromCommittedSources();
    try {
      imported = await readImported(await importedCopy("quran_import"));
    } catch (error) {
      failure = error;
    }
  });

  const rows = () => {
    expect(imported, `the import's rows could not be read: ${String((failure as Error)?.message ?? failure)}`).toBeDefined();
    return imported!;
  };
  const ayahs = () => rows().surahs.flatMap((s) => s.ayahs.map((a) => ({ id: `${s.number}:${a.number}`, ayah: a })));
  const words = () => rows().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words));
  const ayahAt = (s: number, a: number): ImportedAyah => {
    const found = rows().surahs[s - 1]?.ayahs[a - 1];
    expect(found, `no imported Ayah ${s}:${a}`).toBeDefined();
    return found!;
  };
  const wordAt = (location: string): ImportedWord => {
    const found = words().find((w) => w.location === location);
    expect(found, `no imported Word at ${location}`).toBeDefined();
    return found!;
  };
  const markers = () => Object.keys(uthmani).filter((l) => isAyahEnd(uthmani, l));

  Background(({ Given }) => {
    Given("a Postgres holding the import of the committed sources", () => {
      expect(rows().surahs.length).toBeGreaterThan(0);
    });
  });

  Scenario("All 114 Surahs are imported, in order, with QUL's metadata and their Ayahs", ({ Then, And }) => {
    const meta = readSource<SurahMeta>(SURAH_META);
    Then("for each of the {int} Surahs the metadata's Ayah count is the number of Ayahs the QPC Hafs text has", (_, count: number) => {
      for (let n = 1; n <= count; n++) {
        expect(metadataAyahCount(meta, n), `Surah ${n}`).toBe(markers().filter((l) => l.startsWith(`${n}:`)).length);
      }
    });
    And("the database holds Surahs 1 to {int} in order, each with the metadata's Ayah count and that many Ayahs", (_, count: number) => {
      expect(rows().surahs.map((s) => s.number)).toEqual(Array.from({ length: count }, (_, k) => k + 1));
      for (const s of rows().surahs) {
        expect(s.ayahCount, `Surah ${s.number}`).toBe(metadataAyahCount(meta, s.number));
        expect(s.ayahs, `Surah ${s.number}'s Ayahs`).toHaveLength(s.ayahCount);
      }
    });
    And("the database holds {int} Ayahs in all", (_, count: number) => {
      expect(ayahs()).toHaveLength(count);
    });
    And("each Surah's Ayahs are numbered from 1 to its Ayah count", () => {
      for (const s of rows().surahs) expect(s.ayahs.map((a) => a.number)).toEqual(Array.from({ length: s.ayahCount }, (_, k) => k + 1));
    });
    And("each Surah's Arabic and Latin name, revelation place and Bismillah are the builder's", () => {
      const summary = ({ number, nameArabic, nameLatin, revelationPlace, ayahCount, bismillah }: Imported["surahs"][number]) => ({ number, nameArabic, nameLatin, revelationPlace, ayahCount, bismillah });
      expect(rows().surahs.map(summary)).toEqual(builtExpected().surahs.map(summary));
    });
  });

  Scenario("Word 1:1:1 has its Uthmani and Indo-Pak text", ({ When, Then, And }) => {
    When("I look up the imported Word at {string}", (_, location: string) => {
      word = wordAt(location);
    });
    Then("its Uthmani text is the QPC Hafs text at that Word location", () => {
      expect(looked().uthmani).toBe(uthmani[looked().location].text);
    });
    And("its Indo-Pak text is the Digital Khatt Indopak text at that Word location", () => {
      expect(looked().indopak).toBe(indopak[looked().location].text);
    });
    And("its Uthmani and Indo-Pak texts differ", () => {
      expect(looked().uthmani).not.toBe(looked().indopak);
    });
  });

  Scenario("Every Word is imported in both Scripts, and Ayah-end markers are not Words", ({ Then, And }) => {
    Then("the QPC Hafs and Digital Khatt Indopak texts list the same Word locations", () => {
      expect(Object.keys(indopak).sort()).toEqual(Object.keys(uthmani).sort());
    });
    And("the imported Word locations are exactly the QPC Hafs Word locations that are not Ayah-end markers", () => {
      const expected = Object.keys(uthmani).filter((l) => !isAyahEnd(uthmani, l)).sort();
      expect(words().map((w) => w.location).sort()).toEqual(expected);
    });
    And(
      "every imported Word has the QPC Hafs text and the Digital Khatt Indopak text at its Word location, less the printed ۞ ADR 0020 removes",
      () => {
        for (const w of words()) {
          expect(w.uthmani, `Uthmani text at ${w.location}`).toBe(withoutHizbSign(uthmani[w.location].text));
          expect(w.indopak, `Indo-Pak text at ${w.location}`).toBe(indopak[w.location].text);
        }
      },
    );
    And("the QPC Hafs text has {int} Ayah-end markers", (_, count: number) => {
      expect(markers()).toHaveLength(count);
    });
    And("imported Ayah 1:1 holds exactly these Words", (_, table: { location: string }[]) => {
      expect(ayahAt(1, 1).words.map((w) => w.location)).toEqual(table.map((row) => row.location));
    });
  });

  Scenario("Each Ayah keeps its Indo-Pak end-of-Ayah text", ({ Then, And }) => {
    Then(
      "every imported Ayah's Indo-Pak end is Digital Khatt's text at the Ayah's Ayah-end marker, less the Ruku sign ADR 0020 removes",
      () => {
        const byAyah = new Map(markers().map((l) => [l.split(":").slice(0, 2).join(":"), l]));
        expect(ayahs()).toHaveLength(byAyah.size);
        for (const { id, ayah } of ayahs()) expect(ayah.indopakEnd, `Ayah ${id}'s Indo-Pak end`).toBe(withoutRukuSign(indopak[byAyah.get(id)!].text));
      },
    );
    And("every imported Ayah's Indo-Pak end starts with the end-of-Ayah sign U+06DD", () => {
      for (const { id, ayah } of ayahs()) expect(ayah.indopakEnd.startsWith(END_SIGN), `Ayah ${id}'s Indo-Pak end`).toBe(true);
    });
    And("imported Ayah 1:1's Indo-Pak end is that sign alone, and Ayah 1:2's carries the number 1", () => {
      expect(ayahAt(1, 1).indopakEnd).toBe(END_SIGN);
      expect(ayahAt(1, 2).indopakEnd.startsWith(END_SIGN + (1).toLocaleString("ar-EG"))).toBe(true);
    });
    And("imported Ayah 7:206's Indo-Pak end carries the sajdah sign U+08DB", () => {
      expect(ayahAt(7, 206).indopakEnd).toContain("ࣛ");
    });
  });

  Scenario("Word 1:5:2 has QUL's Urdu and English Word meaning", ({ When, Then, And }) => {
    const urdu = readSource<MeaningSource>(URDU);
    const english = readSource<MeaningSource>(ENGLISH);
    When("I look up the imported Word at {string}", (_, location: string) => {
      word = wordAt(location);
    });
    Then("QUL has an Urdu and an English Word meaning at that Word location", () => {
      expect(urdu[looked().location]).toBeTruthy();
      expect(english[looked().location]).toBeTruthy();
    });
    And("the Word's meaning is exactly QUL's Urdu and English Word meaning at that Word location", () => {
      expect(looked().meaning).toEqual({ ur: urdu[looked().location], en: english[looked().location] });
    });
  });

  Scenario("Every Word's meanings and Root tag are the builder's", ({ Then }) => {
    Then("every imported Word's Urdu and English Word meaning and Root tag are the builder's for that Word location", () => {
      const pick = ({ location, meaning, root }: ImportedWord) => ({ location, meaning, root });
      const built = builtExpected().surahs.flatMap((s) => s.ayahs.flatMap((a) => a.words.map(pick)));
      expect(words().map(pick)).toEqual(built);
    });
  });

  Scenario("Every Ayah's Ayah translations are imported, the English without its footnotes", ({ Then, And }) => {
    const jalandhari = readSource<TranslationSource>(JALANDHARI);
    const saheeh = readSource<TranslationSource>(SAHEEH);
    Then("every imported Ayah's Urdu Ayah translation is Jalandhari's text for that Ayah, unchanged", () => {
      expect(ayahs()).toHaveLength(Object.keys(jalandhari).length);
      for (const { id, ayah } of ayahs()) expect(ayah.translation.ur, `Urdu Ayah translation of ${id}`).toBe(jalandhari[id].t);
    });
    And("every imported Ayah's English Ayah translation is Saheeh International's text for that Ayah with each inline footnote removed", () => {
      for (const { id, ayah } of ayahs()) expect(ayah.translation.en, `English Ayah translation of ${id}`).toBe(withoutFootnotes(saheeh[id].t));
    });
    And("all {int} imported English Ayah translations are non-empty text", (_, count: number) => {
      expect(ayahs()).toHaveLength(count);
      for (const { id, ayah } of ayahs()) expect(ayah.translation.en.trim(), `English Ayah translation of ${id}`).not.toBe("");
    });
    const noneContains = (_: unknown, bracket: string) => {
      for (const { id, ayah } of ayahs()) expect(ayah.translation.en, `${id} keeps a footnote bracket`).not.toContain(bracket);
    };
    And("no imported English Ayah translation contains the footnote opening {string}", noneContains);
    And("no imported English Ayah translation contains the footnote closing {string}", noneContains);
    And("the imported English Ayah translation of 1:2 keeps each of Saheeh International's single-bracket insertions in 1:2", () => {
      const insertions = saheeh["1:2"].t.match(SINGLE_BRACKET) ?? [];
      expect(insertions.length, "1:2 has single-bracket insertions in the source").toBeGreaterThan(0);
      for (const insertion of insertions) expect(ayahAt(1, 2).translation.en).toContain(insertion);
    });
  });

  Scenario("Each Ayah's Word count is the number of its Words", ({ Then, And }) => {
    Then("each imported Ayah's Word count is the number of Words the builder gives that Ayah", () => {
      const counts = (surahs: Imported["surahs"]) => surahs.map((s) => s.ayahs.map((a) => a.words.length));
      expect(counts(rows().surahs)).toEqual(counts(builtExpected().surahs));
    });
    And("Ayah 1:1's Word count is {int}", (_, count: number) => {
      expect(ayahAt(1, 1).words).toHaveLength(count);
    });
  });

  Scenario("Each Surah's Section marks are imported", ({ Then, And }) => {
    Then("each imported Surah's Hizb quarter marks and Ruku marks are the builder's", () => {
      expect(rows().surahs.map((s) => s.sectionMarks)).toEqual(builtExpected().surahs.map((s) => s.sectionMarks));
    });
    And("the imported Surahs hold {int} Hizb quarter marks and {int} Ruku marks in all", (_, hizb: number, rukus: number) => {
      expect(rows().surahs.flatMap((s) => s.sectionMarks.hizbQuarters)).toHaveLength(hizb);
      expect(rows().surahs.flatMap((s) => s.sectionMarks.rukus)).toHaveLength(rukus);
    });
    const asRows = (marks: { ayah: number; label: string }[]) => marks.map((m) => ({ ayah: String(m.ayah), label: m.label }));
    And("imported Surah 63's Hizb quarter marks are exactly", (_, table: { ayah: string; label: string }[]) => {
      expect(asRows(rows().surahs[62].sectionMarks.hizbQuarters)).toEqual(table);
    });
    And("imported Surah 63's Ruku marks are exactly", (_, table: { ayah: string; label: string }[]) => {
      expect(asRows(rows().surahs[62].sectionMarks.rukus)).toEqual(table);
    });
  });

  Scenario("Every Surah's Recitation timings are imported from the source", ({ Then, And }) => {
    const saidInOrder = (ayah: string) => timingSource[ayah].segments.toSorted((x, y) => x[1] - y[1]);
    const recitations = () => rows().recitations;
    Then("the database holds {int} Recitations, Surah 1 first, each by {string}", (_, count: number, reciter: string) => {
      expect(recitations().map((r) => r.surah)).toEqual(Array.from({ length: count }, (_, k) => k + 1));
      for (const r of recitations()) expect(r.reciter).toBe(reciter);
    });
    And("each imported Recitation streams {string}", (_, template: string) => {
      for (const r of recitations()) expect(r.audio).toBe(template.replace("<nnn>", String(r.surah).padStart(3, "0")));
    });
    And("each imported Recitation times every Ayah of its Surah, from the source's start and end of that Ayah", () => {
      for (const surah of rows().surahs) {
        const timed = recitations()[surah.number - 1].ayahs.map(({ number, from, to }) => ({ number, from, to }));
        const expected = surah.ayahs.map(({ number }) => {
          const { timestamp_from, timestamp_to } = timingSource[`${surah.number}:${number}`];
          return { number, from: timestamp_from, to: timestamp_to };
        });
        expect(timed, `Surah ${surah.number}`).toEqual(expected);
      }
    });
    And("each imported Ayah's Word timings are the source's, in the order the Reciter says them", () => {
      for (const r of recitations()) for (const a of r.ayahs) expect(a.words, `${r.surah}:${a.number}`).toEqual(saidInOrder(`${r.surah}:${a.number}`));
    });
    And("the imported Word timings of 2:9 run through Words 1 to 9, then 6 to 10", () => {
      expect(recitations()[1].ayahs[8].words.map(([w]) => w)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 6, 7, 8, 9, 10]);
    });
  });

  Scenario("The import holds exactly what the builder makes of the committed sources", ({ Then, And }) => {
    Then("the Surahs, Ayahs, Words and Section marks read back from the database are the builder's, in order", () => {
      const built = builtExpected().surahs;
      expect(rows().surahs).toHaveLength(built.length);
      for (const [i, s] of rows().surahs.entries()) expect(s, `Surah ${i + 1}`).toEqual(built[i]);
    });
    And("the Recitations read back from the database are the builder's, in order", () => {
      expect(rows().recitations).toEqual(builtExpected().recitations);
    });
  });
});
