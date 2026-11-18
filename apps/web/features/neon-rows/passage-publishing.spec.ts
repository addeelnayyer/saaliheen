// #171 AC-3, AC-4 and the endpoint half of AC-9: an Admin's one Publish of a
// Surah's Passage, Phrase and Allah reference edits, POST /api/v1/passages/{surah},
// over HTTP against the production build and the run's own Postgres. The
// database is read only to check what a Publish wrote, and written only to
// arrange a precondition: Surah 107 put back as loaded, "another Admin's
// Publish" written as a Publish writes one, and a table made to refuse a row.

import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { auditMark, auditRowsSince, type AuditRow } from "../api/audit";
import { accountId, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "../api/support";
import { committedPassages } from "../site/committed-output.ts";
import { inTransaction, putBackAsLoaded } from "./neon-passages";

const feature = await loadFeature("./passage-publishing.feature");

type StepFn = Parameters<StepTest["Given"]>[1];
type Row = Record<string, unknown>;

const SURAH = 107;
/** The address of Surah `surah`'s Passages: POST publishes edits to them. */
const ENDPOINT = (surah: number) => `/api/v1/passages/${surah}`;
const ALLAH_ENDPOINT = (surah: number) => `/api/v1/allah-references/${surah}`;
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";
/** Who "another Admin's Publish" names as its author. */
const ANOTHER_ADMIN = "another-admin-of-issue-171";
/** The trigger "the run's database refuses any row" installs, and its function; put back drops it. */
const REFUSAL = "refuse_rows_of_issue_171";
/** Surah 107 put back as loaded, the refusing trigger dropped. */
async function putBack() {
  await putBackAsLoaded(SURAH, async (db) => {
    await db.query(`drop trigger if exists ${REFUSAL} on passage_revision`);
    await db.query(`drop trigger if exists ${REFUSAL} on "${REVISIONS}"`);
  });
}

interface Passage {
  from: number;
  till: number;
  en: string;
  ur: string;
}
interface Phrase {
  first: string;
  last: string;
}

/** Surah 107's Passages as the Passages file held them. */
const loaded = (): Passage[] =>
  committedPassages()
    .filter((p) => p.surah_no === SURAH)
    .sort((a, b) => a.ayah_from - b.ayah_from)
    .map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur }));
const loadedAt = (from: number) => {
  const passage = loaded().find((p) => p.from === from);
  if (!passage) throw new Error(`no loaded Passage of Surah ${SURAH} begins at Ayah ${from}`);
  return passage;
};

/** The edits written in a step, a retitle's Urdu title "as loaded" taken from the Passages file. */
function editsOf(json: string): Row[] {
  const edits = JSON.parse(json.replace(/^`|`$/g, "")) as Row[];
  return edits.map((e) => (e.kind === "retitle" && e.ur === "as loaded" ? { ...e, ur: loadedAt(Number(e.from)).ur } : e));
}

/** Every Word location written in `text`, in the order written. */
const locationsIn = (text: string): string[] => text.match(/\d+:\d+:\d+/g) ?? [];
/** The Phrases written in `text` as "s:a:w–s:a:w", in order. */
const phrasesIn = (text: string): Phrase[] =>
  [...text.matchAll(/(\d+:\d+:\d+)–(\d+:\d+:\d+)/g)].map((m) => ({ first: m[1], last: m[2] }));

// ---------------------------------------------------------------- the database

/** Surah 107's Passages as stored, in Ayah order. */
async function storedPassages(): Promise<Passage[]> {
  const { rows } = await database().query<{ ayah_from: number; ayah_till: number; title_en: string; title_ur: string }>(
    `select ayah_from, ayah_till, title_en, title_ur from passage where surah = $1 order by ayah_from`,
    [SURAH],
  );
  return rows.map((r) => ({ from: r.ayah_from, till: r.ayah_till, en: r.title_en, ur: r.title_ur }));
}

/** Surah 107's Phrases as stored, in reading order. */
async function storedPhrases(): Promise<Phrase[]> {
  const { rows } = await database().query<{ first_word: string; last_word: string }>(`select first_word, last_word from phrase where surah = $1`, [SURAH]);
  const order = (l: string) => l.split(":").map(Number).reduce((n, x) => n * 1000 + x, 0);
  return rows.map((r) => ({ first: r.first_word, last: r.last_word })).sort((a, b) => order(a.first) - order(b.first));
}

/** Surah 107's Allah references as stored, sorted. */
async function storedReferences(): Promise<string[]> {
  const { rows } = await database().query<{ location: string }>(`select location from "${REFERENCES}" where surah = $1`, [SURAH]);
  return rows.map((r) => r.location).sort();
}

interface Revision {
  author: string;
  created_at: Date;
  edits: unknown;
  base: number;
  version: number;
}
/** Surah 107's Passage revisions other than the seed, in version order. */
async function revisionsSinceSeed(): Promise<Revision[]> {
  const { rows } = await database().query<Revision>(
    `select author, created_at, edits, base, version from passage_revision where surah = $1 and author <> 'seed' order by version`,
    [SURAH],
  );
  return rows;
}

interface ReferenceRevision {
  author: string;
  createdAt: Date;
  added: unknown;
  removed: unknown;
  base: number;
  version: number;
}
async function referenceRevisions(): Promise<ReferenceRevision[]> {
  const { rows } = await database().query<ReferenceRevision>(
    `select author, "createdAt", added, removed, base, version from "${REVISIONS}" where surah = $1 order by version`,
    [SURAH],
  );
  return rows;
}

/** A JSON column's list, parsed when stored as text. */
const listOf = (value: unknown): unknown[] => (typeof value === "string" ? JSON.parse(value) : (value as unknown[]));

/** What an answer said, for a failure's message: its JSON, or its status and type when it is not JSON. */
const said = (a: Answer | undefined) =>
  a === undefined ? "no answer" : a.json !== undefined ? JSON.stringify(a.json).slice(0, 500) : `${a.status}, not JSON (${a.headers.get("content-type")})`;

const justNow = (at: Date) => Math.abs(Date.now() - new Date(at).getTime()) < 120_000;

// ---------------------------------------------------------------- the answer

interface PublishAnswer {
  surah: number;
  version: number;
  passages: Passage[];
  phrases: Phrase[];
  allahReferences: { surah: number; version: number; locations: string[] };
}

/**
 * The Passages a step writes: "1–3 as loaded", or "1–3 titled "X" in English
 * and as loaded in Urdu", joined by ", " and ", and ".
 */
function passagesWritten(text: string): Passage[] {
  return text.split(/, and |, (?=\d)/).map((part) => {
    const m = /^(\d+)–(\d+) (?:as loaded|titled "([^"]*)" in English and as loaded in Urdu)$/.exec(part.trim());
    if (!m) throw new Error(`not a Passage as written: ${part}`);
    const [from, till] = [Number(m[1]), Number(m[2])];
    const at = loadedAt(from);
    return { from, till, en: m[3] ?? at.en, ur: at.ur };
  });
}

// ---------------------------------------------------------------- the scenarios

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, AfterEachScenario, BeforeEachScenario, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  let answer: Answer | undefined;
  let sentEdits: Row[] = [];
  let mark = 0;
  let both: { answer: Answer; edits: Row[] }[] = [];

  BeforeEachScenario(() => {
    signedIn = answer = undefined;
    sentEdits = [];
    both = [];
    mark = 0;
  });
  AfterEachScenario(async () => {
    await putBack();
  });

  const body = () => answer!.json as PublishAnswer;
  const adminId = () => {
    if (!signedIn) throw new Error("not signed in in this scenario");
    return accountId(signedIn);
  };

  /** Publish `edits` to Surah 107 against Passage version `base`, with Allah reference `changes` against `allahBase` when given, with `credential`. */
  async function publish(edits: Row[], base: number, credential: string, allah?: { changes: string[]; base: number }, surah = SURAH) {
    sentEdits = edits;
    mark = await auditMark();
    const request = { base, edits, ...(allah ? { allahReferences: allah } : {}) };
    answer = await send("POST", ENDPOINT(surah), credentialHeaders(credential, signedIn), JSON.stringify(request));
  }

  /** Publish as a step writes it: "Surah 107's edits `[...]` against Passage version N[, with the Allah reference changes "..." against Allah reference version M], with <credential>". */
  async function publishAsWritten(text: string) {
    const m = /^I publish Surah 107's edits (`[^`]*`) against Passage version (\d+), (?:with the Allah reference changes "([^"]*)" against Allah reference version (\d+), )?with (.+)$/.exec(text);
    if (!m) throw new Error(`not a Publish as written: ${text}`);
    const allah = m[3] === undefined ? undefined : { changes: locationsIn(m[3]), base: Number(m[4]) };
    await publish(editsOf(m[1]), Number(m[2]), m[5], allah);
  }

  /** `text` with each <name> of an outline's Examples filled in. */
  const fill = (text: string, variables: Record<string, string>) => text.replace(/<([^>]+)>/g, (_, name: string) => variables[name] ?? `<${name}>`);

  async function anotherAdminsJoin() {
    await inTransaction(async (db) => {
      await db.query(`update passage set ayah_till = 7 where surah = $1 and ayah_from = 1`, [SURAH]);
      await db.query(`delete from passage where surah = $1 and ayah_from = 4`, [SURAH]);
      await db.query(
        `insert into passage_revision (surah, author, created_at, edits, base, version) values ($1, $2, now(), $3::jsonb, 1, 2)`,
        [SURAH, ANOTHER_ADMIN, JSON.stringify([{ kind: "join", from: 4 }])],
      );
    });
  }

  async function anotherAllahPublish(added: string[]) {
    await inTransaction(async (db) => {
      await db.query(
        `insert into "${REFERENCES}" (id, location, surah) select gen_random_uuid()::text, l, $2 from unnest($1::text[]) as l`,
        [added, SURAH],
      );
      await db.query(
        `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
         values (gen_random_uuid()::text, $1, $2, now(), $3::jsonb, '[]'::jsonb, 0, 1)`,
        [SURAH, ANOTHER_ADMIN, JSON.stringify(added)],
      );
    });
  }

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("I publish to Surah {int} the edits {any}", async (_, surah: number, rest: string) => {
      const m = /^(`[^`]*`) against Passage version (\d+), with (.+)$/.exec(rest);
      if (!m) throw new Error(`not a Publish as written: ${rest}`);
      await publish(editsOf(m[1]), Number(m[2]), m[3], undefined, surah);
    });

    step("no content audit row is written since the Publish was sent", async () => {
      expect(mark, "no Publish was sent").toBeGreaterThan(0);
      expect(await auditRowsSince(mark)).toEqual([]);
    });

    step("I publish Surah 107's edits {any}", async (_, rest: string) => {
      await publishAsWritten(`I publish Surah 107's edits ${rest}`);
    });

    step("the answer's status is {int}", (_, status: number) => {
      expect(answer?.status, said(answer)).toBe(status);
    });

    step("that answer's status is {int} too", (_, status: number) => {
      expect(answer?.status, said(answer)).toBe(status);
    });

    step("the answer has an error", () => {
      expect(typeof (answer?.json as { error?: unknown } | undefined)?.error, said(answer)).toBe("string");
    });

    step("the answer holds exactly a surah, a version, its passages, its phrases and its allahReferences", () => {
      expect(Object.keys(body()).sort()).toEqual(["allahReferences", "passages", "phrases", "surah", "version"]);
    });

    step("the answer is for Surah {int}, at Passage version {int}", (_, surah: number, version: number) => {
      expect({ surah: body().surah, version: body().version }).toEqual({ surah, version });
    });

    step("the answer holds exactly one Passage, 1–7, with Passage 1–3's titles as loaded", () => {
      expect(body().passages).toEqual([{ from: 1, till: 7, en: loadedAt(1).en, ur: loadedAt(1).ur }]);
    });

    step("the answer's Passages are {any}", (_, written: string) => {
      expect(body().passages).toEqual(passagesWritten(written));
    });

    step("the answer's Phrases are exactly {string}", (_, written: string) => {
      expect(body().phrases).toEqual(phrasesIn(written));
    });

    step("Surah 107's Passages and Phrases in the database are those the answer holds", async () => {
      expect({ passages: await storedPassages(), phrases: await storedPhrases() }).toEqual({ passages: body().passages, phrases: body().phrases });
    });

    step("Surah 107's Passages and Phrases in the database are as loaded", async () => {
      expect({ passages: await storedPassages(), phrases: await storedPhrases() }).toEqual({ passages: loaded(), phrases: [] });
    });

    step("Surah 107's Phrases in the database are exactly {string}", async (_, written: string) => {
      expect(await storedPhrases()).toEqual(phrasesIn(written));
    });

    step("Surah 107's Allah references in the database are exactly {string}", async (_, written: string) => {
      expect(await storedReferences()).toEqual(locationsIn(written).sort());
    });

    step(
      "Surah 107 has exactly one Passage revision since the seed, by the Admin's Account, made just now, holding the edits sent, from version {int} to version {int}",
      async (_, base: number, version: number) => {
        const revisions = await revisionsSinceSeed();
        expect(revisions.length, "Passage revisions since the seed").toBe(1);
        const [r] = revisions;
        expect({ author: r.author, edits: listOf(r.edits), base: r.base, version: r.version }).toEqual({ author: await adminId(), edits: sentEdits, base, version });
        expect(justNow(r.created_at), `made just now: ${String(r.created_at)}`).toBe(true);
      },
    );

    step(
      "Surah 107 has exactly {int} Passage revisions since the seed, by the Admin's Account, from version {int} to version {int}",
      async (_, count: number, from: number, to: number) => {
        const revisions = await revisionsSinceSeed();
        const admin = await adminId();
        expect(revisions.map((r) => ({ author: r.author, base: r.base, version: r.version }))).toEqual(
          Array.from({ length: count }, (_, i) => ({ author: admin, base: from + i, version: from + i + 1 })),
        );
        expect(to).toBe(from + count);
      },
    );

    step("Surah 107 has exactly one Passage revision since the seed, by another Admin, from version 1 to version 2", async () => {
      expect((await revisionsSinceSeed()).map((r) => ({ author: r.author, base: r.base, version: r.version }))).toEqual([
        { author: ANOTHER_ADMIN, base: 1, version: 2 },
      ]);
    });

    step("Surah 107 has no Passage revision since the seed", async () => {
      expect(await revisionsSinceSeed()).toEqual([]);
    });

    step("Surah 107 has no Allah reference and no Allah reference revision", async () => {
      expect({ references: await storedReferences(), revisions: await referenceRevisions() }).toEqual({ references: [], revisions: [] });
    });

    step("another Admin's Publish has joined Surah 107's Passage 4–7 into 1–3, at Passage version 2", async () => {
      await anotherAdminsJoin();
    });

    step("another publish of Surah 107's Allah references has added 107:2:1, at Allah reference version 1", async () => {
      await anotherAllahPublish(["107:2:1"]);
    });

    step("the answer's latest is for Surah 107, at Passage version 2, with exactly one Passage, 1–7, and no Phrase", () => {
      const latest = (answer?.json as { latest?: PublishAnswer } | undefined)?.latest;
      expect({ surah: latest?.surah, version: latest?.version, passages: latest?.passages, phrases: latest?.phrases }).toEqual({
        surah: SURAH,
        version: 2,
        passages: [{ from: 1, till: 7, en: loadedAt(1).en, ur: loadedAt(1).ur }],
        phrases: [],
      });
    });

    // -------------------------------------------------- two at once

    step("I publish, at the same moment, Surah 107's edits {any} and {any}, both against Passage version {int}", async (_, a: string, b: string, base: number) => {
      mark = await auditMark();
      const lists = [editsOf(a), editsOf(b)];
      const answers = await Promise.all(
        lists.map((edits) => send("POST", ENDPOINT(SURAH), credentialHeaders("session cookie", signedIn), JSON.stringify({ base, edits }))),
      );
      both = answers.map((a, i) => ({ answer: a, edits: lists[i] }));
    });

    step("one of the two answers is 200 and the other 409", () => {
      expect(both.map((b) => b.answer.status).sort()).toEqual([200, 409]);
    });

    const passed = () => both.find((b) => b.answer.status === 200)!;

    step("Surah 107's Passages and Phrases in the database are those the Publish answered 200 holds", async () => {
      const held = passed().answer.json as PublishAnswer;
      expect({ passages: await storedPassages(), phrases: await storedPhrases() }).toEqual({ passages: held.passages, phrases: held.phrases });
    });

    step(
      "Surah 107 has exactly one Passage revision since the seed, by the Admin's Account, holding the edits of the Publish answered 200, from version 1 to version 2",
      async () => {
        expect((await revisionsSinceSeed()).map((r) => ({ author: r.author, edits: listOf(r.edits), base: r.base, version: r.version }))).toEqual([
          { author: await adminId(), edits: passed().edits, base: 1, version: 2 },
        ]);
      },
    );

    // -------------------------------------------------- Allah references

    step("the answer's Allah references are for Surah 107, at version {int}, with the Word locations {string}", (_, version: number, written: string) => {
      const refs = body().allahReferences;
      expect({ surah: refs?.surah, version: refs?.version, locations: [...(refs?.locations ?? [])].sort() }).toEqual({
        surah: SURAH,
        version,
        locations: locationsIn(written).sort(),
      });
    });

    step(
      "Surah 107 has exactly one Allah reference revision, by the Admin's Account, made just now, adding {string} and removing nothing, from version {int} to version {int}",
      async (_, added: string, base: number, version: number) => {
        const revisions = await referenceRevisions();
        expect(revisions.length, "Allah reference revisions").toBe(1);
        const [r] = revisions;
        expect({ author: r.author, added: listOf(r.added).map(String).sort(), removed: listOf(r.removed), base: r.base, version: r.version }).toEqual({
          author: await adminId(),
          added: locationsIn(added).sort(),
          removed: [],
          base,
          version,
        });
        expect(justNow(r.createdAt), `made just now: ${String(r.createdAt)}`).toBe(true);
      },
    );

    step(
      "the Allah references endpoint, read with neither cookie nor token, answers Surah 107 at version {int} with the Word locations {string}",
      async (_, version: number, written: string) => {
        const read = await send("GET", ALLAH_ENDPOINT(SURAH), {});
        const json = read.json as { surah: number; version: number; locations: string[] };
        expect({ status: read.status, surah: json?.surah, version: json?.version, locations: [...(json?.locations ?? [])].sort() }).toEqual({
          status: 200,
          surah: SURAH,
          version,
          locations: locationsIn(written).sort(),
        });
      },
    );

    // -------------------------------------------------- the audit

    step("every content audit row written since the Publish was sent names the Admin's Account as its actor", async () => {
      const rows = await auditRowsSince(mark);
      expect(rows.length, "content audit rows since the Publish").toBeGreaterThan(0);
      const admin = await adminId();
      expect(rows.filter((r) => r.actor !== admin).map((r) => `${r.table_name} ${r.operation} by ${r.actor}`)).toEqual([]);
    });

    step(
      "the content audit rows of the Passage and Allah reference tables written since the Publish was sent are exactly these:",
      async (_, table: { table: string; operation: string; key: string }[]) => {
        const tables = ["passage", "phrase", "passage_revision", REFERENCES, REVISIONS];
        const rows = (await auditRowsSince(mark)).filter((r) => tables.includes(r.table_name));
        const described = rows.map((r) => `${r.table_name} ${r.operation} ${describe(r)}`).sort();
        expect(described).toEqual(table.map((t) => `${t.table} ${t.operation} ${t.key}`).sort());
      },
    );
  });

  /** An audit row's key as the scenario writes it. */
  function describe(r: AuditRow): string {
    const row = (r.after ?? r.before)!;
    const range = (x: Row | null) => `${x?.ayah_from}–${x?.ayah_till}`;
    switch (r.table_name) {
      case "passage":
        return r.operation === "update" ? `Passage ${range(r.before)}, now ${range(r.after)}` : `Passage ${range(row)}`;
      case "phrase":
        return `Phrase ${row.first_word}–${row.last_word}`;
      case REFERENCES:
        return String(row.location);
      default:
        return `version ${row.version}`;
    }
  }

  Background(({ Given }) => {
    Given("Surah 107 holds its Passages as loaded, no Phrase, its seed Passage revision only, and no Allah reference", async () => {
      await putBack();
    });
  });

  Scenario("An Admin's Publish writes the changed rows and one Passage revision naming the Admin, and answers them at the next version", () => {});
  Scenario("A Publish through the bearer token passes too, and each Publish moves the Passage version on by one", () => {});
  Scenario("Missing Phrases never block a Publish: a Surah with no Phrase publishes Passage edits alone", () => {});

  const PUBLISH_V1 = "I publish Surah 107's edits `<edits>` against Passage version 1, with session cookie";

  ScenarioOutline('A Publish breaking a Passage or Phrase rule is refused with its reason, "<reason>", and nothing is written', ({ When, And }, variables) => {
    When(PUBLISH_V1, async () => {
      await publishAsWritten(fill(PUBLISH_V1, variables));
    });
    And('the answer\'s error says "<reason>"', () => {
      expect((answer?.json as { error?: string } | undefined)?.error ?? said(answer)).toContain(variables.reason);
    });
  });

  Scenario("A Publish whose edit no longer applies to the Surah's rows is refused, and nothing is written", ({ And }) => {
    And('the answer\'s error says "no longer applies"', () => {
      expect((answer?.json as { error?: string } | undefined)?.error ?? said(answer)).toContain("no longer applies");
    });
  });

  ScenarioOutline("A Publish of <what> is refused 400, and nothing is written", ({ When }, variables) => {
    When("I publish <what>, Surah 107's edits `<edits>`, against Passage version 1, with session cookie", async () => {
      await publish(editsOf(variables.edits), 1, "session cookie");
    });
  });

  Scenario("A Publish to Surah 115 is refused 404, and nothing is written", () => {});

  ScenarioOutline("A Publish against Passage version <base> is refused as a clash with the latest Passages and Phrases, and nothing is written", ({ When }, variables) => {
    const text = 'I publish Surah 107\'s edits `[{"kind":"mark","first":"107:2:1","last":"107:2:4"}]` against Passage version <base>, with session cookie';
    When(text, async () => {
      await publishAsWritten(fill(text, variables));
    });
  });

  Scenario("Two Publishes against the same version at once: one lands whole, the other is refused as a clash and writes nothing", () => {});

  ScenarioOutline("A Publish from <email> with <credential> is refused <status>, and nothing is written", ({ Given, When, Then }, variables) => {
    Given('I am signed in as "<email>"', async () => {
      signedIn = await signIn(variables.email);
    });
    const text = 'I publish Surah 107\'s edits `[{"kind":"join","from":4}]` against Passage version 1, with <credential>';
    When(text, async () => {
      await publishAsWritten(fill(text, variables));
    });
    Then("the answer's status is <status>", () => {
      expect(answer?.status, said(answer)).toBe(Number(variables.status));
    });
  });

  Scenario("A Publish carrying Allah reference changes writes the Passage revision and the Allah reference revision in one transaction", () => {});
  Scenario("A Publish of Allah reference changes alone writes only the Allah reference revision, and the Passage version stays", () => {});

  ScenarioOutline('A Publish of `<edits>` with the Allah reference changes "<changes>", one of them refused, writes neither revision', ({ When }, variables) => {
    const text = 'I publish Surah 107\'s edits `<edits>` against Passage version 1, with the Allah reference changes "<changes>" against Allah reference version 0, with session cookie';
    When(text, async () => {
      await publishAsWritten(fill(text, variables));
    });
  });

  ScenarioOutline("A Publish whose second write fails, refused by the database's <table>, leaves neither revision written", ({ Given }, variables) => {
    Given('the run\'s database refuses any row of "<table>" for Surah 107', async () => {
      const table = variables.table;
      await database().query(
        `create or replace function ${REFUSAL}() returns trigger language plpgsql as $$ begin raise exception 'refused for #171''s scenario'; end $$`,
      );
      await database().query(`create trigger ${REFUSAL} before insert on "${table}" for each row when (new.surah = ${SURAH}) execute function ${REFUSAL}()`);
    });
  });

  ScenarioOutline("A Publish clashes when either version has moved, here because <arranged>, answering the latest of both, and nothing is written", ({ Given, And }, variables) => {
    And('Surah 107\'s Allah references in the database are exactly "<locations>"', async () => {
      expect(await storedReferences()).toEqual(locationsIn(variables.locations).sort());
    });
    Given("<arranged>", async () => {
      if (variables.arranged.startsWith("another Admin's Publish")) await anotherAdminsJoin();
      else await anotherAllahPublish(["107:2:1"]);
    });
    And(
      'the answer\'s latest is for Surah 107, at Passage version <passage version>, with Allah references at version <allah version>, with the Word locations "<locations>"',
      () => {
        const latest = (answer?.json as { latest?: PublishAnswer } | undefined)?.latest;
        expect({
          surah: latest?.surah,
          version: latest?.version,
          allah: latest?.allahReferences?.version,
          locations: [...(latest?.allahReferences?.locations ?? [])].sort(),
        }).toEqual({
          surah: SURAH,
          version: Number(variables["passage version"]),
          allah: Number(variables["allah version"]),
          locations: locationsIn(variables.locations).sort(),
        });
      },
    );
  });

  Scenario("A Publish's content audit rows, through the endpoint, name the Admin's Account as their actor", () => {});
});
