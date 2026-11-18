// Passages, Passage titles and Phrases, read from Neon (#171, ADR 0011): the
// server-side module every page and file that shows them reads through, never
// the Passages or Phrases file the content migration loaded them from
// (scripts/content/passages.ts). Two reads: one Surah's Passages and Phrases with its version, and
// every Surah's stored content hash; and the write of one Surah's content hash. ./cached.ts keeps each in Next's data
// cache under tags.

import type { Pool } from "pg";
import type { Passage, Phrase } from "@saaliheen/dataset/types";
import { database } from "../database.ts";

/** One Surah's Passages and Phrases as Neon holds them, and its version: its latest Passage revision's. */
export interface SurahPassages {
  version: number;
  /** In Ayah order. */
  passages: Passage[];
  /** In Word location order. */
  phrases: Phrase[];
}

/** A Surah's stored content hash (ADR 0020): the SHA-256 of the Surah file /data/v1 serves for it. */
export interface StoredHash {
  surah: number;
  hash: string;
}

/** What the module reads through: the site's pool unless a caller passes its own. */
type Database = Pick<Pool, "query">;

/** Surah `surah`'s Passages, Phrases and version. */
export async function surahPassages(surah: number, db: Database = database()): Promise<SurahPassages> {
  const [version, passages, phrases] = await Promise.all([
    db.query<{ version: number }>(`select coalesce(max(version), 0)::int as version from passage_revision where surah = $1`, [surah]),
    db.query<Passage>(`select ayah_from as "from", ayah_till as till, title_en as en, title_ur as ur from passage where surah = $1 order by ayah_from`, [surah]),
    db.query<Phrase>(`select first_word as first, last_word as last from phrase where surah = $1
       order by split_part(first_word, ':', 2)::int, split_part(first_word, ':', 3)::int`, [surah]),
  ]);
  return { version: version.rows[0].version, passages: passages.rows, phrases: phrases.rows };
}

/** Every Surah's stored content hash, Surah 1 first. */
export async function storedHashes(db: Database = database()): Promise<StoredHash[]> {
  return (await db.query<StoredHash>(`select surah, hash from surah_content_hash order by surah`)).rows;
}

/** Store `hash` as Surah `surah`'s content hash, in place of any it had. */
export async function storeContentHash(db: Database, surah: number, hash: string) {
  await db.query(`insert into surah_content_hash (surah, hash) values ($1, $2) on conflict (surah) do update set hash = excluded.hash`, [surah, hash]);
}
