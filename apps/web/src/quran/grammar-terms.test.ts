// #275: every tag and value the Word grammar source uses has an English label
// and an Arabic term (@saaliheen/dataset/grammar), never an Urdu one. The
// reader refuses a tag the terms do not know, so reading the committed source
// whole is the first half; each value read is then looked up.

import { describe, expect, it } from "vitest";
import { buildDataset, readWordGrammar } from "@saaliheen/dataset";
import {
  ASPECTS,
  CASES,
  DERIVATIONS,
  FAMILIES,
  FLAGS,
  GENDERS,
  kindTerm,
  MOODS,
  NUMBERS,
  PARTS_OF_SPEECH,
  PERSONS,
  VERB_FORMS,
  type Segment,
  type Term,
} from "@saaliheen/dataset/grammar";
import { DATA } from "../../features/dataset/support.ts";

/** Letters Urdu writes and Arabic does not (ٹ ڈ ڑ ں ھ ہ ۂ ۃ ی ے ۓ ک گ پ چ ژ). */
const URDU = /[ٹڈڑںھہۂۃیےۓکگپچژ]/u;
const ARABIC = /^[ء-ْٰٱ ]+$/u;

/** Each term a Segment's values name, with what it names. */
function termsOf(s: Segment): [string, Term | undefined][] {
  return [
    [`Part of speech ${s.partOfSpeech}`, PARTS_OF_SPEECH[s.partOfSpeech]],
    ...(s.kind === null ? [] : [[`kind ${s.kind}`, kindTerm(s)] as [string, Term | undefined]]),
    ...(s.derivation === null ? [] : [[`derivation ${s.derivation}`, DERIVATIONS[s.derivation]] as [string, Term]]),
    ...(s.case === null ? [] : [[`Case ${s.case}`, CASES[s.case]] as [string, Term]]),
    ...(s.aspect === null ? [] : [[`Aspect ${s.aspect}`, ASPECTS[s.aspect]] as [string, Term]]),
    ...(s.mood === null ? [] : [[`mood ${s.mood}`, MOODS[s.mood]] as [string, Term]]),
    ...(s.person === null ? [] : [[`person ${s.person}`, PERSONS[s.person]] as [string, Term]]),
    ...(s.gender === null ? [] : [[`gender ${s.gender}`, GENDERS[s.gender]] as [string, Term]]),
    ...(s.number === null ? [] : [[`number ${s.number}`, NUMBERS[s.number]] as [string, Term]]),
    ...(s.family === null ? [] : [[`family ${s.family}`, FAMILIES[s.family]] as [string, Term]]),
    ...(s.verbForm === null ? [] : [[`Verb form ${s.verbForm}`, { en: VERB_FORMS[s.verbForm].numeral, ar: VERB_FORMS[s.verbForm].pattern }] as [string, Term]]),
    ...(s.adjective ? [["ADJ", FLAGS.ADJ] as [string, Term]] : []),
    ...(s.indefinite ? [["INDEF", FLAGS.INDEF] as [string, Term]] : []),
    ...(s.passive ? [["PASS", FLAGS.PASS] as [string, Term]] : []),
    ...(s.affix === "prefix" ? [["PREF", FLAGS.PREF] as [string, Term]] : []),
    ...(s.affix === "suffix" ? [["SUFF", FLAGS.SUFF] as [string, Term]] : []),
  ];
}

describe("the Word grammar terms", () => {
  it("give every tag and value the committed source uses an English label and an Arabic term, never Urdu", () => {
    const { dataset } = buildDataset({ sourceDir: DATA });
    const { segments } = readWordGrammar(DATA, dataset.surahs);
    const named = new Map<string, Term | undefined>();
    for (const segment of segments) for (const [what, term] of termsOf(segment)) named.set(what, term);
    expect(named.size).toBeGreaterThan(80);
    for (const [what, term] of named) {
      expect(term, what).toBeDefined();
      expect(term!.en, `${what}'s English label`).toMatch(/^[A-Za-z][A-Za-z' ]*$/);
      // A Harf is never called a particle on screen (CONTEXT.md § Harf).
      expect(term!.en, `${what}'s English label`).not.toMatch(/particle/i);
      expect(term!.ar, `${what}'s Arabic term`).toMatch(ARABIC);
      expect(term!.ar, `${what}'s Arabic term`).not.toMatch(URDU);
    }
  });
});
