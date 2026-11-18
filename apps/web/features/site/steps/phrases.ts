// The Phrases file (#99), read as the tests' source of every
// Phrase: never typed into a feature or a step. With the Passages file it says
// which Passages are covered and which Phrase colour each of their Words takes.
// It is read as last committed before Phrases moved into Neon (#171,
// ../committed-output.ts), so it outlives the file's deletion.

import { expect } from "@playwright/test";
import { committedPhrases, type CommittedPhrase } from "../committed-output";
import { sourceWords } from "../support";
import { passagesOf, type FilePassage } from "./passages";

/** A Phrase as the Phrases file writes it: its first and last Word location. */
export type FilePhrase = CommittedPhrase;

export const filePhrases = (): FilePhrase[] => committedPhrases();

const surahOfLocation = (location: string) => Number(location.split(":")[0]);
const ayahOfLocation = (location: string) => Number(location.split(":")[1]);

/** A Word of a Surah and where the Phrases put it. */
export interface PhrasedWord {
  location: string;
  ayah: number;
  passage: FilePassage;
  /** Whether every Word of its Passage is in a Phrase. */
  covered: boolean;
  /** Its Phrase's place among its Passage's Phrases, from 0; undefined when in no Phrase. */
  phrase?: number;
}

/**
 * Every Word of Surah `surah`, in reading order, with its Passage and its
 * Phrase's place in it: by the committed Phrases and Passages files unless
 * others are given (what Neon holds, #171).
 */
export function phrasedWords(surah: number, phrases: FilePhrase[] = filePhrases(), passages: FilePassage[] = passagesOf(surah)): PhrasedWord[] {
  const words = sourceWords(surah).map((w) => w.location);
  const at = new Map(words.map((l, i) => [l, i]));
  const phraseOf = new Map<string, FilePhrase>();
  for (const phrase of phrases.filter((p) => surahOfLocation(p.first) === surah)) {
    const [i, j] = [at.get(phrase.first), at.get(phrase.last)];
    expect(i !== undefined && j !== undefined && i <= j, `the Phrase ${phrase.first}–${phrase.last} names Words of Surah ${surah}`).toBe(true);
    for (const l of words.slice(i, j! + 1)) phraseOf.set(l, phrase);
  }
  const result: PhrasedWord[] = [];
  for (const passage of passages.filter((p) => p.surah_no === surah)) {
    const inPassage = words.filter((l) => passage.ayah_from <= ayahOfLocation(l) && ayahOfLocation(l) <= passage.ayah_till);
    const covered = inPassage.every((l) => phraseOf.has(l));
    const order: FilePhrase[] = [];
    for (const l of inPassage) {
      const phrase = phraseOf.get(l);
      if (phrase && !order.includes(phrase)) order.push(phrase);
      result.push({ location: l, ayah: ayahOfLocation(l), passage, covered, phrase: phrase && order.indexOf(phrase) });
    }
  }
  return result;
}

/** The Phrase colour a Word of a covered Passage takes, "a" or "b"; undefined for any other Word. */
export const expectedColour = (w: PhrasedWord) => (w.covered && w.phrase !== undefined ? (w.phrase % 2 === 0 ? "a" : "b") : undefined);

/** A Passage written as its Surah and Ayahs, e.g. 1:1–4. */
export const passageName = (p: FilePassage) => `${p.surah_no}:${p.ayah_from}–${p.ayah_till}`;
