// A Surah's Allah references read fresh from the Account database on each
// request, for the public endpoint (#150, ADR 0028): uncached, so an API
// client sees a change at once, and refused, never "none", when the database
// is not configured, cannot be reached or does not answer in time, so a client
// keeps the Allah references it already has.

import { accountDatabase } from "../account/database.ts";
import { readStored, type SurahAllahReferences } from "./stored.ts";

/** How long a read may take before the database counts as unreachable. */
const READ_TIMEOUT_MS = 5_000;

/** Why a fresh read could not be made. */
export class AllahReferencesUnread extends Error {}

/** Surah `surah`'s Allah references and version as stored now; AllahReferencesUnread when the database is not configured or cannot answer in time. */
export async function readFresh(surah: number): Promise<SurahAllahReferences> {
  if (!process.env.DATABASE_URL) throw new AllahReferencesUnread("the database is not configured");
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([readStored(accountDatabase(), surah), timeout]);
  } catch (error) {
    throw new AllahReferencesUnread((error as Error).message);
  } finally {
    clearTimeout(timer);
  }
}
