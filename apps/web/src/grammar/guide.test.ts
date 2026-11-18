// #280: the Grammar guide explains every label a Grammar line can show. Each
// Word of the committed Word grammar source is given its Grammar line as a
// Grammar page gives it, and each label on that line (an Aspect and a Verb
// form are two) must be one of the guide's entries, with the same Arabic term
// beside it. The three Cases and the Verb forms' patterns are held to the
// issue's and the grammarians' own.

import { describe, expect, it } from "vitest";
import { buildDataset, readWordGrammar } from "@saaliheen/dataset";
import { grammarLine, type Segment } from "@saaliheen/dataset/grammar";
import { DATA } from "../../features/dataset/support.ts";
import { GRAMMAR_GUIDE } from "./guide";

const entries = GRAMMAR_GUIDE.flatMap((section) => section.entries.map((entry) => ({ ...entry, section: section.id })));
const sectionOf = (id: string) => GRAMMAR_GUIDE.find((s) => s.id === id)!;

describe("the Grammar guide", () => {
  it("explains, with its Arabic term, every label the committed source's Grammar lines show", () => {
    const { dataset } = buildDataset({ sourceDir: DATA });
    const { segments } = readWordGrammar(DATA, dataset.surahs);
    const words = new Map<string, Segment[]>();
    for (const segment of segments) {
      const word = words.get(segment.location);
      if (word) word.push(segment);
      else words.set(segment.location, [segment]);
    }
    const labels = new Map<string, string | undefined>();
    for (const segs of words.values()) {
      const line = grammarLine(segs)!;
      for (const en of line.en.split(" · ")) labels.set(en, line.ar);
    }
    expect(labels.size).toBeGreaterThan(40);
    for (const [en, ar] of labels) {
      const entry = entries.find((e) => e.en === en);
      expect(entry, `the guide's entry for "${en}"`).toBeDefined();
      if (ar) expect(entry!.ar, `"${en}"'s Arabic term`).toBe(ar);
      expect(entry!.meaning, `what "${en}" means`).not.toBe("");
    }
  });

  it("gives the three Parts of speech, each with what its Grammar line says", () => {
    expect(sectionOf("colours").entries.map((e) => [e.en, e.ar, e.partOfSpeech])).toEqual([
      ["Ism", "اِسْم", "N"],
      ["Fi'l", "فِعْل", "V"],
      ["Harf", "حَرْف", "P"],
    ]);
  });

  it("gives the three Cases", () => {
    expect(sectionOf("cases").entries.map((e) => [e.en, e.ar])).toEqual([
      ["Nominative", "مَرْفُوع"],
      ["Accusative", "مَنْصُوب"],
      ["Genitive", "مَجْرُور"],
    ]);
  });

  it("gives every Verb form, Form I to Form XII, by its pattern", () => {
    const forms = sectionOf("verb-forms").entries;
    expect(forms.map((e) => e.en)).toEqual(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"].map((n) => `Form ${n}`));
    expect(forms[0].ar).toBe("فَعَلَ");
    expect(forms[1].ar).toBe("فَعَّلَ");
    expect(forms[9].ar).toBe("اِسْتَفْعَلَ");
    for (const form of forms) expect(form.meaning, form.en).not.toBe("");
  });

  it("never calls a Harf a particle", () => {
    for (const e of entries) expect(`${e.en} ${e.meaning}`, e.en).not.toMatch(/particle/i);
  });
});
