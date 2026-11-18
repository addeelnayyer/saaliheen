import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { database } from "./support";
import { testDatabase } from "../site/test-database.ts";

// The Iltifat as db:migrate loads them (#138): read straight from the run's
// own Postgres, never through an endpoint, and checked against the catalogue
// committed in the repo as the data migration's frozen input (ADR 0012).

const feature = await loadFeature("./iltifat.feature");

const APP = path.resolve(import.meta.dirname, "../..");
/** The catalogue, version 2.0, committed beside the data migration as its frozen input. */
const CATALOGUE = path.join(APP, "data/iltifat/quran_iltifat_person_shifts_2.json");

type Person = "first" | "second" | "third";
interface CatalogueEntry {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  from_person: Person;
  to_person: Person;
  reason: string;
  attestation_status: "well_attested" | "disputed";
  source_section: string;
  verse_url: string;
}
/** An Iltifat row as the `iltifat` table holds it. */
interface Row {
  id: unknown;
  from_person: Person;
  to_person: Person;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  cited_ayah: number;
  reason: string;
  disputed: boolean;
  section: string;
  version: unknown;
}

/** The four Iltifat directions, as the glossary writes them, by their persons. */
const DIRECTIONS: Record<string, [Person, Person]> = {
  "He → We": ["third", "first"],
  "We → He": ["first", "third"],
  "He → You": ["third", "second"],
  "You → He": ["second", "third"],
};
const directionOf = (from: Person, to: Person) => Object.keys(DIRECTIONS).find((d) => DIRECTIONS[d][0] === from && DIRECTIONS[d][1] === to) ?? `${from} → ${to}`;
const runOf = (r: { surah: number; ayah_from: number; ayah_to: number }) =>
  r.ayah_from === r.ayah_to ? `${r.surah}:${r.ayah_from}` : `${r.surah}:${r.ayah_from}–${r.ayah_to}`;
const keyOf = (r: { from_person: Person; to_person: Person; surah: number; ayah_from: number; ayah_to: number }) =>
  `${directionOf(r.from_person, r.to_person)} ${runOf(r)}`;

function catalogue(): CatalogueEntry[] {
  return (JSON.parse(fs.readFileSync(CATALOGUE, "utf8")) as { version: string; entries: CatalogueEntry[] }).entries;
}
const citedAyahOf = (e: CatalogueEntry) => Number(new URL(e.verse_url).searchParams.get("verse"));

/** Every Iltifat row; the `iltifat` table must exist. */
async function iltifat(): Promise<Row[]> {
  const db = database();
  const table = await db.query<{ t: string | null }>(`select to_regclass('public.iltifat')::text as t`);
  expect(table.rows[0].t, "db:migrate made the table `iltifat`").toBe("iltifat");
  const rows = await db.query<Row>(`select * from iltifat order by surah, ayah_from, ayah_to, cited_ayah`);
  return rows.rows.map((r) => ({ ...r, surah: Number(r.surah), ayah_from: Number(r.ayah_from), ayah_to: Number(r.ayah_to), cited_ayah: Number(r.cited_ayah) }));
}

/** The one Iltifat of `direction` at `run` (e.g. "1:2–5"). */
async function oneAt(direction: string, run: string): Promise<Row> {
  const found = (await iltifat()).filter((r) => keyOf(r) === `${direction} ${run}`);
  expect(found.length, `one ${direction} Iltifat at ${run}`).toBe(1);
  return found[0];
}

/** Every row of every table in the database's public schema, by table, in a stable order. */
async function everyRow(): Promise<Record<string, string[]>> {
  const db = database();
  const tables = await db.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
  );
  const all: Record<string, string[]> = {};
  for (const { table_name } of tables.rows) {
    const rows = await db.query(`select * from "${table_name}"`);
    all[table_name] = rows.rows.map((r) => JSON.stringify(r)).sort();
  }
  return all;
}

/** The Ayah count of every Surah, from QUL's Surah metadata. */
function surahAyahCounts(): Map<number, number> {
  const meta = JSON.parse(fs.readFileSync(path.join(APP, "data/qul/quran-metadata-surah-name.json"), "utf8")) as Record<string, { id: number; verses_count: number }>;
  return new Map(Object.values(meta).map((s) => [s.id, s.verses_count]));
}

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  /** Every row as a step noted it. */
  let noted: Record<string, string[]> | undefined;
  /** The Iltifat whose reason a step changed, and its reason before. */
  let changed: { id: unknown; reason: string } | undefined;

  BeforeEachScenario(() => {
    noted = undefined;
    changed = undefined;
  });

  // Put back a reason a scenario changed, so later scenarios see the catalogue's.
  AfterEachScenario(async () => {
    if (changed) await database().query(`update iltifat set reason = $1 where id = $2`, [changed.reason, changed.id]);
  });

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- AC-1

    step("the database holds {int} Iltifat", async (_, count: number) => {
      expect((await iltifat()).length, "Iltifat in the database").toBe(count);
    });

    step("the database still holds {int} Iltifat", async (_, count: number) => {
      expect((await iltifat()).length, "Iltifat in the database").toBe(count);
    });

    step("the database holds these Iltifat by Iltifat direction:", async (_, table: { direction: string; count: string }[]) => {
      const rows = await iltifat();
      const counts = Object.fromEntries(Object.keys(DIRECTIONS).map((d) => [d, 0]));
      for (const r of rows) counts[directionOf(r.from_person, r.to_person)] = (counts[directionOf(r.from_person, r.to_person)] ?? 0) + 1;
      expect(counts).toEqual(Object.fromEntries(table.map((t) => [t.direction, Number(t.count)])));
    });

    step("these {int} Iltifat in the database are Disputed, and no other:", async (_, count: number, table: { direction: string; run: string }[]) => {
      expect(table.length).toBe(count);
      const disputed = (await iltifat()).filter((r) => r.disputed === true).map(keyOf).sort();
      expect(disputed).toEqual(table.map((t) => `${t.direction} ${t.run}`).sort());
    });

    step(
      "each Iltifat in the database is one entry of the catalogue, with its direction, Surah, run, cited Ayah, reason, Disputed flag and Abdel Haleem section",
      async () => {
        const fields = (r: Omit<Row, "id" | "version">) => ({
          from_person: r.from_person,
          to_person: r.to_person,
          surah: r.surah,
          ayah_from: r.ayah_from,
          ayah_to: r.ayah_to,
          cited_ayah: r.cited_ayah,
          reason: r.reason,
          disputed: r.disputed,
          section: r.section,
        });
        const order = (a: { surah: number; ayah_from: number; ayah_to: number; cited_ayah: number; from_person: string; to_person: string }, b: typeof a) =>
          a.surah - b.surah || a.ayah_from - b.ayah_from || a.ayah_to - b.ayah_to || a.cited_ayah - b.cited_ayah || `${a.from_person}${a.to_person}`.localeCompare(`${b.from_person}${b.to_person}`);
        const expected = catalogue()
          .map((e) =>
            fields({
              from_person: e.from_person,
              to_person: e.to_person,
              surah: e.surah,
              ayah_from: e.ayah_from,
              ayah_to: e.ayah_to,
              cited_ayah: citedAyahOf(e),
              reason: e.reason,
              disputed: e.attestation_status === "disputed",
              section: e.source_section,
            }),
          )
          .sort(order);
        expect(expected.length, "entries in the catalogue").toBe(326);
        const rows = (await iltifat()).map(fields).sort(order);
        expect(rows).toEqual(expected);
      },
    );

    step("every Iltifat in the database has a version", async () => {
      const without = (await iltifat()).filter((r) => r.version === null || r.version === undefined).map(keyOf);
      expect(without, "Iltifat with no version").toEqual([]);
    });

    step("I note every row in the database", async () => {
      noted = await everyRow();
    });

    step("the reason of the He → You Iltifat at 1:2–5 has since been changed to {string}", async (_, reason: string) => {
      // As an Admin's save will, once the Iltifat editor exists: arranged directly in the database.
      const row = await oneAt("He → You", "1:2–5");
      changed = { id: row.id, reason: row.reason };
      await database().query(`update iltifat set reason = $1 where id = $2`, [reason, row.id]);
    });

    step("I run db:migrate again", () => {
      execFileSync("pnpm", ["run", "db:migrate"], {
        cwd: APP,
        stdio: ["ignore", "ignore", "inherit"],
        env: { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url },
      });
    });

    step("the He → You Iltifat at 1:2–5 still has the reason {string}", async (_, reason: string) => {
      expect((await oneAt("He → You", "1:2–5")).reason).toBe(reason);
    });

    step("every other row in the database is as I noted it", async () => {
      if (!noted || !changed) throw new Error("no rows noted, or no reason changed, in this scenario");
      const now = await everyRow();
      // The one change made since the note: that Iltifat's reason.
      const after = (row: string) => {
        const r = JSON.parse(row) as Row;
        return JSON.stringify(r.id === changed!.id ? { ...r, reason: changed!.reason } : r);
      };
      // And the audit of that change (#170, ADR 0038): one update of that Iltifat, the only content audit row since.
      const audited = (now.content_audit ?? []).filter((row) => !(noted!.content_audit ?? []).includes(row)).map((row) => JSON.parse(row) as Record<string, unknown>);
      expect(audited.map((r) => ({ table: r.table_name, key: r.row_key, operation: r.operation })), "content audit rows since").toEqual([
        { table: "iltifat", key: { id: changed.id }, operation: "update" },
      ]);
      const unaudited = (now.content_audit ?? []).filter((row) => (noted!.content_audit ?? []).includes(row));
      expect({ ...now, iltifat: (now.iltifat ?? []).map(after).sort(), content_audit: unaudited }).toEqual(noted);
    });

    // ---------------------------------------------------------------- AC-2

    step("every Iltifat in the database names a Surah from 1 to 114", async () => {
      const rows = await iltifat();
      expect(rows.length, "Iltifat in the database").toBe(326);
      expect(rows.filter((r) => !(r.surah >= 1 && r.surah <= 114)).map(keyOf)).toEqual([]);
    });

    step("every Iltifat's run starts at Ayah 1 or later and ends at or before its Surah's last Ayah in the Surah metadata", async () => {
      const counts = surahAyahCounts();
      const outside = (await iltifat()).filter((r) => r.ayah_from < 1 || r.ayah_to > (counts.get(r.surah) ?? 0)).map(keyOf);
      expect(outside, "runs that leave their Surah").toEqual([]);
    });

    step("every Iltifat's run starts at or before it ends", async () => {
      expect((await iltifat()).filter((r) => r.ayah_from > r.ayah_to).map(keyOf), "runs that end before they start").toEqual([]);
    });

    step("every Iltifat's cited Ayah lies within its run", async () => {
      const outside = (await iltifat()).filter((r) => r.cited_ayah < r.ayah_from || r.cited_ayah > r.ayah_to).map((r) => `${keyOf(r)} cited at ${r.cited_ayah}`);
      expect(outside, "cited Ayahs outside their run").toEqual([]);
    });
  });

  Scenario("After db:migrate on an empty database, it holds the catalogue's 326 Iltifat", () => {});
  Scenario("Running db:migrate again changes nothing, and keeps a change made since", () => {});
  Scenario("Every Iltifat's cited Ayah lies within its run, which lies within its Surah", () => {});
});
