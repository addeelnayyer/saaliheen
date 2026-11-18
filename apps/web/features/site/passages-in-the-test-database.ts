// What the site tests' own Postgres holds of Passages and Phrases (#171): the
// Passage editor reads a Surah's Passages and Phrases from Neon (ADR 0011), so
// the run's database is arranged, once #171's load has filled it, to hold
// Surah 18 deliberately unlike the committed output the readers' pages were
// once built from (../committed-output.ts at 3a52736), so a test can tell the
// two apart. This replaces the GitHub boundary's fake `main` (#44, #100).
//
// Arranged as if another Admin had published once in Surah 18 (a Passage
// revision, base 1, version 2): its 107–108 and 109–110 joined as 107–110, and
// its 99–102 and 103–106 given Phrases. Playwright's global setup arranges it
// (`arrangePassages`); a scenario that publishes puts its Surah back as
// arranged afterwards (`putSurahBack`). Either stores the Surah's content hash
// for the Surah file /data/v1 then serves, as a Publish does (ADR 0046), so the
// manifest names it. Nothing is arranged while the run's
// database has no `passage` table, so the site still builds and serves.

import { Pool } from "pg";
import type { Surah } from "@saaliheen/dataset/types";
import { committedBuiltSurah } from "./committed-output";
import { surahContentHash, withAyahThemes, withPassagesAndPhrases } from "../../src/passages/served-surah";
import { sourceWords } from "./support";
import { filePassages, type FilePassage } from "./steps/passages";
import { filePhrases, type FilePhrase } from "./steps/phrases";
import { testDatabase } from "./test-database";

/** A Passage's Ayahs as the editor names it: `83–88`, or `88` for one Ayah. */
export const written = (p: { ayah_from: number; ayah_till: number }) =>
  p.ayah_from === p.ayah_till ? `${p.ayah_from}` : `${p.ayah_from}–${p.ayah_till}`;

/**
 * `passages` with Surah `surah`'s Passages `upper` and `lower` (next to each
 * other) joined as one, keeping `upper`'s titles.
 */
export function joined(passages: FilePassage[], surah: number, upper: string, lower: string): FilePassage[] {
  const i = passages.findIndex((p) => p.surah_no === surah && written(p) === upper);
  const below = passages[i + 1];
  if (i < 0 || !below || below.surah_no !== surah || written(below) !== lower) {
    throw new Error(`the Passages have no Surah ${surah} Passages ${upper} and ${lower} next to each other`);
  }
  return [...passages.slice(0, i), { ...passages[i], ayah_till: below.ayah_till }, ...passages.slice(i + 2)];
}

/** Neon's Surah 18, as arranged: the committed 107–108 and 109–110 joined as 107–110. */
export const NEON_CHANGE = { surah: 18, upper: "107–108", lower: "109–110", joined: "107–110" } as const;

/** Every Passage the run's database holds once arranged: the committed Passages with NEON_CHANGE. */
export const neonPassages = (): FilePassage[] => joined(filePassages(), NEON_CHANGE.surah, NEON_CHANGE.upper, NEON_CHANGE.lower);

/**
 * The Surah 18 Passages whose Phrases Neon holds and the committed output
 * doesn't (#100): `covered` has every Word in a Phrase, `partly` only its
 * first Ayah. No other Passage editor scenario touches them.
 */
export const NEON_PHRASED = { surah: 18, covered: "99–102", partly: "103–106" } as const;

/** The Version of Surah 18's Passages and Phrases once arranged: one Publish after the load's `seed`. */
export const NEON_VERSION = 2;

/** Surah `surah`'s Word locations in Ayah `ayah`, in reading order, from the sources. */
const wordsOfAyah = (surah: number, ayah: number) =>
  sourceWords(surah)
    .map((w) => w.location)
    .filter((l) => Number(l.split(":")[1]) === ayah);

const surahOf = (p: FilePhrase) => Number(p.first.split(":")[0]);

/**
 * Every Phrase the run's database holds once arranged: the committed Phrases,
 * then Surah 18's `covered` Passage marked as three Phrases (99's first Word to
 * 100's first, the rest of 100, then 101's first Word to 102's last, so Phrases
 * run across Ayah ends both ways) and the `partly` Passage's first Ayah as one
 * Phrase. Every Word location is read from the sources.
 */
export function neonPhrases(): FilePhrase[] {
  const s = NEON_PHRASED.surah;
  const [a99, a100, a101, a102, a103] = [99, 100, 101, 102, 103].map((a) => wordsOfAyah(s, a));
  const added: FilePhrase[] = [
    { first: a99[0], last: a100[0] },
    { first: a100[1], last: a100.at(-1)! },
    { first: a101[0], last: a102.at(-1)! },
    { first: a103[0], last: a103.at(-1)! },
  ];
  if (filePhrases().some((p) => surahOf(p) === s)) throw new Error(`the committed Phrases already have Surah ${s} Phrases; arrange other Passages`);
  return [...filePhrases(), ...added].sort((x, y) => surahOf(x) - surahOf(y));
}

/** Surah `surah`'s file as the dataset build last wrote it, as the import loads it (#172). */
const generatedSurah = (surah: number): Surah => committedBuiltSurah<Surah>(surah);

/** Surah `surah`'s Passages and Phrases as the run's database holds them once arranged: Surah 18 as arranged, any other as loaded. */
function arrangedPassagesAndPhrases(surah: number) {
  const arranged = surah === NEON_CHANGE.surah;
  return {
    passages: (arranged ? neonPassages() : filePassages()).filter((p) => p.surah_no === surah),
    phrases: (arranged ? neonPhrases() : filePhrases()).filter((p) => surahOf(p) === surah),
  };
}

/** Surah `surah`'s file as /data/v1 serves it with `passages`, `phrases` and each Ayah's `themes`. */
function servedWith(surah: number, passages: FilePassage[], phrases: FilePhrase[], themes: string[][]): Surah {
  const served = withPassagesAndPhrases(
    generatedSurah(surah),
    passages.map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur })),
    phrases,
  );
  return withAyahThemes(served, themes);
}

/** Surah `surah`'s file as /data/v1 serves it once the run's database is arranged, each Ayah's Themes being `themes`. */
export function arrangedSurah(surah: number, themes: string[][]): Surah {
  const { passages, phrases } = arrangedPassagesAndPhrases(surah);
  return servedWith(surah, passages, phrases, themes);
}

/** The content hash of Surah `surah`'s file as /data/v1 serves it with `passages`, `phrases` and each Ayah's Themes as `db` holds them. */
async function servedHash(db: Pool, surah: number, passages: FilePassage[], phrases: FilePhrase[]): Promise<string> {
  const { rows } = await db.query<{ ayah: number; theme: string }>(`select ayah, theme from ayah_theme where surah = $1 order by ayah, position`, [surah]);
  const themes: string[][] = [];
  for (const { ayah, theme } of rows) (themes[ayah - 1] ??= []).push(theme);
  return surahContentHash(servedWith(surah, passages, phrases, themes));
}

const pool = () => new Pool({ connectionString: testDatabase(Number(process.env.PORT)).url, max: 1 });

/** Whether the run's database has #171's tables yet. */
async function hasPassageTables(db: Pool) {
  const found = await db.query<{ t: string | null }>(`select to_regclass('public.passage_revision')::text as t`);
  return found.rows[0].t === "passage_revision";
}

/**
 * Put Surah `surah`'s Passages, Phrases and Passage revisions back as arranged
 * (Surah 18) or as loaded (any other Surah), in one transaction: what a
 * scenario's Publish wrote is gone, its version is the arranged one again and
 * its stored content hash that of the Surah file /data/v1 serves with them.
 * Readers' cached pages of the Surah are not refreshed: no publishing scenario
 * reads them afterwards. Does nothing while the tables do not exist.
 */
export async function putSurahBack(surah: number) {
  const db = pool();
  try {
    if (!(await hasPassageTables(db))) return;
    const { passages, phrases } = arrangedPassagesAndPhrases(surah);
    await db.query("begin");
    await db.query(`delete from passage where surah = $1`, [surah]);
    await db.query(`delete from phrase where surah = $1`, [surah]);
    await db.query(`delete from passage_revision where surah = $1 and version > 1`, [surah]);
    for (const p of passages) {
      await db.query(`insert into passage (surah, ayah_from, ayah_till, title_en, title_ur) values ($1, $2, $3, $4, $5)`, [
        surah, p.ayah_from, p.ayah_till, p.title_en, p.title_ur,
      ]);
    }
    for (const p of phrases) await db.query(`insert into phrase (surah, first_word, last_word) values ($1, $2, $3)`, [surah, p.first, p.last]);
    await db.query(`update surah_content_hash set hash = $2 where surah = $1`, [surah, await servedHash(db, surah, passages, phrases)]);
    if (surah === NEON_CHANGE.surah) {
      await db.query(
        `insert into passage_revision (surah, author, created_at, edits, base, version) values ($1, 'site-tests', now(), '[]'::jsonb, 1, $2)`,
        [surah, NEON_VERSION],
      );
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback").catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

/** Playwright's global setup: arrange Surah 18 in the run's database, once #171's load has made the tables. */
export default async function arrangePassages() {
  const db = pool();
  try {
    if (!(await hasPassageTables(db))) {
      console.log("arrange-passages: no `passage_revision` table yet; nothing arranged");
      return;
    }
  } finally {
    await db.end();
  }
  await putSurahBack(NEON_CHANGE.surah);
}
