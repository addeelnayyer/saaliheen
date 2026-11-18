// The server-side data module for Allah references (#147, ADR 0011, ADR 0012):
// a Surah's Allah references and their version, read from the Account
// database and cached under the Surah's own tag (allahReferencesTag), which a
// publish revalidates so the Surah page and its parts pick the change up with
// no deploy. The cache is keyed on the build (BUILD_TIME, next.config.ts), so a
// deploy after a seed reads it afresh. Pages are generated ahead: when the
// database is not configured or cannot be reached, a Surah has no Allah
// references rather than failing its pages, and the next revalidation fills
// them in.

import { unstable_cache } from "next/cache";
import { accountDatabase } from "../account/database.ts";
import { readStored, type SurahAllahReferences } from "./stored.ts";

/** The cache tag of Surah `surah`'s Allah references, which a publish revalidates. */
export const allahReferencesTag = (surah: number) => `allah-references:${surah}`;

/** How long a read may take before the Surah is drawn without its Allah references. */
const READ_TIMEOUT_MS = 5_000;

const NONE: SurahAllahReferences = { locations: [], version: 0 };

const timeout = () => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), READ_TIMEOUT_MS).unref());

let warned = false;
/** Log `message` once per server process: an unreachable database fails every Surah's read alike. */
function warnOnce(message: string) {
  if (!warned) console.error(message);
  warned = true;
}

/** The build this server runs, which keys the cache so a deploy after a seed reads afresh. */
const BUILD_TIME = process.env.BUILD_TIME ?? "";

/** Surah `surah`'s read, cached under its tag and the build. */
const cachedRead = (surah: number) =>
  unstable_cache(() => readStored(accountDatabase(), surah), ["allah-references", String(surah), BUILD_TIME], { tags: [allahReferencesTag(surah)] });

/** Surah `surah`'s Allah references and version, cached; none when the database cannot answer in time. */
async function readOrNone(surah: number): Promise<SurahAllahReferences> {
  try {
    return await Promise.race([cachedRead(surah)(), timeout()]);
  } catch (error) {
    warnOnce(`Allah references unread (Surah ${surah} first), Surahs drawn without them: ${(error as Error).message}`);
    return NONE;
  }
}

/** Surah `surah`'s Allah references and version, cached under its tag; none when the database is not configured or cannot answer. */
export async function forSurah(surah: number): Promise<SurahAllahReferences> {
  if (!process.env.DATABASE_URL) return NONE;
  return readOrNone(surah);
}
