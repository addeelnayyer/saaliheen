import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { setAuditActor } from "../../src/content-audit.ts";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { testDatabase } from "../site/test-database.ts";
import { auditMark, auditRowsSince, expectAudit, hasTable, keyOf, primaryKeyOf, type AuditRow } from "./audit";
import { accountId, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// The content audit (#170, ADR 0022, ADR 0038), read directly from the run's
// Postgres: what the Theme and Supplication loads, an Admin's Iltifat save (over HTTP, as the
// Iltifat editor sends it), an Allah reference publish (written as the publish
// will write it, through the app's own actor helper, since it has no endpoint
// yet), the Allah reference seed (run as the owner runs it) and changes that
// name no actor leave in `content_audit`; and that the role the site connects
// as cannot rewrite it.

const feature = await loadFeature("./content-audit.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";
/** The He → You Iltifat of Surah 1 cited at 1:5, as the catalogue loads it at 1:2–5. */
const HE_TO_YOU_AT_15 = `select * from iltifat where from_person = 'third' and to_person = 'second' and surah = 1 and cited_ayah = 5`;

type Row = Record<string, unknown>;

/** A Supplication revision table's changes (#199): one revision of `parent`'s first row, keyed by `key`. */
const revisionRows = (table: string, key: string, parent: string) => ({
  insert: `insert into ${table} as r (${key}, author, base, version, before, after)
           values ((select min(id) from ${parent}), 'audit@saaliheen.test', 1000, 1001, '{}', '{}') returning to_jsonb(r) as row`,
  update: `update ${table} as r set author = 'audit-updated@saaliheen.test'
           where author = 'audit@saaliheen.test' and version = 1001 returning to_jsonb(r) as row`,
  remove: `delete from ${table} as r where author = 'audit-updated@saaliheen.test' and version = 1001 returning to_jsonb(r) as row`,
});

/**
 * For each audited table, a row the audit sees: the SQL that inserts it, the
 * SQL that then changes one of its columns other than its key, and the SQL that
 * deletes it, each answering the row as JSON. Values are made up, outside what
 * any other feature reads: Surah 114's last Ayah, versions from 1000, an Iltifat
 * id past the catalogue's, a Supplication span in Ayah 999.
 */
const ROWS: Record<string, { insert: string; update: string; remove: string }> = {
  theme_category: {
    insert: `insert into theme_category as r (slug, name_en, name_ur) values ('audit-check', 'Audit check', 'Audit check') returning to_jsonb(r) as row`,
    update: `update theme_category as r set name_en = 'Audit check, updated' where slug = 'audit-check' returning to_jsonb(r) as row`,
    remove: `delete from theme_category as r where slug = 'audit-check' returning to_jsonb(r) as row`,
  },
  theme: {
    insert: `insert into theme as r (slug, category, name_en, name_ur, description)
             values ('audit-check', (select min(slug) from theme_category), 'Audit check', 'Audit check', 'A row the audit sees.') returning to_jsonb(r) as row`,
    update: `update theme as r set description = 'A row the audit sees, updated.' where slug = 'audit-check' returning to_jsonb(r) as row`,
    remove: `delete from theme as r where slug = 'audit-check' returning to_jsonb(r) as row`,
  },
  ayah_theme: {
    insert: `insert into ayah_theme as r (surah, ayah, position, theme)
             values (114, 6, 99, (select min(slug) from theme where slug not in (select theme from ayah_theme where surah = 114 and ayah = 6)))
             returning to_jsonb(r) as row`,
    update: `update ayah_theme as r set theme = (select max(slug) from theme where slug not in (select theme from ayah_theme where surah = 114 and ayah = 6))
             where surah = 114 and ayah = 6 and position = 99 returning to_jsonb(r) as row`,
    remove: `delete from ayah_theme as r where surah = 114 and ayah = 6 and position = 99 returning to_jsonb(r) as row`,
  },
  iltifat: {
    insert: `insert into iltifat as r (id, from_person, to_person, surah, ayah_from, ayah_to, cited_ayah, reason, disputed, section)
             values (9999, 'first', 'second', 114, 6, 6, 6, 'A row the audit sees.', false, 'audit') returning to_jsonb(r) as row`,
    update: `update iltifat as r set reason = 'A row the audit sees, updated.' where id = 9999 returning to_jsonb(r) as row`,
    remove: `delete from iltifat as r where id = 9999 returning to_jsonb(r) as row`,
  },
  iltifat_revision: {
    insert: `insert into iltifat_revision as r (iltifat_id, author, base, version, before, after)
             values ((select min(id) from iltifat), 'audit@saaliheen.test', 1000, 1001, '{}', '{}') returning to_jsonb(r) as row`,
    update: `update iltifat_revision as r set author = 'audit-updated@saaliheen.test'
             where author = 'audit@saaliheen.test' and version = 1001 returning to_jsonb(r) as row`,
    remove: `delete from iltifat_revision as r where author = 'audit-updated@saaliheen.test' and version = 1001 returning to_jsonb(r) as row`,
  },
  iltifat_marked_word: {
    insert: `insert into iltifat_marked_word as r (iltifat_id, ayah, word, side)
             values ((select min(id) from iltifat), 999, 999, 'from') returning to_jsonb(r) as row`,
    update: `update iltifat_marked_word as r set side = 'to' where ayah = 999 and word = 999 returning to_jsonb(r) as row`,
    remove: `delete from iltifat_marked_word as r where ayah = 999 and word = 999 returning to_jsonb(r) as row`,
  },
  [REFERENCES]: {
    insert: `insert into "${REFERENCES}" as r (id, location, surah) values ('audit-check', '114:6:9', 114) returning to_jsonb(r) as row`,
    update: `update "${REFERENCES}" as r set location = '114:6:8' where id = 'audit-check' returning to_jsonb(r) as row`,
    remove: `delete from "${REFERENCES}" as r where id = 'audit-check' returning to_jsonb(r) as row`,
  },
  [REVISIONS]: {
    insert: `insert into "${REVISIONS}" as r (id, surah, author, "createdAt", added, removed, base, version)
             values ('audit-check', 114, 'audit', now(), '[]'::jsonb, '[]'::jsonb, 1000, 1001) returning to_jsonb(r) as row`,
    update: `update "${REVISIONS}" as r set author = 'audit-updated' where id = 'audit-check' returning to_jsonb(r) as row`,
    remove: `delete from "${REVISIONS}" as r where id = 'audit-check' returning to_jsonb(r) as row`,
  },
  // #199: Surah 114 holds no Supplication, so the run at 114:6 overlaps none.
  supplication_speaker: {
    insert: `insert into supplication_speaker as r (id, name_en, name_ur, includes_prophet) values ('audit-check', 'Audit check', 'Audit check', false)
             returning to_jsonb(r) as row`,
    update: `update supplication_speaker as r set name_en = 'Audit check, updated' where id = 'audit-check' returning to_jsonb(r) as row`,
    remove: `delete from supplication_speaker as r where id = 'audit-check' returning to_jsonb(r) as row`,
  },
  supplication: {
    insert: `insert into supplication as r (id, surah, ayah_from, ayah_to, speaker_id, openings, kind)
             values (9999, 114, 6, 6, (select min(id) from supplication_speaker), array['other'], 'reported-words') returning to_jsonb(r) as row`,
    update: `update supplication as r set openings = array['rabbana'] where id = 9999 returning to_jsonb(r) as row`,
    remove: `delete from supplication as r where id = 9999 returning to_jsonb(r) as row`,
  },
  supplication_span: {
    insert: `insert into supplication_span as r (supplication_id, from_ayah, from_word, to_ayah, to_word)
             values ((select min(id) from supplication), 999, 1, 999, 2) returning to_jsonb(r) as row`,
    update: `update supplication_span as r set to_word = 3 where from_ayah = 999 returning to_jsonb(r) as row`,
    remove: `delete from supplication_span as r where from_ayah = 999 returning to_jsonb(r) as row`,
  },
  supplication_speaker_revision: revisionRows("supplication_speaker_revision", "speaker_id", "supplication_speaker"),
  supplication_revision: revisionRows("supplication_revision", "supplication_id", "supplication"),
};

/** What the site's database role is asked to do to the audit, by how a scenario names it. */
const CHANGES: Record<string, string> = {
  "update a content audit row's actor": `update content_audit set actor = 'someone-else' where id = (select min(id) from content_audit)`,
  "update every content audit row's after": `update content_audit set after = '{}'::jsonb`,
  "delete a content audit row": `delete from content_audit where id = (select min(id) from content_audit)`,
  "delete every content audit row": `delete from content_audit`,
  "truncate the content audit": `truncate content_audit`,
};

/** Every content audit row, as sorted-key JSON, in the order they were written. */
const everyAuditRow = async () => {
  await expectAudit();
  return (await database().query(`select * from content_audit order by id`)).rows.map((row) => JSON.stringify(row, Object.keys(row).sort()));
};

/** Take out Surah 114's Allah references and revisions, as a hand-run fix would. */
async function emptySurah114() {
  if (!(await hasTable(REFERENCES))) return;
  await database().query(`delete from "${REFERENCES}" where surah = 114`);
  await database().query(`delete from "${REVISIONS}" where surah = 114`);
}

/** The Allah reference seed run as the owner runs it, against the run's own Postgres; whether it succeeded, and what it printed. */
async function runSeed(file: string): Promise<{ ok: boolean; output: string }> {
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  try {
    const { stdout, stderr } = await promisify(execFile)("pnpm", ["run", "--silent", "db:seed-allah-references", file], { cwd: WEB, env, encoding: "utf8" });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${stdout}\n${stderr}\n${message}` };
  }
}

/** `tables` as a step names them: "`a`, `b` and `c`". */
const tableList = (tables: readonly string[]) => {
  const quoted = tables.map((t) => `\`${t}\``);
  return `${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`;
};

/** Every row of `table` has exactly one insert audited by `actor`, keyed by its primary key, with the row after it and nothing before. */
async function expectEveryRowLoadedBy(table: string, actor: string) {
  const { rows } = await database().query<{ total: string; missing: string }>(
    `select count(*) as total,
            count(*) filter (where (select count(*) from content_audit a
               where a.table_name = $1 and a.operation = 'insert' and a.actor = $2 and a.before is null
                 and a.after = to_jsonb(t)
                 and a.row_key = (select jsonb_object_agg(k, to_jsonb(t) -> k) from unnest($3::text[]) as k)) <> 1) as missing
       from "${table}" as t`,
    [table, actor, await primaryKeyOf(table)],
  );
  expect(Number(rows[0].total), `rows of \`${table}\``).toBeGreaterThan(0);
  expect(Number(rows[0].missing), `rows of \`${table}\` without exactly one insert audited by ${actor}`).toBe(0);
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  let admin: string | undefined;
  let mark = 0;
  let answer: Answer | undefined;
  /** The He → You Iltifat at 1:2–5 before the scenario saved it. */
  let iltifat: Row | undefined;
  /** The row a scenario inserted, updated and deleted, as each step answered it. */
  let written: { table: string; inserted: Row; updated: Row; deleted: Row } | undefined;
  let publishedRevision: string | undefined;
  let seeded: { ok: boolean; output: string } | undefined;
  let noted: string[] | undefined;
  let refusal: Error | undefined;
  let touched114 = false;

  BeforeEachScenario(() => {
    signedIn = admin = answer = iltifat = written = publishedRevision = seeded = noted = refusal = undefined;
    mark = 0;
    touched114 = false;
  });

  // Put the He → You Iltifat back through the endpoint, and take out Surah 114's Allah references.
  AfterEachScenario(async () => {
    if (touched114) await emptySurah114();
    if (!iltifat) return;
    const now = (await database().query(HE_TO_YOU_AT_15)).rows[0] as Row;
    if (now.reason === iltifat.reason) return;
    const back = await send(
      "PUT",
      `/api/v1/iltifat/${iltifat.id}`,
      credentialHeaders("session cookie", await signIn(ADMIN_EMAIL)),
      JSON.stringify({ base: now.version, reason: iltifat.reason, ayahFrom: iltifat.ayah_from, ayahTo: iltifat.ayah_to, disputed: iltifat.disputed, markedWords: [] }),
    );
    expect(back.status, `the He → You Iltifat at 1:2–5 is put back (${back.text.slice(0, 200)})`).toBe(200);
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

    for (const [content, tables] of [
      ["Themes", ["theme_category", "theme", "ayah_theme"]],
      ["Supplications", ["supplication_speaker", "supplication"]],
    ] as const) {
      step(`\`pnpm db:migrate\` has loaded the ${content} into the run's database`, async () => {
        for (const table of tables) expect(await hasTable(table), `db:migrate made the table \`${table}\``).toBe(true);
        await expectAudit();
      });

      step(
        `every row of ${tableList(tables)} has one insert audited by {string}, keyed by its primary key, with the row as loaded after it and nothing before`,
        async (_, actor: string) => {
          for (const table of tables) await expectEveryRowLoadedBy(table, actor);
        },
      );
    }

    step("I am signed in as the Admin", async () => {
      signedIn = await signIn(ADMIN_EMAIL);
      admin = await accountId(signedIn);
    });

    step("I note the latest content audit row", async () => {
      mark = await auditMark();
    });

    step("I save the He → You Iltifat at 1:2–5 with the reason {string}", async (_, reason: string) => {
      const { rows } = await database().query(HE_TO_YOU_AT_15);
      expect(rows.length, "one He → You Iltifat cited at 1:5").toBe(1);
      iltifat = rows[0] as Row;
      answer = await send(
        "PUT",
        `/api/v1/iltifat/${iltifat.id}`,
        credentialHeaders("session cookie", signedIn),
        JSON.stringify({ base: iltifat.version, reason, ayahFrom: iltifat.ayah_from, ayahTo: iltifat.ayah_to, disputed: iltifat.disputed, markedWords: [] }),
      );
    });

    step("the save succeeds", () => {
      expect(answer?.status, answer?.text.slice(0, 200)).toBe(200);
    });

    step(
      "the content audit since holds an update of that Iltifat in `iltifat`, by the Admin's Account id, keyed by its id, with its old reason before and {string} after",
      async (_, reason: string) => {
        const updates = (await since("iltifat")).filter((r) => r.operation === "update");
        expect(
          updates.map((r) => ({ actor: r.actor, key: r.row_key, before: r.before?.reason, after: r.after?.reason })),
          "updates of `iltifat` since",
        ).toEqual([{ actor: adminId(), key: { id: Number(iltifat!.id) }, before: iltifat!.reason, after: reason }]);
      },
    );

    step("the content audit since holds an insert into `iltifat_revision`, by the Admin's Account id, of the revision the save wrote", async () => {
      const { rows } = await database().query(`select to_jsonb(r) as row from iltifat_revision r where iltifat_id = $1 order by id desc limit 1`, [iltifat!.id]);
      const revision = rows[0]?.row as Row | undefined;
      expect(revision, "the revision the save wrote").toBeDefined();
      await oneInsert("iltifat_revision", adminId(), (r) => JSON.stringify(r.after) === JSON.stringify(revision));
    });

    step("Surah 114 holds no Allah reference", async () => {
      touched114 = true;
      await emptySurah114();
    });

    step(
      "an Allah reference publish by the Admin adds 114:1:1 to Surah 114, in one transaction that names the Admin's Account id as its actor",
      async () => {
        const client = await database().connect();
        try {
          await client.query("begin");
          await setAuditActor(client, adminId());
          await client.query(`insert into "${REFERENCES}" (id, location, surah) values (gen_random_uuid()::text, '114:1:1', 114)`);
          const { rows } = await client.query(
            `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
             values (gen_random_uuid()::text, 114, $1, now(), '["114:1:1"]'::jsonb, '[]'::jsonb, 0, 1) returning id`,
            [adminId()],
          );
          publishedRevision = rows[0].id as string;
          await client.query("commit");
        } catch (error) {
          await client.query("rollback");
          throw error;
        } finally {
          client.release();
        }
      },
    );

    step("the content audit since holds an insert into `allahReference` of 114:1:1, by the Admin's Account id", async () => {
      await oneInsert(REFERENCES, adminId(), (r) => r.after?.location === "114:1:1");
    });

    step("the content audit since holds an insert into `allahReferenceRevision` of the publish's revision, by the Admin's Account id", async () => {
      await oneInsert(REVISIONS, adminId(), (r) => r.after?.id === publishedRevision);
    });

    step("I run the Allah reference seed with a file holding 114:1:1 and 114:2:1", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-audit-"));
      const file = path.join(dir, "allah-references.json");
      fs.writeFileSync(file, JSON.stringify(["114:1:1", "114:2:1"]));
      seeded = await runSeed(file);
    });

    step("the seed succeeds", () => {
      expect(seeded?.ok, seeded?.output).toBe(true);
    });

    step("the content audit since holds an insert into `allahReference` of each of 114:1:1 and 114:2:1, by {string}", async (_, actor: string) => {
      for (const location of ["114:1:1", "114:2:1"]) await oneInsert(REFERENCES, actor, (r) => r.after?.location === location);
    });

    step("the content audit since holds an insert into `allahReferenceRevision` of the seed revision for Surah 114, by {string}", async (_, actor: string) => {
      await oneInsert(REVISIONS, actor, (r) => r.after?.surah === 114 && r.after?.author === "seed");
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

    step("the content audit holds rows", async () => {
      await expectAudit();
      expect(await auditMark(), "content audit rows").toBeGreaterThan(0);
    });

    step("I note every content audit row", async () => {
      noted = await everyAuditRow();
    });

    step("I {any}, connected as the site's database role", async (_, change: string) => {
      const text = CHANGES[change];
      if (!text) throw new Error(`no change named "${change}"`);
      // support's database() connects with the DATABASE_URL the server under test runs with.
      refusal = await database().query(text).then(
        () => undefined,
        (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
      );
    });

    step("the database refuses it", () => {
      expect(refusal, "the database refused the change").toBeInstanceOf(Error);
      expect(refusal!.message, "refused by the audit's guard, not for want of the table").not.toMatch(/does not exist/);
    });

    step("every content audit row is as noted", async () => {
      expect(await everyAuditRow()).toEqual(noted);
    });
  });

  Scenario("The Theme load is audited as an insert of every Theme row, by `migration`", () => {});
  Scenario("The Supplication load is audited as an insert of every Speaker and Supplication row, by `migration`", () => {});
  Scenario("An Admin's Iltifat save is audited under the Admin's Account id", () => {});
  Scenario("An Admin's Allah reference publish is audited under the Admin's Account id", () => {});
  Scenario("The Allah reference seed is audited as `seed`", () => {});
  ScenarioOutline("A change to `<table>` that names no actor is audited as an insert, an update and a delete by `unknown`", () => {});
  ScenarioOutline("A change to the Supplications' `<table>` that names no actor is audited as an insert, an update and a delete by `unknown`", () => {});
  ScenarioOutline("The site's database role cannot <change>", () => {});
});
