// A Root page's Spelling's Ayahs (#288), as the page and its Spelling parts
// carry them: each Ayah with its Words in both Scripts, its Ayah translation in
// the page's Language only, and which of its Words are the Spelling's, to be
// marked. A Spelling's Ayahs are cut into parts of fifty (spellingParts); a
// Root of fifty occurrences or fewer arrives with every Spelling's one part,
// a larger one with none, each part fetched from
// /parts/<lang>/roots/<Root id>/<Lemma>/<Spelling>/<part>.json when it is
// wanted. The Quran is read from Neon.

import type { Language, Root, Script } from "@saaliheen/dataset/types";
import { getSpellingPart } from "../dataset/reader.ts";

/** An Ayah as a Root page lists it under a Spelling. */
export interface SpellingPartAyah {
  surah: number;
  number: number;
  indopakEnd: string;
  /** In the page's Language only. */
  translation: string;
  words: ({ location: string } & Record<Script, string>)[];
  /** The Word locations of the Spelling's Words in this Ayah, in order: one at least. */
  marked: string[];
}

/** Part `part` of Spelling `spelling` of Lemma `lemma` of `root` (all from 1) in `lang`; undefined when there is no such part. */
export async function spellingPartOf(root: Root, lang: Language, lemma: number, spelling: number, part: number): Promise<SpellingPartAyah[] | undefined> {
  const ayahs = await getSpellingPart(root, lemma, spelling, part);
  if (!ayahs) return undefined;
  const ours = new Set(root.lemmas[lemma - 1].spellings[spelling - 1].locations);
  return ayahs.map(({ surah, number, indopakEnd, translation, words }) => ({
    surah,
    number,
    indopakEnd,
    translation: translation[lang],
    words,
    marked: words.filter((w) => ours.has(w.location)).map((w) => w.location),
  }));
}
