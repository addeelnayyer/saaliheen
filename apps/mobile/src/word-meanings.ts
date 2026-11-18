// Hide Word meanings on a Surah's screen (#247, as on the website, #245):
// while the switch is on, every Word card leaves its Word meaning off, and a
// tap on a Word card, while no Recitation plays, shows that card's meaning, a
// second tap hiding it again. While a Recitation plays, a tap carries it on
// from that Word, as it does with the switch off, and reveals nothing. The
// Word meanings revealed belong to one Surah screen: it opens with none, so
// leaving the Surah hides them again. Root tags, Ayah translations and the
// Tafsir are not this module's. It imports nothing from React Native, so the
// app's scenarios (features/) run it in Node.

/** The Word locations whose meanings the reader revealed on a Surah screen. */
export type RevealedMeanings = ReadonlySet<string>;

/** What a Surah screen opens with: no Word meaning revealed. */
export const NONE_REVEALED: RevealedMeanings = new Set();

/** Whether the Word card at `location` shows its Word meaning: always while meanings are not `hidden`, else once revealed. */
export const showsMeaning = (hidden: boolean, revealed: RevealedMeanings, location: string) => !hidden || revealed.has(location);

/**
 * A tap on the Word card at `location`: while a Recitation `plays`, it carries
 * the Recitation on from that Word (`tapWord`) and reveals nothing; else, while
 * meanings are `hidden`, it shows that card's meaning, or hides it once shown.
 * Answers the Word meanings revealed after the tap.
 */
export function tapWordCard(
  location: string,
  { hidden, revealed, plays, tapWord }: { hidden: boolean; revealed: RevealedMeanings; plays: boolean; tapWord: (location: string) => void },
): RevealedMeanings {
  if (plays) {
    tapWord(location);
    return revealed;
  }
  if (!hidden) return revealed;
  const next = new Set(revealed);
  if (!next.delete(location)) next.add(location);
  return next;
}
