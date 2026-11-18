// Phrases in the Passage editor (#100): what Phrases mode shows of a Surah's
// Phrases over its Passages, by the dataset's own Phrase rules
// (@saaliheen/dataset/phrase-rules), the same in the browser and on the
// server. Unlike a reader's page, every Passage's Phrases are tinted, covered
// or not, so the Admin sees what is marked; each Passage's progress counts its
// Words in a Phrase. No file, network or browser access.

import { byPassage, checkedPhrases, indexWords, markedWords, phraseColours, type WordIndex } from "@saaliheen/dataset/phrase-rules";
import type { Phrase, PhraseColour } from "@saaliheen/dataset/types";
import type { Passage } from "@/dataset/reader";

/** An Ayah's Words, as much as the Phrase rules read of them. */
export interface AyahLocations {
  number: number;
  words: { location: string }[];
}

/** A Passage's Phrase progress: how many of its Words are in a Phrase, of how many. */
export interface Progress {
  marked: number;
  size: number;
}

/** What Phrases mode shows: each Word's Phrase colour by Word location, and each Passage's progress by its first Ayah. */
export interface PhrasesShown {
  colours: Map<string, PhraseColour>;
  progress: Map<number, Progress>;
}

/** Each of `passages`' progress, by first Ayah, from the Phrases `index` placed. */
function progressOf(surah: number, passages: Passage[], index: WordIndex, grouped: ReturnType<typeof byPassage>): Map<number, Progress> {
  return new Map(
    passages.map((p, i) => {
      const key = `${surah}:${i}`;
      const marked = markedWords(grouped.get(key) ?? []);
      return [p.from, { marked, size: index.passageSizes.get(key) ?? 0 }];
    }),
  );
}

/**
 * What Phrases mode shows of Surah `surah`'s `phrases` over its `passages` and
 * `ayahs`; a problem, naming the Phrase, when a Phrase breaks the rules.
 */
export function phrasesShown(surah: number, passages: Passage[], ayahs: AyahLocations[], phrases: Phrase[]): PhrasesShown | { problem: string } {
  const index = indexWords([{ number: surah, passages, ayahs }]);
  try {
    const sorted = checkedPhrases(index, phrases);
    return { colours: phraseColours(sorted, index, true), progress: progressOf(surah, passages, index, byPassage(sorted)) };
  } catch (e) {
    return { problem: e instanceof Error ? e.message : String(e) };
  }
}

/** A Passage heading's progress: "Phrases ✓" once every Word is in a Phrase, else "Phrases n / N Words". */
export const progressText = ({ marked, size }: Progress) => (marked === size ? "Phrases ✓" : `Phrases ${marked} / ${size} Words`);
