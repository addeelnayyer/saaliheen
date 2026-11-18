// #277: what the Word grammar dialog says of each Segment, in order: its Part
// of speech, its finer kind and every feature the Corpus gives it, each in
// English with its Arabic term; a Verb form by numeral and pattern. The
// Segments are the committed source's own lines (2:8:5 and 2:8:7), read
// through the dataset's reader; the expected terms are the issue's.

import { describe, expect, it } from "vitest";
import { buildDataset, readWordGrammar } from "@saaliheen/dataset";
import { segmentTerms, type Segment } from "@saaliheen/dataset/grammar";
import { DATA } from "../../features/dataset/support.ts";

let segments: Segment[] | undefined;
/** Word `location`'s Segments as the committed source gives them. */
function segmentsOf(location: string): Segment[] {
  if (!segments) {
    const { dataset } = buildDataset({ sourceDir: DATA });
    segments = readWordGrammar(DATA, dataset.surahs).segments;
  }
  return segments.filter((s) => s.location === location);
}

const shown = (segment: Segment) => segmentTerms(segment).map(({ en, ar }) => `${en} · ${ar}`);

describe("a Segment's terms", () => {
  it("give a derived Fi'l its Part of speech, Aspect, Verb form by numeral and pattern, and person and number", () => {
    const [stem] = segmentsOf("2:8:5");
    expect(shown(stem)).toEqual(["Fi'l · فِعْل", "Perfect · مَاضِي", "Form IV · أَفْعَلَ", "First person · مُتَكَلِّم", "Plural · جَمْع"]);
  });

  it("give an imperfect Fi'l its mood, and person, gender and number in that order", () => {
    const [stem] = segmentsOf("2:8:4");
    expect(shown(stem)).toEqual([
      "Fi'l · فِعْل",
      "Imperfect · مُضَارِع",
      "Form I · فَعَلَ",
      "Indicative · مَرْفُوع",
      "Third person · غَائِب",
      "Masculine · مُذَكَّر",
      "Singular · مُفْرَد",
    ]);
  });

  it("give a suffix its place in the Word with its kind", () => {
    const [, suffix] = segmentsOf("2:8:5");
    expect(shown(suffix)).toEqual(["Ism · اِسْم", "Suffix · لَاحِقَة", "Pronoun · ضَمِير", "First person · مُتَكَلِّم", "Plural · جَمْع"]);
  });

  it("give each prefix of وَبِٱلْيَوْمِ its kind, and its stem its gender and Case", () => {
    expect(segmentsOf("2:8:7").map(shown)).toEqual([
      ["Harf · حَرْف", "Prefix · سَابِقَة", "Conjunction · حَرْف عَطْف"],
      ["Harf · حَرْف", "Prefix · سَابِقَة", "Preposition · حَرْف جَرّ"],
      ["Harf · حَرْف", "Prefix · سَابِقَة", "Definite article · أَدَاة تَعْرِيف"],
      ["Ism · اِسْم", "Genitive · مَجْرُور", "Masculine · مُذَكَّر"],
    ]);
  });

  it("give a participle its derivation, Verb form, Case, gender and number", () => {
    const [, stem] = segmentsOf("2:8:11");
    expect(shown(stem)).toEqual([
      "Ism · اِسْم",
      "Active participle · اِسْم فَاعِل",
      "Form IV · أَفْعَلَ",
      "Genitive · مَجْرُور",
      "Masculine · مُذَكَّر",
      "Plural · جَمْع",
    ]);
  });
});
