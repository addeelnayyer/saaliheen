// #275 AC-1, AC-2 and #276 AC-1, AC-2: each Word's Segments, as the import writes them from the
// Quranic Arabic Corpus, read back through the site's own read of Neon
// (src/quran/word-grammar.ts) and held to the source's own lines, read here
// apart from the dataset's reader: each Segment's tags are given back from
// what is stored and compared with the line's.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { expect } from "vitest";
import { WORD_GRAMMAR_SOURCE as SOURCE } from "@saaliheen/dataset";
import { FAMILIES, type Segment } from "@saaliheen/dataset/grammar";
import { readSurahGrammar } from "../../src/quran/word-grammar.ts";
import { compareLocations } from "../dataset/root-support.ts";
import { DATA, UTHMANI, isAyahEnd, readSource, removeSourceCopies, sourceCopy, type TextSource } from "../dataset/support.ts";
import { dropDatabase, expectSucceeded, importedCopy, query, runImport, storedSourcesHash, type ImportRun } from "./import-support.ts";

const feature = await loadFeature("./word-grammar-import.feature");

const sourceText = () => fs.readFileSync(path.join(DATA, SOURCE), "utf8");

/** One of the source's Segment lines: its Corpus location, text, Part of speech and tags, as written. */
interface Line {
  word: string;
  position: number;
  uthmani: string;
  partOfSpeech: string;
  tags: string[];
}

/** The source's Segment lines, skipping its notice; each Corpus Word's in order, by Corpus Word location. */
function sourceLines(text = sourceText()): Map<string, Line[]> {
  const words = new Map<string, Line[]>();
  for (const line of text.split("\n")) {
    if (line === "" || line.startsWith("#")) continue;
    const [at, uthmani, partOfSpeech, tags] = line.split("\t");
    const word = at.split(":").slice(0, 3).join(":");
    const entry = { word, position: Number(at.split(":")[3]), uthmani, partOfSpeech, tags: tags.split("|").filter((t) => t !== "") };
    words.set(word, [...(words.get(word) ?? []), entry]);
  }
  return words;
}

const withoutRootOrLemma = (tags: string[]) => tags.filter((t) => !t.startsWith("ROOT:") && !t.startsWith("LEM:")).sort();

/** The tags a stored Segment gives back, in the source's own spelling, sorted. */
function tagsOf(s: Segment): string[] {
  const pgn = `${s.person ?? ""}${s.gender ?? ""}${s.number ?? ""}`;
  return [
    s.kind,
    s.derivation,
    s.adjective && "ADJ",
    s.case,
    s.indefinite && "INDEF",
    pgn,
    s.aspect,
    s.verbForm && `VF:${s.verbForm}`,
    s.mood && `MOOD:${s.mood}`,
    s.passive && "PASS",
    s.family && `FAM:${FAMILIES[s.family].corpus}`,
    s.affix === "prefix" && "PREF",
    s.affix === "suffix" && "SUFF",
  ]
    .filter((t): t is string => typeof t === "string" && t !== "")
    .sort();
}

/** A stored Segment as the source's line would write it, without its Root and Lemma. */
const asLine = (s: Segment) => ({ position: s.position, uthmani: s.uthmani, partOfSpeech: s.partOfSpeech, tags: tagsOf(s) });
const lineWithout = (l: Line) => ({ position: l.position, uthmani: l.uthmani, partOfSpeech: l.partOfSpeech, tags: withoutRootOrLemma(l.tags) });

/** A Word's Arabic letters alone, which the Corpus and QPC Hafs write alike but for their marks. */
const letters = (text: string) => [...text].filter((c) => c >= "ء" && c <= "ي").join("");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, AfterAllScenarios, BeforeEachScenario, AfterEachScenario }) => {
  const lines = sourceLines();
  let url: string;
  let pool: Pool | undefined;
  let scenario = 0;
  let run: ImportRun;
  let copy: string;
  let hashBefore: string | undefined;
  const db = () => (pool ??= new Pool({ connectionString: url, max: 4 }));
  const name = () => `word_grammar_import_${scenario}`;
  const surahOf = (location: string) => Number(location.split(":")[0]);
  const storedAt = async (location: string) => (await readSurahGrammar(surahOf(location), db()))[location] ?? [];

  BeforeEachScenario(() => {
    scenario++;
  });
  AfterEachScenario(async () => {
    await pool?.end();
    pool = undefined;
    await dropDatabase(name());
  });
  AfterAllScenarios(() => removeSourceCopies());

  Background(({ Given }) => {
    Given("a Postgres holding the import of the committed sources", async () => {
      url = await importedCopy(name());
    });
  });

  const DESCRIBED: Record<string, (word: Line[]) => boolean> = {
    "one Segment, an Ism": (w) => w.length === 1 && w[0].partOfSpeech === "N",
    "a Fi'l of a derived Verb form": (w) => w.some((l) => l.partOfSpeech === "V" && l.tags.some((t) => /^VF:([2-9]|1[0-2])$/.test(t))),
    "three Segments": (w) => w.length === 3,
    "a Fi'l with a pronoun suffix": (w) =>
      w.some((l) => l.partOfSpeech === "V") && w.some((l) => l.partOfSpeech === "N" && l.tags.includes("PRON") && l.tags.includes("SUFF")),
  };

  ScenarioOutline("A sampled Word's Segments are the source's lines for it", ({ Then, And }, { location, what }) => {
    Then("the source gives Word <location> <what>", () => {
      expect(DESCRIBED[what], `a description the steps know: ${what}`).toBeDefined();
      expect(DESCRIBED[what](lines.get(location) ?? []), `the source's lines for ${location}`).toBe(true);
    });
    And(
      "Word <location>'s Segments read back from the database are the source's lines for it, in order, with every tag but its Root and Lemma",
      async () => {
        const stored = await storedAt(location);
        expect(stored.length).toBeGreaterThan(0);
        expect(stored.map(asLine)).toEqual(lines.get(location)!.map(lineWithout));
      },
    );
  });

  Scenario("Every Segment of the source is imported, but for the Words it divides differently", ({ Then, And }) => {
    let joined: string[] = [];
    Then(
      "every Segment line of the source is read back from the database at its Word, with every tag but its Root and Lemma, except at the {int} Corpus Words that join {int} of ours",
      async (_, count: number, two: number) => {
        const ours = await query<{ location: string; uthmani: string }>(url, "select location, uthmani from word");
        const uthmani = new Map(ours.map((w) => [w.location, w.uthmani]));
        const surahs = Array.from({ length: 114 }, (_, i) => readSurahGrammar(i + 1, db()));
        const stored: Record<string, Segment[]> = Object.assign({}, ...(await Promise.all(surahs)));
        // A Corpus Word joins 2 of ours where its letters are those two Words' together; the Words after it, in its Ayah, are ours a place later.
        const shift = new Map<string, number>();
        const joins: string[] = [];
        for (const [word, segments] of lines) {
          const [s, a, w] = word.split(":").map(Number);
          const ayah = `${s}:${a}`;
          const at = (n: number) => uthmani.get(`${ayah}:${n}`) ?? "";
          const by = shift.get(ayah) ?? 0;
          const text = letters(segments.map((l) => l.uthmani).join(""));
          if (by === 0 && text !== letters(at(w)) && text === letters(at(w) + at(w + 1))) {
            joins.push(word);
            shift.set(ayah, 1);
            continue;
          }
          const location = `${ayah}:${w + by}`;
          expect((stored[location] ?? []).map(asLine), `the Segments at ${location}, the Corpus's ${word}`).toEqual(segments.map(lineWithout));
        }
        expect(joins, "the Corpus Words that join two of ours").toHaveLength(count);
        joined = joins.flatMap((word) => {
          const [s, a, w] = word.split(":").map(Number);
          return Array.from({ length: two }, (_, i) => `${s}:${a}:${w + i}`);
        });
      },
    );
    And(
      "the {int} Words of ours those join, {string}, {string}, {string}, {string}, {string} and {string}, have no Segments, and every other Word has",
      async (_, count: number, ...named: string[]) => {
        expect(joined).toEqual(named);
        expect(named).toHaveLength(count);
        const bare = await query<{ location: string }>(
          url,
          `select location from word w where not exists (select from word_segment s where s.location = w.location) order by surah, ayah, position`,
        );
        expect(bare.map((w) => w.location)).toEqual(named);
      },
    );
  });

  Scenario("Ayah-end markers have no Segments", ({ Then }) => {
    Then("no Segment is stored at a QPC Hafs Ayah-end marker's location", async () => {
      const uthmani = readSource<TextSource>(UTHMANI);
      const markers = new Set(Object.keys(uthmani).filter((l) => isAyahEnd(uthmani, l)));
      expect(markers.size).toBe(6236);
      const stored = await query<{ location: string }>(url, "select distinct location from word_segment");
      expect(stored.length).toBeGreaterThan(0);
      expect(stored.filter((s) => markers.has(s.location))).toEqual([]);
    });
  });

  Scenario("The Corpus's Roots and Lemmas are written nowhere", ({ Then, And }) => {
    Then("no column of the Segments' table names a Root or a Lemma", async () => {
      const columns = await query<{ column_name: string }>(url, "select column_name from information_schema.columns where table_name = 'word_segment'");
      expect(columns.length).toBeGreaterThan(0);
      expect(columns.map((c) => c.column_name).filter((c) => /root|lem/i.test(c))).toEqual([]);
    });
    And("no value the Segments' table stores, but a Segment's own text, is one of the source's Roots or Lemmas", async () => {
      const corpus = new Set([...lines.values()].flatMap((w) => w.flatMap((l) => l.tags.filter((t) => /^(ROOT|LEM):/.test(t)).map((t) => t.slice(t.indexOf(":") + 1)))));
      expect(corpus.size).toBeGreaterThan(1000);
      const values = await query<{ value: string }>(
        url,
        `select distinct v as value from word_segment,
           unnest(array[location, part_of_speech, affix, kind, derivation, "case", gender, number, aspect, mood, family]) as v
          where v is not null`,
      );
      expect(values.filter((v) => corpus.has(v.value))).toEqual([]);
    });
  });

  Scenario("A changed Word grammar source loads again", ({ Given, When, Then, And }) => {
    Given("a copy of the sources whose Word grammar line for Segment 1:2:3:1 reads {string} for {string}", (_, to: string, from: string) => {
      const changed = sourceText().replace(/^1:2:3:1\t.*$/m, (line) => {
        expect(line.split("|")).toContain(from);
        return line.split("|").map((t) => (t === from ? to : t)).join("|");
      });
      copy = sourceCopy({ replaceData: { [SOURCE]: changed } });
    });
    When("the import runs on that copy", async () => {
      hashBefore = await storedSourcesHash(url);
      run = runImport(url, copy);
    });
    Then("it exits 0", () => expectSucceeded(run));
    And("Word 1:2:3's Segment read back from the database has the Case {string}", async (_, value: string) => {
      expect((await storedAt("1:2:3")).map((s) => s.case)).toEqual([value]);
    });
    And("the stored sources hash differs from the committed sources'", async () => {
      expect(hashBefore ?? "", "the stored sources hash before").toMatch(/\S/);
      expect(await storedSourcesHash(url)).not.toBe(hashBefore);
    });
    And(
      "its output names the {int} Words the Corpus divides differently, {string}, {string}, {string}, {string}, {string} and {string}, in Word location order, on the line after the Root disagreements",
      (_, count: number, ...named: string[]) => {
        expect(named).toHaveLength(count);
        expect(named, "the Words as named, in Word location order").toEqual([...named].sort(compareLocations));
        const output = run.output.split("\n");
        const disagreements = output.findIndex((l) => / Root disagreements /.test(l));
        expect(disagreements, "the output's Root disagreements line").toBeGreaterThanOrEqual(0);
        expect(output[disagreements + 1]).toContain(`${count} Words the Corpus divides differently, without Word grammar: ${named.join(", ")}`);
      },
    );
  });
});
