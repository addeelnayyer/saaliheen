import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { setAuditActor } from "../../src/content-audit.ts";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { auditMark, auditRowsSince, expectAudit, hasTable, keyOf, primaryKeyOf, type AuditRow } from "./audit";
import { accountId, database, signIn } from "./support";

// The content audit of the Passage tables (#171, ADR 0022, ADR 0038), read
// from the run's own Postgres directly, as content-audit.feature reads the
// other tables'. A Publish's rows are written as a Publish writes them, in one
// transaction naming the Admin's Account id through the app's helper.

const feature = await loadFeature("./passage-audit.feature");

type StepFn = Parameters<StepTest["Given"]>[1];
type Row = Record<string, unknown>;

const PASSAGE_TABLES = ["passage", "phrase", "passage_revision"] as const;

/**
 * Whether audit row `a`'s `after` is row `t` as loaded: its columns then hold
 * what `t` holds now, and any column a later content migration added (as
 * #174's `changes` and `undoes`) is still null.
 */
const AS_LOADED = `a.after = (select jsonb_object_agg(k, to_jsonb(t) -> k) from jsonb_object_keys(a.after) as k)
  and not exists (select 1 from jsonb_each(to_jsonb(t) - array(select jsonb_object_keys(a.after))) as added where added.value <> 'null'::jsonb)`;

/**
 * For each Passage table, a row the audit sees: the SQL that inserts it, the
 * SQL that then changes one of its columns other than its key, and the SQL that
 * deletes it, each answering the row as JSON. Values are made up, outside what
 * any other feature reads: Ayahs and Words past Surah 114's last, versions from
 * 1000.
 */
const ROWS: Record<string, { insert: string; update: string; remove: string }> = {
  passage: {
    insert: `insert into passage as r (surah, ayah_from, ayah_till, title_en, title_ur)
             values (114, 999, 999, 'Audit check', 'Audit check') returning to_jsonb(r) as row`,
    update: `update passage as r set title_en = 'Audit check, updated' where surah = 114 and ayah_from = 999 returning to_jsonb(r) as row`,
    remove: `delete from passage as r where surah = 114 and ayah_from = 999 returning to_jsonb(r) as row`,
  },
  phrase: {
    insert: `insert into phrase as r (surah, first_word, last_word) values (114, '114:999:1', '114:999:1') returning to_jsonb(r) as row`,
    update: `update phrase as r set last_word = '114:999:2' where first_word = '114:999:1' returning to_jsonb(r) as row`,
    remove: `delete from phrase as r where first_word = '114:999:1' returning to_jsonb(r) as row`,
  },
  passage_revision: {
    insert: `insert into passage_revision as r (surah, author, created_at, edits, base, version)
             values (114, 'audit', now(), '[]'::jsonb, 1000, 1001) returning to_jsonb(r) as row`,
    update: `update passage_revision as r set author = 'audit-updated' where surah = 114 and version = 1001 returning to_jsonb(r) as row`,
    remove: `delete from passage_revision as r where surah = 114 and version = 1001 returning to_jsonb(r) as row`,
  },
};

/** Surah 114's first Passage, by its first Ayah. */
const FIRST_PASSAGE_114 = `select * from passage where surah = 114 order by ayah_from limit 1`;

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let admin: string | undefined;
  let mark = 0;
  let notedFirst: Row | undefined;
  let notedRevisions: number[] | undefined;
  let publishedVersion: number | undefined;
  let written: { table: string; inserted: Row; updated: Row; deleted: Row } | undefined;

  BeforeEachScenario(() => {
    admin = notedFirst = notedRevisions = publishedVersion = written = undefined;
    mark = 0;
  });

  // Put Surah 114 back as noted: its first Passage's title, no Phrase, only the noted revisions.
  AfterEachScenario(async () => {
    if (!notedFirst) return;
    await database().query(`update passage set title_en = $3 where surah = $1 and ayah_from = $2`, [114, notedFirst.ayah_from, notedFirst.title_en]);
    await database().query(`delete from phrase where surah = 114`);
    await database().query(`delete from passage_revision where surah = 114 and not (version = any ($1::int[]))`, [notedRevisions ?? []]);
  });

  const adminId = () => {
    if (!admin) throw new Error("not signed in as the Admin in this scenario");
    return admin;
  };
  const since = (table: string) => auditRowsSince(mark, table);
  const writtenRow = () => {
    if (!written) throw new Error("no row written in this scenario");
    return written;
  };

  /** The one audit row since the mark that is an insert into `table` matching `match`. */
  async function oneInsert(table: string, actor: string, match: (row: AuditRow) => boolean) {
    const rows = (await since(table)).filter((r) => r.operation === "insert" && match(r));
    expect(rows.map((r) => ({ actor: r.actor, before: r.before })), `inserts into \`${table}\` since`).toEqual([{ actor, before: null }]);
    expect(rows[0].row_key).toEqual(await keyOf(table, rows[0].after!));
    return rows[0];
  }

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("`pnpm db:migrate` has loaded the Passages and Phrases into the run's database", async () => {
      for (const table of PASSAGE_TABLES) expect(await hasTable(table), `db:migrate made the table \`${table}\``).toBe(true);
      await expectAudit();
    });

    step(
      "every row of `passage`, `phrase` and `passage_revision` has one insert audited by {string}, keyed by its primary key, with the row as loaded after it and nothing before",
      async (_, actor: string) => {
        for (const table of PASSAGE_TABLES) {
          const { rows } = await database().query<{ total: string; missing: string }>(
            `select count(*) as total,
                    count(*) filter (where (select count(*) from content_audit a
                       where a.table_name = $1 and a.operation = 'insert' and a.actor = $2 and a.before is null
                         and ${AS_LOADED}
                         and a.row_key = (select jsonb_object_agg(k, to_jsonb(t) -> k) from unnest($3::text[]) as k)) <> 1) as missing
               from "${table}" as t where ($1 <> 'passage_revision' or to_jsonb(t) ->> 'author' = 'seed')`,
            [table, actor, await primaryKeyOf(table)],
          );
          expect(Number(rows[0].total), `rows of \`${table}\``).toBeGreaterThan(0);
          expect(Number(rows[0].missing), `rows of \`${table}\` without exactly one insert audited by ${actor}`).toBe(0);
        }
      },
    );

    step("I am signed in as the Admin", async () => {
      admin = await accountId(await signIn(ADMIN_EMAIL));
    });

    step("I note Surah 114's Passages, Phrases and Passage revisions, and the latest content audit row", async () => {
      for (const table of PASSAGE_TABLES) expect(await hasTable(table), `db:migrate made the table \`${table}\``).toBe(true);
      notedFirst = (await database().query(FIRST_PASSAGE_114)).rows[0] as Row | undefined;
      expect(notedFirst, "Surah 114 has a Passage").toBeDefined();
      const { rows: phrases } = await database().query(`select * from phrase where surah = 114`);
      expect(phrases, "Surah 114's Phrases before the Publish").toEqual([]);
      notedRevisions = (await database().query<{ version: number }>(`select version from passage_revision where surah = 114`)).rows.map((r) => r.version);
      mark = await auditMark();
    });

    step("I note the latest content audit row", async () => {
      mark = await auditMark();
    });

    step(
      "a Publish by the Admin retitles Surah 114's first Passage in English as {string}, marks a Phrase over {any} and writes its Passage revision, based on Surah 114's current version and making the next, in one transaction that names the Admin's Account id as its actor",
      async (_, title: string, phrase: string) => {
        const [first, last] = phrase.split("–");
        const client = await database().connect();
        try {
          await client.query("begin");
          await setAuditActor(client, adminId());
          await client.query(`update passage set title_en = $3 where surah = $1 and ayah_from = $2`, [114, notedFirst!.ayah_from, title]);
          await client.query(`insert into phrase (surah, first_word, last_word) values (114, $1, $2)`, [first, last]);
          const { rows } = await client.query<{ version: number }>(
            `insert into passage_revision (surah, author, created_at, edits, base, version)
             select 114, $1, now(), $2::jsonb, coalesce(max(version), 0), coalesce(max(version), 0) + 1 from passage_revision where surah = 114
             returning version`,
            [adminId(), JSON.stringify([{ kind: "retitle", from: notedFirst!.ayah_from, en: title, ur: notedFirst!.title_ur }, { kind: "mark", first, last }])],
          );
          publishedVersion = rows[0].version;
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw error;
        } finally {
          client.release();
        }
      },
    );

    step(
      "the content audit since holds an update of Surah 114's first Passage in `passage`, by the Admin's Account id, keyed by its primary key, with its old English Passage title before and {string} after",
      async (_, title: string) => {
        const rows = (await since("passage")).filter((r) => r.operation === "update");
        expect(rows.map((r) => ({ actor: r.actor, before: r.before?.title_en, after: r.after?.title_en }))).toEqual([
          { actor: adminId(), before: notedFirst!.title_en, after: title },
        ]);
        expect(rows[0].row_key).toEqual(await keyOf("passage", notedFirst!));
      },
    );

    step("the content audit since holds an insert into `phrase` of the Phrase {any}, by the Admin's Account id", async (_, phrase: string) => {
      const [first, last] = phrase.split("–");
      await oneInsert("phrase", adminId(), (r) => r.after?.first_word === first && r.after?.last_word === last);
    });

    step("the content audit since holds an insert into `passage_revision` of the Publish's revision, by the Admin's Account id", async () => {
      await oneInsert("passage_revision", adminId(), (r) => r.after?.surah === 114 && r.after?.version === publishedVersion);
    });

    step("I insert a row into {any}, update it and delete it, each in a transaction that names no actor", async (_, quoted: string) => {
      const table = quoted.replace(/`/g, "");
      const sql = ROWS[table];
      if (!sql) throw new Error(`no row written for \`${table}\``);
      expect(await hasTable(table), `the table \`${table}\``).toBe(true);
      const one = async (text: string) => (await database().query(text)).rows[0]?.row as Row;
      const inserted = await one(sql.insert);
      const updated = await one(sql.update);
      const deleted = await one(sql.remove);
      written = { table, inserted, updated, deleted };
    });

    step(
      "the content audit since holds, for {any}, exactly an insert, an update and a delete of that row, in that order, each by {string} and keyed by its primary key",
      async (_, quoted: string, actor: string) => {
        const { table, inserted } = writtenRow();
        expect(quoted.replace(/`/g, "")).toBe(table);
        const rows = await since(table);
        const key = await keyOf(table, inserted);
        expect(rows.map((r) => ({ operation: r.operation, actor: r.actor, key: r.row_key }))).toEqual(
          ["insert", "update", "delete"].map((operation) => ({ operation, actor, key })),
        );
        for (const r of rows) expect(Date.now() - new Date(r.changed_at).getTime(), "audited within the last minute").toBeLessThan(60_000);
      },
    );

    step("the insert has nothing before and the row as inserted after", async () => {
      const [insert] = await since(writtenRow().table);
      expect({ before: insert.before, after: insert.after }).toEqual({ before: null, after: writtenRow().inserted });
    });

    step("the update has the row as inserted before and as updated after", async () => {
      const [, update] = await since(writtenRow().table);
      expect({ before: update.before, after: update.after }).toEqual({ before: writtenRow().inserted, after: writtenRow().updated });
    });

    step("the delete has the row as updated before and nothing after", async () => {
      const [, , remove] = await since(writtenRow().table);
      expect({ before: remove.before, after: remove.after }).toEqual({ before: writtenRow().deleted, after: null });
    });
  });

  Scenario("The Passage load is audited as an insert of every Passage, Phrase and seed Passage revision, by `migration`", () => {});
  Scenario("An Admin's Publish is audited under the Admin's Account id", () => {});
  ScenarioOutline("A change to `<table>` that names no actor is audited as an insert, an update and a delete by `unknown`", () => {});
});
