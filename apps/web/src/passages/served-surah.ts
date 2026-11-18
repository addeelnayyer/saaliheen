// A Surah file as /data/v1 serves it once Passages and Phrases live in Neon
// (#171, ADR 0011): the Surah as the builder gives it (read from Neon since
// #172) with its Passages, its Phrases and
// each Word's Phrase colour taken from the given rows rather than its own, and
// each Ayah's Themes from Neon (#170), key for key the shape the builder
// wrote, so its bytes, and the content hash taken over them, stay the same.
// Pure: the Passage load (scripts/content/passages.ts) hashes with it.

import { checkedPhrases, indexWords, phraseColours } from "@saaliheen/dataset/phrase-rules";
import { publishedHash } from "@saaliheen/dataset/published";
import type { Passage, Phrase, Surah, Word } from "@saaliheen/dataset/types";

/** `word` without a Phrase colour, then with `colour` when it has one: where the builder puts it, last. */
function coloured(word: Word, colour: Word["phraseColour"]): Word {
  const rest: Word = { ...word };
  delete rest.phraseColour;
  return colour ? { ...rest, phraseColour: colour } : rest;
}

/**
 * `surah` carrying `passages` and those of `phrases` in it, in Quran order,
 * each Word of a covered Passage its Phrase colour and no other Word one.
 * Throws, naming the Phrase, when one of its Phrases breaks a Phrase rule.
 */
export function withPassagesAndPhrases(surah: Surah, passages: Passage[], phrases: Phrase[]): Surah {
  const placed = { ...surah, passages };
  const index = indexWords([placed]);
  const sorted = checkedPhrases(index, phrases.filter((p) => Number(p.first.split(":")[0]) === surah.number));
  const colours = phraseColours(sorted, index);
  return {
    ...placed,
    phrases: sorted.map((p) => p.phrase),
    ayahs: surah.ayahs.map((ayah) => ({ ...ayah, words: ayah.words.map((word) => coloured(word, colours.get(word.location))) })),
  };
}

/** `ayahs` with each Ayah's Themes from `themes`, their Surah's, Ayah 1 first, in place of their own. */
export const placeThemes = <A extends { number: number }>(ayahs: A[], themes: string[][]): A[] =>
  ayahs.map((ayah) => ({ ...ayah, themes: themes[ayah.number - 1] ?? [] }));

/** `surah` with each Ayah's Themes from `themes`, Ayah 1 first, in place of its own. */
export const withAyahThemes = (surah: Surah, themes: string[][]): Surah => ({ ...surah, ayahs: placeThemes(surah.ayahs, themes) });

/** A Surah file's content hash (ADR 0020, ADR 0025): the SHA-256, in hex, of the bytes /data/v1 serves for it. */
export const surahContentHash = (surah: Surah): string => publishedHash(surah);

/** The content hash of `surah`'s file as /data/v1 serves it with `passages`, those of `phrases` in it and each Ayah's Themes from `themes`, Ayah 1 first. */
export const servedSurahHash = (surah: Surah, passages: Passage[], phrases: Phrase[], themes: string[][]): string =>
  surahContentHash(withAyahThemes(withPassagesAndPhrases(surah, passages, phrases), themes));
