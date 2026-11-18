// The Marked Words an Iltifat page tints (#143): those of an entry's Iltifat
// that count as marked, both sides holding a Word; an Iltifat with one side
// marked is shown plain. Each Word with its side and what a screen reader
// hears of it ("from He").

import { isMarkedIltifat, type Iltifat } from "@/iltifat/iltifat";
import type { Mark, Marks } from "../ayah-list";
import { sideWords } from "./directions";

/** By Word location, the Marked Words of `iltifat` that a page tints; the first Iltifat's side wins a Word two share. */
export function marksOf(iltifat: readonly Iltifat[]): Marks {
  const marks = new Map<string, Mark>();
  for (const { direction, markedWords } of iltifat.filter(isMarkedIltifat)) {
    for (const { location, side } of markedWords) if (!marks.has(location)) marks.set(location, { tint: side, said: sideWords(direction, side) });
  }
  return marks;
}
