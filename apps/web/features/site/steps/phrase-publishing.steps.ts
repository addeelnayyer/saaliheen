// Steps for #100 and #171: publishing Phrase edits from the Passage editor,
// with or without Passage edits, as one transaction in Neon (ADR 0011). What a
// Publish wrote is read straight from the run's Postgres (../test-database.ts),
// which the production build reads as DATABASE_URL, and from what a client of
// /data/v1 or a reader of the Surah's page gets. "Another Admin's Publish" of a
// Phrase is written straight into Postgres. Expected Phrases are what Neon
// holds (../passages-in-the-test-database.ts) with the scenario's changes
// (phrase-marking.steps.ts); expected Passages are what Neon holds; none is typed.

import { expect, type Page } from "@playwright/test";
import { putSurahBack, written } from "../passages-in-the-test-database";
import type { Language } from "../support";
import { Then, When, type Reader, type Reading } from "./fixtures";
import { expectedColour, phrasedWords, type FilePhrase, type PhrasedWord } from "./phrases";
import { phraseAt, phrasesWith } from "./phrase-marking.steps";
import { drawnCards } from "./phrases-mode.steps";
import { expectTable, neonDatabase, passageRows, surahOf } from "./passage-editor.steps";

// ------------------------------------------------------------- Phrases, in order

/** A Word location's place in Quran order: Surah, Ayah, Word. */
const place = (location: string) => location.split(":").map(Number);
const quranOrder = (x: FilePhrase, y: FilePhrase) => {
  const [a, b] = [place(x.first), place(y.first)];
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
};
const named = (phrases: FilePhrase[]) => [...phrases].sort(quranOrder).map((p) => `${p.first}–${p.last}`);

/** Neon's Phrases of Surah `surah` with `changes` ("X" added, "X" removed, "X" in place of "Y"), in Quran order. */
const expectedPhrases = (reading: Reading, surah: number, changes?: string) =>
  phrasesWith(reading, changes).filter((p) => place(p.first)[0] === surah);

/** Surah `surah`'s Phrases as the `phrase` table holds them. */
async function phraseRows(surah: number): Promise<FilePhrase[]> {
  await expectTable("phrase");
  const { rows } = await neonDatabase().query<{ first_word: string; last_word: string }>(
    `select first_word, last_word from phrase where surah = $1`,
    [surah],
  );
  return rows.map((r) => ({ first: r.first_word, last: r.last_word }));
}

// ------------------------------------------------------------ what Neon holds

Then(/^Neon holds Surah (\d+)'s Phrases as Neon's(?:, with (.+))?$/, async ({ reading }, surahText: string, changes?: string) => {
  const surah = Number(surahText);
  expect(surah, "the Surah the editor opened").toBe(surahOf(reading));
  expect(named(await phraseRows(surah)), `the run's database's Surah ${surah} Phrases, in Quran order`).toEqual(
    named(expectedPhrases(reading, surah, changes)),
  );
});

// ------------------------------------------------------------- another Admin

/** Who "another Publish" names as its author. */
const ANOTHER_ADMIN = "another-admin-of-issue-171";

/**
 * Another Admin's Publish of one Phrase, as one is written (#171): the Phrase
 * in the `phrase` table, and a Passage revision made on the Surah's current
 * version, one version on. Written straight into Postgres, so it refreshes no
 * page. The Surah is put back when the scenario ends.
 */
When(
  "another Admin publishes the Phrase {word} in Surah {int}, moving its version on",
  async ({ reader, reading }, ref: string, surah: number) => {
    expect(surah, "the Surah the editor opened").toBe(surahOf(reading));
    const phrase = phraseAt(reading, ref);
    await expectTable("passage_revision");
    await expectTable("phrase");
    reader.cleanups.push(() => putSurahBack(surah));
    const client = await neonDatabase().connect();
    try {
      await client.query("begin");
      const { rows } = await client.query<{ version: number | null }>(`select max(version) as version from passage_revision where surah = $1`, [surah]);
      const base = Number(rows[0]?.version ?? 0);
      await client.query(`insert into phrase (surah, first_word, last_word) values ($1, $2, $3)`, [surah, phrase.first, phrase.last]);
      await client.query(
        `insert into passage_revision (surah, author, created_at, edits, base, version) values ($1, $2, now(), $3::jsonb, $4, $5)`,
        [surah, ANOTHER_ADMIN, JSON.stringify([{ kind: "mark", first: phrase.first, last: phrase.last }]), base, base + 1],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  },
);

// ------------------------------------------------------ what clients get

/** The Words of Surah `surah` placed by `phrases` and what Neon holds of its Passages now. */
async function wordsNow(surah: number, phrases: FilePhrase[]): Promise<PhrasedWord[]> {
  return phrasedWords(surah, phrases, await passageRows(surah));
}

interface SurahFile {
  phrases?: FilePhrase[];
  ayahs: { words: { location: string; phraseColour?: unknown }[] }[];
}

Then(
  /^a client fetching "([^"]+)" gets Surah (\d+)'s Phrases as Neon's, with (.+), and Phrase colours on the Words of its covered Passages only, none on (\S+)$/,
  async ({ reader, reading }, address: string, surahText: string, changes: string, bare: string) => {
    const surah = Number(surahText);
    expect(address, "the Surah file of the Surah the editor opened").toBe(`/data/v1/surahs/${surah}.json`);
    const phrases = expectedPhrases(reading, surah, changes);
    const words = await wordsNow(surah, phrases);
    const inBare = words.filter((w) => written(w.passage) === bare);
    expect(inBare.length, `Surah ${surah} has a Passage ${bare}`).toBeGreaterThan(0);
    expect(inBare.some((w) => w.phrase !== undefined), `${bare} has Phrases`).toBe(true);
    expect(inBare.every((w) => w.covered), `${bare} is covered`).toBe(false);
    const want = words.map((w) => [w.location, expectedColour(w) ?? null] as const);
    expect(want.some(([, colour]) => colour), `some Word of Surah ${surah} takes a Phrase colour`).toBe(true);
    // Within moments of the Publish, with no deploy.
    await expect
      .poll(
        async () => {
          const res = await reader.page.request.get(new URL(address, reader.baseURL).toString());
          if (res.status() !== 200) return { status: res.status() };
          const file = (await res.json()) as SurahFile;
          return {
            status: 200,
            phrases: named(file.phrases ?? []),
            colours: file.ayahs.flatMap((a) => a.words).map((w) => [w.location, (w.phraseColour as string | undefined) ?? null] as const),
          };
        },
        { message: `${address}: Surah ${surah}'s Phrases, and each Word's Phrase colour, only on Words of covered Passages`, timeout: 30_000 },
      )
      .toEqual({ status: 200, phrases: named(phrases), colours: want });
  },
);

/** What is wrong with the tints drawn on a reader's page for `words`: [] when nothing is. */
async function tintProblems(page: Page, words: PhrasedWord[], tinted: boolean): Promise<string[]> {
  const drawn = new Map((await drawnCards(page, null)).map((c) => [c.location, c]));
  const missing = words.filter((w) => !drawn.has(w.location)).map((w) => `${w.location} is not shown`);
  if (missing.length) return missing.slice(0, 3);
  const paper = drawn.get(words[0].location)!.paper;
  if (!tinted) return words.filter((w) => drawn.get(w.location)!.tint !== paper).map((w) => `${w.location} is drawn on ${drawn.get(w.location)!.tint}, not the paper ${paper}`);
  const tintOf = (colour: "a" | "b") => drawn.get(words.find((w) => expectedColour(w) === colour)!.location)!.tint;
  const seen = { a: tintOf("a"), b: tintOf("b") };
  const problems: string[] = [];
  if (seen.a === paper) problems.push(`tint A is the page's paper ${paper}`);
  if (seen.b === paper) problems.push(`tint B is the page's paper ${paper}`);
  if (seen.a === seen.b) problems.push(`tint A and tint B are both ${seen.a}`);
  for (const w of words) {
    const want = seen[expectedColour(w)!];
    const got = drawn.get(w.location)!.tint;
    if (got !== want) problems.push(`${w.location} is drawn on ${got}, not tint ${expectedColour(w)!.toUpperCase()} (${want})`);
  }
  return problems;
}

/** Open `address` as a reader would, in a browser of their own and not signed in, and reload it. */
async function openAsReader(reader: Reader, address: string): Promise<{ page: Page; lang: Language; surah: number }> {
  const m = address.match(/^\/(en|ur)\/(\d+)$/);
  if (!m) throw new Error(`"${address}" is no Surah page`);
  const context = await reader.newContext();
  const page = await context.newPage();
  const res = await page.goto(address);
  expect(res?.status(), `${address} answers`).toBe(200);
  return { page, lang: m[1] as Language, surah: Number(m[2]) };
}

Then(
  /^a reader opening "([^"]+)" sees no Word of Passage (\S+) tinted$/,
  async ({ reader, reading }, address: string, range: string) => {
    const { page, surah } = await openAsReader(reader, address);
    const words = (await wordsNow(surah, expectedPhrases(reading, surah))).filter((w) => written(w.passage) === range);
    expect(words.length, `Surah ${surah} has a Passage ${range}`).toBeGreaterThan(0);
    expect(words.every((w) => w.covered), `Neon's Phrases cover ${range}`).toBe(false);
    await expect.poll(() => tintProblems(page, words, false), { message: `${address}: Passage ${range}'s Words are drawn on the page's paper` }).toEqual([]);
    await page.context().close();
  },
);

Then(
  /^a reader opening "([^"]+)" sees Passage (\S+)'s Words take tint A and tint B Phrase by Phrase as Neon's Phrases say, with (.+)$/,
  async ({ reader, reading }, address: string, range: string, changes: string) => {
    const { page, surah } = await openAsReader(reader, address);
    expect(surah, "the Surah page is of the Surah the editor published").toBe(surahOf(reading));
    const words = (await wordsNow(surah, expectedPhrases(reading, surah, changes))).filter((w) => written(w.passage) === range);
    expect(words.length, `Surah ${surah} has a Passage ${range}`).toBeGreaterThan(0);
    expect(words.every((w) => w.covered), `Neon's Phrases, with ${changes}, cover ${range}`).toBe(true);
    expect(words.some((w) => expectedColour(w) === "b"), `${range} has more than one Phrase`).toBe(true);
    // Within moments of the Publish, with no deploy: on the reader's next load.
    await expect
      .poll(
        async () => {
          await page.reload();
          return tintProblems(page, words, true);
        },
        { message: `${address}: Passage ${range}'s Words take tint A and tint B Phrase by Phrase, starting on tint A`, timeout: 30_000, intervals: [1_000, 2_000, 5_000] },
      )
      .toEqual([]);
    await page.context().close();
  },
);
