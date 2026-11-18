// The Iltifat as the Iltifat pages and /api/v1/iltifat (#139) read them (#138,
// ADR 0016): ./iltifat.ts's reads, kept in Next's data cache under tags, so
// that a page or answer reads Neon once and then the cache until a save
// refreshes it. There is no refresh on a timer. A save of an Iltifat refreshes
// the tags `iltifatTags` gives for its Iltifat direction: the overview's and
// that direction page's. A direction page's entry is cached with the Ayahs
// it shows, read from Neon (#172) with its Iltifat: a few Ayahs per entry,
// not each cited Surah whole.

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { ayahTextsOf, getSurahNow, surahsByNumber, type AyahText } from "../dataset/reader.ts";
import { everyIltifat, ILTIFAT_DIRECTIONS, iltifatCounts, iltifatOfDirection, type Iltifat, type IltifatDirection } from "./iltifat.ts";

/** The tag of the overview's counts. */
export const ILTIFAT_OVERVIEW_TAG = "iltifat-overview";

/** The tag of one Iltifat direction's page. */
export const iltifatDirectionTag = (direction: IltifatDirection) => `iltifat-direction-${direction}`;

/** The tags a save of an Iltifat of `direction` refreshes. */
export const iltifatTags = (direction: IltifatDirection) => [ILTIFAT_OVERVIEW_TAG, iltifatDirectionTag(direction)];

// The data cache can outlive a deployment, and a deployment's content
// migrations may change the Iltifat: each deployment keeps its own entries.
const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? "local";

/** Each Iltifat direction's count, as `iltifatCounts` gives them, cached under the overview's tag. */
export const cachedIltifatCounts = unstable_cache(() => iltifatCounts(), ["iltifat-counts", DEPLOYMENT], {
  tags: [ILTIFAT_OVERVIEW_TAG],
});

/**
 * Every Iltifat, as `everyIltifat` gives them (#139), cached under the
 * overview's tag: every save refreshes that tag, whatever its direction.
 */
export const cachedEveryIltifat = unstable_cache(() => everyIltifat(), ["every-iltifat", DEPLOYMENT], {
  tags: [ILTIFAT_OVERVIEW_TAG],
});

/** An Iltifat's run, as a key: two Iltifat share a direction page's entry when their runs match exactly. */
export const runOf = (iltifat: Pick<Iltifat, "surah" | "ayahFrom" | "ayahTo">) => `${iltifat.surah}:${iltifat.ayahFrom}-${iltifat.ayahTo}`;

/** A run as a direction page shows it: its Surah's Latin name and the run's Ayahs. */
export interface RunText {
  nameLatin: string;
  ayahs: AyahText[];
}

/** A direction page's Iltifat, and each of their runs' text by `runOf`. */
interface Direction {
  list: Iltifat[];
  runs: Record<string, RunText>;
}

/** Every Iltifat of `direction`, and their runs as Neon holds them. */
async function readDirection(direction: IltifatDirection): Promise<Direction> {
  const list = await iltifatOfDirection(direction);
  const surahs = await surahsByNumber(list.map((i) => i.surah), getSurahNow);
  const runs = Object.fromEntries(
    list.map((iltifat) => {
      const surah = surahs.get(iltifat.surah)!;
      const ayahs = ayahTextsOf({ ...surah, ayahs: surah.ayahs.slice(iltifat.ayahFrom - 1, iltifat.ayahTo) });
      return [runOf(iltifat), { nameLatin: surah.nameLatin, ayahs }];
    }),
  );
  return { list, runs };
}

// One cached read per Iltifat direction, made once, and once per render: a page reads its list and its runs.
const BY_DIRECTION = Object.fromEntries(
  ILTIFAT_DIRECTIONS.map((direction) => [
    direction,
    cache(
      unstable_cache(() => readDirection(direction), ["iltifat-direction", direction, DEPLOYMENT], {
        tags: [iltifatDirectionTag(direction)],
      }),
    ),
  ]),
) as Record<IltifatDirection, () => Promise<Direction>>;

/** Every Iltifat of `direction`, as `iltifatOfDirection` gives them, cached under that direction's tag. */
export const cachedIltifatOfDirection = async (direction: IltifatDirection) => (await BY_DIRECTION[direction]()).list;

/** Each run of `direction`'s Iltifat as its page shows it, by `runOf`, cached under that direction's tag with them. */
export const cachedRunsOfDirection = async (direction: IltifatDirection) => (await BY_DIRECTION[direction]()).runs;
