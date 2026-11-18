// A direction page's entries (#138): its Iltifat, already in Quran order,
// grouped so that Iltifat with the same run share one entry. Runs that merely
// overlap stay apart.

import { runOf } from "@/iltifat/cached";
import type { Iltifat } from "@/iltifat/iltifat";

/** One entry: the Iltifat sharing one run, in Quran order. */
export type Entry = [Iltifat, ...Iltifat[]];

/** `list`'s entries; in Quran order the Iltifat of one run are next to each other, so each entry keeps that order. */
export function entriesOf(list: Iltifat[]): Entry[] {
  return [...Map.groupBy(list, runOf).values()] as Entry[];
}
