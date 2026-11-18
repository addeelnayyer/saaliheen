// How the Iltifat pages name each Iltifat direction (#138): its arrow name,
// the persons a screen reader says for it, and the overview's one-line
// description. The interface is English in both Languages.

import type { IltifatDirection } from "@/iltifat/iltifat";
import type { Side } from "@/iltifat/marked-words";

interface DirectionWords {
  /** As the badge and headings show it: "He → We". */
  name: string;
  /** As a screen reader says the badge: "turns from He to We". */
  said: string;
  description: string;
  /** The person each side of its Marked Words (#143) belongs to: "He" and "We". */
  from: string;
  to: string;
}

export const DIRECTION_WORDS: Record<IltifatDirection, DirectionWords> = {
  "he-to-we": {
    name: "He → We",
    said: "turns from He to We",
    description: "Speech about Allah turns into Allah speaking as We.",
    from: "He",
    to: "We",
  },
  "we-to-he": {
    name: "We → He",
    said: "turns from We to He",
    description: "Allah speaking as We turns into speech about Him.",
    from: "We",
    to: "He",
  },
  "he-to-you": {
    name: "He → You",
    said: "turns from He to You",
    description: "Speech about someone turns into speaking to them directly.",
    from: "He",
    to: "You",
  },
  "you-to-he": {
    name: "You → He",
    said: "turns from You to He",
    description: "Speaking to someone turns into speech about them.",
    from: "You",
    to: "He",
  },
};

/** A side of an Iltifat of `direction` as said and shown: "from He", "to We". */
export const sideWords = (direction: IltifatDirection, side: Side): string => `${side} ${DIRECTION_WORDS[direction][side]}`;

/** Each side's name as a label shows it: "From", "To". */
export const SIDE_NAMES: Record<Side, string> = { from: "From", to: "To" };

/** The same, as the key of its Marked Words shows it: "From He", "To We". */
export const sideLabel = (direction: IltifatDirection, side: Side): string => `${SIDE_NAMES[side]} ${DIRECTION_WORDS[direction][side]}`;
