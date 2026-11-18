// What a Publish in a Surah does once its transaction has committed (#171,
// ADR 0020): it refreshes the Surah's Passage tag, so every page and file that
// read its Passages (its page, opening and parts, its Share pages, its
// /data/v1 file, the manifest and the Theme pages holding its Ayahs) is made
// again on its next request, and then, after the answer has gone, asks for the
// Surah's page and every part in Urdu and English, so readers find them
// already made.

import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { ayahWordCounts } from "../dataset/reader.ts";
import { surahAddresses } from "./addresses.ts";
import { passagesTag } from "./cached.ts";

/** How many addresses are asked for at once. */
const AT_ONCE = 4;

/** Ask `origin` for each of `addresses`, AT_ONCE at a time; one that fails is logged and left to its first reader. */
async function warm(origin: string, addresses: string[]): Promise<void> {
  const queue = [...addresses];
  const worker = async () => {
    for (let address = queue.shift(); address !== undefined; address = queue.shift()) {
      try {
        await (await fetch(`${origin}${address}`, { redirect: "manual" })).arrayBuffer();
      } catch (error) {
        console.error(`Warming ${address} after a Publish failed: ${(error as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
}

/** Refresh Surah `surah`'s Passage tag now and, after the answer, warm its page and parts at `origin` (the Publish request's). */
export function refreshSurahPassages(surah: number, origin: string): void {
  revalidateTag(passagesTag(surah), { expire: 0 });
  after(async () => warm(origin, surahAddresses(surah, (await ayahWordCounts(surah))!)));
}
