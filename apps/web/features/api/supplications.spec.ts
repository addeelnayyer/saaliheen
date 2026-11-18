import { execFileSync } from "node:child_process";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { database } from "./support";
import { testDatabase } from "../site/test-database.ts";
import { curated, parseRun, quranOrder, runOf, type Opening } from "../site/supplications-data.ts";

// The Supplications as db:migrate loads them (#199, ADR 0027): the tables, the
// version-1 rows and the constraints, read and written straight in the run's
// own Postgres, as no client can see them, and checked against the curated file
// committed as the load migration's frozen input.

const feature = await loadFeature("./supplications.feature");

const APP = path.resolve(import.meta.dirname, "../..");

interface SpeakerRow {
  id: string;
  name_en: string;
  name_ur: string;
  includes_prophet: boolean;
  version: unknown;
}
interface SupplicationRow {
  id: unknown;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  speaker_id: string;
  openings: unknown;
  kind: string;
  version: unknown;
}

/** Whether the public schema has `table`. */
async function hasTable(table: string): Promise<boolean> {
  const found = await database().query<{ t: string | null }>(`select to_regclass($1)::text as t`, [`public.${table}`]);
  return found.rows[0].t === table;
}

/** Every Supplication row, in Quran order; the `supplication` table must exist. */
async function supplicationRows(): Promise<SupplicationRow[]> {
  expect(await hasTable("supplication"), "db:migrate made the table `supplication`").toBe(true);
  const rows = await database().query<SupplicationRow>(`select * from supplication order by surah, ayah_from, ayah_to`);
  return rows.rows.map((r) => ({ ...r, surah: Number(r.surah), ayah_from: Number(r.ayah_from), ayah_to: Number(r.ayah_to) }));
}

/** Every Speaker row; the `supplication_speaker` table must exist. */
async function speakerRows(): Promise<SpeakerRow[]> {
  expect(await hasTable("supplication_speaker"), "db:migrate made the table `supplication_speaker`").toBe(true);
  return (await database().query<SpeakerRow>(`select * from supplication_speaker order by id`)).rows;
}

/** A row's Openings as a list in the curated file's order, whatever Postgres type holds them. */
function openingsOf(value: unknown): Opening[] {
  const list = Array.isArray(value) ? value : String(value).replace(/^\{|\}$/g, "").split(",").filter(Boolean);
  const order: Opening[] = ["rabbana", "rabbi", "other"];
  return (list as Opening[]).map((o) => o.trim() as Opening).toSorted((a, b) => order.indexOf(a) - order.indexOf(b));
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

/** The curated file's Speaker of the run at `run`. */
function curatedSpeakerIdAt(run: string): string {
  const found = curated().supplications.filter((s) => runOf(s) === runOf(parseRun(run)));
  expect(found.length, `the curated file's runs at ${run}`).toBe(1);
  return found[0].speakerId;
}

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  /** Every row as a step noted it. */
  let noted: Record<string, string[]> | undefined;
  /** The Speaker whose English name a step changed, and its name before. */
  let changed: { id: string; nameEn: string } | undefined;
  /** What the database said to the Supplication a step tried to add: its new id, or the error. */
  let added: { id?: unknown; error?: { code?: string; message: string } } | undefined;

  BeforeEachScenario(() => {
    noted = undefined;
    changed = undefined;
    added = undefined;
  });

  // Put back what a scenario changed, so later scenarios see the curated file's.
  AfterEachScenario(async () => {
    if (changed) await database().query(`update supplication_speaker set name_en = $1 where id = $2`, [changed.nameEn, changed.id]);
    if (added?.id !== undefined) await database().query(`delete from supplication where id = $1`, [added.id]);
  });

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- AC-6

    step("the database has the tables {string}, {string}, {string} and {string}", async (_, a: string, b: string, c: string, d: string) => {
      const missing = [];
      for (const table of [a, b, c, d]) if (!(await hasTable(table))) missing.push(table);
      expect(missing, "tables db:migrate did not make").toEqual([]);
    });

    step("the database holds every Speaker of the curated file, with its names and Prophet mark, each at version {int}", async (_, version: number) => {
      const rows = (await speakerRows()).map((r) => ({ id: r.id, nameEn: r.name_en, nameUr: r.name_ur, includesProphet: r.includes_prophet, version: Number(r.version) }));
      const expected = curated()
        .speakers.map((s) => ({ id: s.id, nameEn: s.nameEn, nameUr: s.nameUr, includesProphet: s.includesProphet, version }))
        .toSorted((a, b) => a.id.localeCompare(b.id));
      expect(rows.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(expected);
    });

    step(
      "the database holds every Supplication of the curated file, with its Surah, run, Speaker, Openings and kind, each at version {int}",
      async (_, version: number) => {
        const rows = (await supplicationRows()).map((r) => ({
          surah: r.surah,
          ayahFrom: r.ayah_from,
          ayahTo: r.ayah_to,
          speakerId: r.speaker_id,
          openings: openingsOf(r.openings),
          kind: r.kind,
          version: Number(r.version),
        }));
        const expected = curated()
          .supplications.map((s) => ({ surah: s.surah, ayahFrom: s.ayahFrom, ayahTo: s.ayahTo, speakerId: s.speakerId, openings: s.openings, kind: s.kind, version }))
          .toSorted(quranOrder);
        expect(rows).toEqual(expected);
      },
    );

    step("the database holds no Supplication revision and no Speaker revision", async () => {
      for (const table of ["supplication_revision", "supplication_speaker_revision"]) {
        expect(await hasTable(table), `db:migrate made the table \`${table}\``).toBe(true);
        const count = await database().query<{ n: string }>(`select count(*) as n from "${table}"`);
        expect(Number(count.rows[0].n), `rows in ${table}`).toBe(0);
      }
    });

    // ---------------------------------------------------------------- AC-7

    step(
      "I add to the database a Supplication at Surah {any}, Ayahs {any} to {any}, said by the Speaker of the run at {any}",
      async (_, surahText: string, fromText: string, toText: string, run: string) => {
        const [surah, from, to] = [surahText, fromText, toText].map(Number);
        // As the Supplication editor's save will: one row added, its other fields those of a loaded Supplication.
        const source = parseRun(run);
        const of = await supplicationRows();
        const like = of.filter((r) => r.surah === source.surah && r.ayah_from === source.ayahFrom && r.ayah_to === source.ayahTo);
        expect(like.length, `the Supplication at ${run} in the database`).toBe(1);
        try {
          const res = await database().query<{ id: unknown }>(
            `insert into supplication (surah, ayah_from, ayah_to, speaker_id, openings, kind, version)
             select $1, $2, $3, speaker_id, openings, kind, 1 from supplication where id = $4
             returning id`,
            [surah, from, to, like[0].id],
          );
          added = { id: res.rows[0]?.id };
        } catch (e) {
          const err = e as { code?: string; message: string };
          added = { error: { code: err.code, message: err.message } };
        }
      },
    );

    step("the database refuses the Supplication {any}", (_, what: string) => {
      if (!added) throw new Error("no Supplication added in this scenario");
      expect(added.id, `the id Neon gave the Supplication ${what}, which it should have refused`).toBeUndefined();
      // An integrity constraint (class 23: check, exclusion, unique, foreign key), not some other failure.
      expect(added.error?.code ?? "", `the refusal of the Supplication ${what} (${added.error?.message})`).toMatch(/^23/);
    });

    step("the database accepts it", () => {
      if (!added) throw new Error("no Supplication added in this scenario");
      expect(added.error, "the database's refusal").toBeUndefined();
      expect(added.id, "the new Supplication's id").not.toBeUndefined();
    });

    step("the Supplication I added is taken out again", async () => {
      if (added?.id === undefined) throw new Error("no Supplication added in this scenario");
      await database().query(`delete from supplication where id = $1`, [added.id]);
      added = undefined;
      expect((await supplicationRows()).length, "Supplications in the database").toBe(curated().supplications.length);
    });

    step("the database still holds just the curated file's Supplications", async () => {
      const rows = (await supplicationRows()).map((r) => runOf({ surah: r.surah, ayahFrom: r.ayah_from, ayahTo: r.ayah_to }));
      expect(rows).toEqual(curated().supplications.toSorted(quranOrder).map(runOf));
    });

    // ---------------------------------------------------------------- AC-8

    step("I note every row in the database", async () => {
      expect(await hasTable("supplication"), "db:migrate made the table `supplication`").toBe(true);
      noted = await everyRow();
    });

    step("the English name of the Speaker of the run at {any} has since been changed in the database to {string}", async (_, run: string, name: string) => {
      // As an Admin's save will, once the Supplication editor exists: arranged directly in the database.
      const id = curatedSpeakerIdAt(run);
      const before = await database().query<{ name_en: string }>(`select name_en from supplication_speaker where id = $1`, [id]);
      expect(before.rows.length, `the Speaker "${id}" in the database`).toBe(1);
      changed = { id, nameEn: before.rows[0].name_en };
      await database().query(`update supplication_speaker set name_en = $1 where id = $2`, [name, id]);
    });

    step("I run db:migrate again", () => {
      execFileSync("pnpm", ["run", "db:migrate"], {
        cwd: APP,
        stdio: ["ignore", "ignore", "inherit"],
        env: { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url },
      });
    });

    step("the Speaker of the run at {any} still has the English name {string}", async (_, run: string, name: string) => {
      const id = curatedSpeakerIdAt(run);
      const now = await database().query<{ name_en: string }>(`select name_en from supplication_speaker where id = $1`, [id]);
      expect(now.rows[0]?.name_en, `the English name of "${id}"`).toBe(name);
    });

    step("every other row in the database is as I noted it, but for the content audit's one entry of that change", async () => {
      if (!noted || !changed) throw new Error("no rows noted, or no name changed, in this scenario");
      const now = await everyRow();
      // The one change made since the note: that Speaker's English name.
      const after = (row: string) => {
        const r = JSON.parse(row) as SpeakerRow;
        return JSON.stringify(r.id === changed!.id ? { ...r, name_en: changed!.nameEn } : r);
      };
      // And the content audit's one entry for it (ADR 0038; the triggers 0009 and 0010 attach): an update of that Speaker.
      const isTheChange = (row: string) => {
        const r = JSON.parse(row) as { table_name: string; operation: string; row_key: { id?: string } };
        return r.table_name === "supplication_speaker" && r.operation === "update" && r.row_key.id === changed!.id;
      };
      const [audit, notedAudit] = [now.content_audit ?? [], noted.content_audit ?? []];
      expect(audit.filter(isTheChange).length - notedAudit.filter(isTheChange).length, "content audit entries for the change").toBe(1);
      const unaudited = { ...now, content_audit: audit.filter((row) => !isTheChange(row) || notedAudit.includes(row)) };
      expect({ ...unaudited, supplication_speaker: (now.supplication_speaker ?? []).map(after).sort() }).toEqual(noted);
    });
  });

  Scenario("After db:migrate on an empty database, it holds the curated file's Speakers and Supplications at version 1, and no revision", () => {});
  ScenarioOutline("Neon refuses a Supplication <what>", () => {});
  Scenario("Neon accepts a Supplication whose Ayahs no other Supplication holds", () => {});
  Scenario("Running db:migrate again changes nothing, and keeps a change made since", () => {});
});
