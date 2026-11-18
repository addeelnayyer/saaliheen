// Iltifat chips on a Surah's Ayahs (#140): the Surah page and the Surah parts
// give each Ayah where an Iltifat is cited a chip for it, so the server render
// and the Surah opened in parts in the browser draw the same ones (ADR 0018).
// Read as Allah references are (src/allah-references/mark.ts): through the
// cached Iltifat module under the overview's tag (ADR 0016), so a save
// refreshes the chips with the Iltifat pages, and a Surah is built without
// them when Neon cannot answer, the next revalidation filling them in.

import type { IltifatChip, PartAyah } from "@saaliheen/dataset/types";
import { cachedEveryIltifat } from "./cached.ts";
import type { Iltifat } from "./iltifat.ts";

/** How long a read may take before the Surah is drawn without its Iltifat chips. */
const READ_TIMEOUT_MS = 5_000;

const timeout = () => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), READ_TIMEOUT_MS).unref());

let warned = false;
/** Log `message` once per server process: an unreachable database fails every Surah's read alike. */
function warnOnce(message: string) {
  if (!warned) console.error(message);
  warned = true;
}

/** `every`'s chips of Surah `surah`, by the Ayah each Iltifat is cited at, in Quran order. */
function chipsByAyah(every: Iltifat[], surah: number): Map<number, IltifatChip[]> {
  const byAyah = new Map<number, IltifatChip[]>();
  for (const { id, direction, disputed, citedAyah, surah: s } of every) {
    if (s !== surah) continue;
    const chips = byAyah.get(citedAyah) ?? [];
    chips.push({ id, direction, disputed });
    byAyah.set(citedAyah, chips);
  }
  return byAyah;
}

/** `ayahs` with, on each Ayah an Iltifat of `chips` is cited at, those Iltifat's chips. */
function markIltifat(ayahs: PartAyah[], chips: Map<number, IltifatChip[]>): PartAyah[] {
  if (chips.size === 0) return ayahs;
  return ayahs.map((ayah) => (chips.has(ayah.number) ? { ...ayah, iltifat: chips.get(ayah.number) } : ayah));
}

/** Every Iltifat as the module gives them now; none when the database is not configured or cannot answer in time. */
async function readOrNone(): Promise<Iltifat[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await Promise.race([cachedEveryIltifat(), timeout()]);
  } catch (error) {
    warnOnce(`Iltifat unread, Surahs drawn without Iltifat chips: ${(error as Error).message}`);
    return [];
  }
}

/** Surah `surah`'s `ayahs` with the Iltifat chips of each Iltifat cited at them, as the Iltifat module gives them now. */
export async function withIltifatChips(surah: number, ayahs: PartAyah[]): Promise<PartAyah[]> {
  return markIltifat(ayahs, chipsByAyah(await readOrNone(), surah));
}
