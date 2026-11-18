// An Account's Reading places (#71, ADR 0008): the ten most recently read, one
// per Surah, that follow a reader to every device, kept in the Account
// database's "readingPlaces" table as one JSON list per Account, removed with
// the Account. A device brings its Reading places and they merge with the
// Account's by the one rule of @saaliheen/reading-places: for each Surah the
// one read most recently wins, then the ten newest stay. The same merge serves
// a single read, a device that read offline syncing later, and a device's
// whole list on first sign-in.

import type { BetterAuthPlugin } from "better-auth";
import {
  isTimedReadingPlace,
  mergeReadingPlaces,
  parseReadingPlaces,
  writeReadingPlaces,
  type TimedReadingPlace,
} from "@saaliheen/reading-places";
import { accountDatabase } from "./database.ts";

/**
 * The "readingPlaces" table, through Better Auth's schema so `pnpm db:migrate`
 * applies it with the Account tables: one row per Account ("userId", unique),
 * its Reading places as their JSON list, deleted with its "user" row.
 */
export const syncedReadingPlacesSchema = () =>
  ({
    id: "synced-reading-places",
    schema: {
      readingPlaces: {
        fields: {
          userId: { type: "string", required: true, unique: true, references: { model: "user", field: "id", onDelete: "cascade" } },
          places: { type: "string", required: true },
        },
      },
    },
  }) satisfies BetterAuthPlugin;

/**
 * The Reading places a PATCH body brings, `{ "readingPlaces": [...] }`, or
 * undefined when it is not a JSON object with a list there, or any entry is not
 * a Reading place: a Surah that is not one, an Ayah that is not one of its
 * Surah's, or a readAt that is not a finite number.
 */
export function readingPlacesBrought(
  body: unknown,
  ayahCount: (surah: number) => number | undefined,
): TimedReadingPlace[] | undefined {
  const list = (body as { readingPlaces?: unknown } | null)?.readingPlaces;
  const isPlace = (entry: unknown) => isTimedReadingPlace(entry) && entry.ayah <= (ayahCount(entry.surah) ?? 0);
  return Array.isArray(list) && list.every(isPlace) ? (list as TimedReadingPlace[]) : undefined;
}

/** The Account `userId`'s Reading places, newest first. */
export async function readReadingPlaces(userId: string): Promise<TimedReadingPlace[]> {
  const { rows } = await accountDatabase().query<{ places: string }>(
    `select places from "readingPlaces" where "userId" = $1`,
    [userId],
  );
  return parseReadingPlaces(rows[0]?.places);
}

/**
 * Merge `brought` into the Account `userId`'s Reading places and answer them,
 * newest first. The Account's row is locked while it merges, so two devices
 * bringing Reading places at once both count. Bringing none changes nothing.
 */
export async function bringReadingPlaces(userId: string, brought: TimedReadingPlace[]): Promise<TimedReadingPlace[]> {
  if (brought.length === 0) return readReadingPlaces(userId);
  const client = await accountDatabase().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into "readingPlaces" (id, "userId", places) values ($1, $2, '[]') on conflict ("userId") do nothing`,
      [crypto.randomUUID(), userId],
    );
    const { rows } = await client.query<{ places: string }>(
      `select places from "readingPlaces" where "userId" = $1 for update`,
      [userId],
    );
    const stored = rows[0]?.places;
    const merged = mergeReadingPlaces(parseReadingPlaces(stored), brought);
    const written = writeReadingPlaces(merged);
    if (written !== stored) {
      await client.query(`update "readingPlaces" set places = $2 where "userId" = $1`, [userId, written]);
    }
    await client.query("commit");
    return merged;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
