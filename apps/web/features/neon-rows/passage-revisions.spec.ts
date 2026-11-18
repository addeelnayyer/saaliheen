// #174: a Surah's Passage revisions listed to Admins, GET
// /api/v1/passages/{surah}/revisions, and an Admin's undo of one, POST
// /api/v1/passages/{surah}/revisions/{version}/undo, over HTTP against the
// production build and the run's own Postgres. Revisions are made through the
// Publish endpoint, as the editor makes them; the database is read only to
// check what an undo wrote, and written only to arrange a revision whose rows
// were not recorded and to put Surah 107 back as loaded.

import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { auditMark, auditRowsSince } from "../api/audit";
import { accountId, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "../api/support";
import { committedPassages } from "../site/committed-output.ts";
import { get, inTransaction, putBackAsLoaded } from "./neon-passages";

const feature = await loadFeature("./passage-revisions.feature");

type StepFn = Parameters<StepTest["Given"]>[1];
type Row = Record<string, unknown>;

const SURAH = 107;
const PUBLISH = (surah: number) => `/api/v1/passages/${surah}`;
const REVISIONS = (surah: number) => `/api/v1/passages/${surah}/revisions`;
const UNDO = (surah: number, version: number) => `/api/v1/passages/${surah}/revisions/${version}/undo`;
/** Who "another Admin's revision" names as its author. */
const ANOTHER_ADMIN = "another-admin-of-issue-174";

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
interface Change<T> {
  before: T | null;
  after: T | null;
}
interface ListedRevision {
  version: number;
  base: number;
  createdAt: string;
  author: { kind: "seed" } | { kind: "admin"; email: string; name: string };
  edits: Row[];
  undoes: number | null;
  changes: { passages: Change<Passage>[]; phrases: Change<Phrase>[] } | null;
}
interface ListAnswer {
  surah: number;
  version: number;
  revisions: ListedRevision[];
}
interface SurahAnswer {
  surah: number;
  version: number;
  passages: Passage[];
  phrases: Phrase[];
  allahReferences: unknown;
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
/** Passage `from`–`till` with the titles the loaded Passage beginning at `from` has. */
const titledAsLoaded = (from: number, till: number): Passage => ({ ...loadedAt(from), till });

/** The edits written in a step, a retitle's Urdu title "as loaded" taken from the Passages file. */
function editsOf(json: string): Row[] {
  const edits = JSON.parse(json.replace(/^`|`$/g, "")) as Row[];
  return edits.map((e) => (e.kind === "retitle" && e.ur === "as loaded" ? { ...e, ur: loadedAt(Number(e.from)).ur } : e));
}

/** The Phrases written in `text` as "s:a:w–s:a:w", in order. */
const phrasesIn = (text: string): Phrase[] => [...text.matchAll(/(\d+:\d+:\d+)–(\d+:\d+:\d+)/g)].map((m) => ({ first: m[1], last: m[2] }));

/** A Passage as a step writes it, "1–3", titled as the loaded Passage at its first Ayah; null for "none". */
const passageWritten = (text: string): Passage | null => {
  if (text === "none") return null;
  const [from, till] = text.split("–").map(Number);
  return titledAsLoaded(from, till);
};
/** A Phrase as a step writes it, "107:1:1–107:1:4"; null for "none". */
const phraseWritten = (text: string): Phrase | null => (text === "none" ? null : phrasesIn(text)[0]);

/**
 * The changes a step writes after "changed ": each "the Passage 1–3 to 1–7",
 * "the Passage 4–7 to none" or "the Phrase 107:1:1–107:1:4 from none", joined
 * by " and ".
 */
function changesWritten(text: string): { passages: Change<Passage>[]; phrases: Change<Phrase>[] } {
  const changes = { passages: [] as Change<Passage>[], phrases: [] as Change<Phrase>[] };
  for (const part of text.split(/ and (?=the )/)) {
    const m = /^the (Passage|Phrase) (\S+) (to|from) (\S+)$/.exec(part.trim());
    if (!m) throw new Error(`not a change as written: ${part}`);
    const [first, second] = m[3] === "to" ? [m[2], m[4]] : [m[4], m[2]];
    if (m[1] === "Passage") changes.passages.push({ before: passageWritten(first), after: passageWritten(second) });
    else changes.phrases.push({ before: phraseWritten(first), after: phraseWritten(second) });
  }
  return changes;
}

/** Surah 107's Passages and Phrases as stored, in reading order. */
async function stored(): Promise<{ passages: Passage[]; phrases: Phrase[] }> {
  const db = database();
  const passages = await db.query<{ ayah_from: number; ayah_till: number; title_en: string; title_ur: string }>(
    `select ayah_from, ayah_till, title_en, title_ur from passage where surah = $1 order by ayah_from`,
    [SURAH],
  );
  const phrases = await db.query<{ first_word: string; last_word: string }>(`select first_word, last_word from phrase where surah = $1`, [SURAH]);
  const order = (l: string) => l.split(":").map(Number).reduce((n, x) => n * 1000 + x, 0);
  return {
    passages: passages.rows.map((r) => ({ from: r.ayah_from, till: r.ayah_till, en: r.title_en, ur: r.title_ur })),
    phrases: phrases.rows.map((r) => ({ first: r.first_word, last: r.last_word })).sort((a, b) => order(a.first) - order(b.first)),
  };
}

interface StoredRevision {
  version: number;
  base: number;
  author: string;
  created_at: Date;
  edits: unknown;
  undoes: number | null;
}
/** Surah 107's newest Passage revision as stored. */
async function newestRevision(): Promise<StoredRevision> {
  const { rows } = await database().query<StoredRevision>(
    `select version, base, author, created_at, edits, undoes from passage_revision where surah = $1 order by version desc limit 1`,
    [SURAH],
  );
  return rows[0];
}

/** What an answer said, for a failure's message. */
const said = (a: Answer | undefined) =>
  a === undefined ? "no answer" : a.json !== undefined ? JSON.stringify(a.json).slice(0, 500) : `${a.status}, not JSON (${a.headers.get("content-type")})`;

const justNow = (at: Date | string) => Math.abs(Date.now() - new Date(at).getTime()) < 120_000;

/** Surah 107's Passages in a client's file from /data/v1, once `wanted` holds of them or 30 seconds have passed. */
async function surahFilePassages(wanted: (passages: Passage[]) => boolean): Promise<Passage[]> {
  let passages: Passage[] = [];
  for (const until = Date.now() + 30_000; Date.now() < until; await new Promise((r) => setTimeout(r, 500))) {
    const res = await get(`/data/v1/surahs/${SURAH}.json`);
    passages = res.status === 200 ? ((await res.json()) as { passages: Passage[] }).passages : [];
    if (wanted(passages)) break;
  }
  return passages;
}
const sameAs = (expected: Passage[]) => (passages: Passage[]) => JSON.stringify(passages) === JSON.stringify(expected);

// ---------------------------------------------------------------- the scenarios

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, AfterEachScenario, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  let admin: SignedIn | undefined;
  let answer: Answer | undefined;
  let mark = 0;

  // Cleared after each scenario, not before: the Background signs the Admin in first.
  AfterEachScenario(async () => {
    signedIn = admin = answer = undefined;
    mark = 0;
    await putBackAsLoaded(SURAH);
  });

  const listed = () => answer!.json as ListAnswer;
  const surahAnswer = () => answer!.json as SurahAnswer;
  const adminId = () => {
    if (!admin) throw new Error("the Admin did not sign in in this scenario");
    return accountId(admin);
  };

  /** Publish `edits` to Surah 107 against `base` as the Admin, expecting it to pass. */
  async function published(edits: Row[], base: number) {
    const done = await send("POST", PUBLISH(SURAH), credentialHeaders("session cookie", admin), JSON.stringify({ base, edits }));
    expect(done.status, said(done)).toBe(200);
  }

  /** Undo Surah `surah`'s revision `version` with `body`, as `credential` names the signed-in Account's. */
  async function undo(surah: number, version: number, body: string, credential: string) {
    mark = await auditMark();
    answer = await send("POST", UNDO(surah, version), credentialHeaders(credential, signedIn), body);
  }

  async function list(surah: number, credential: string) {
    answer = await send("GET", REVISIONS(surah), credentialHeaders(credential, signedIn));
  }

  /** `text` with each <name> of an outline's Examples filled in. */
  const fill = (text: string, variables: Record<string, string>) => text.replace(/<([^>]+)>/g, (_, name: string) => variables[name] ?? `<${name}>`);

  /** Arrange what an outline's Given writes. */
  async function arrange(text: string) {
    if (text === "Surah 107 has its seed Passage revision only") return;
    if (text !== "another Admin's revision of Surah 107, its rows not recorded, is at version 2") throw new Error(`no arrangement ${text}`);
    await inTransaction(async (db) => {
      await db.query(`update passage set ayah_till = 7 where surah = $1 and ayah_from = 1`, [SURAH]);
      await db.query(`delete from passage where surah = $1 and ayah_from = 4`, [SURAH]);
      await db.query(`insert into passage_revision (surah, author, created_at, edits, base, version) values ($1, $2, now(), $3::jsonb, 1, 2)`, [
        SURAH,
        ANOTHER_ADMIN,
        JSON.stringify([{ kind: "join", from: 4 }]),
      ]);
    });
  }

  /** Revision `version` of the list answered. */
  const revisionAt = (version: number) => {
    const revision = listed().revisions.find((r) => r.version === version);
    if (!revision) throw new Error(`the list has no revision ${version}: ${said(answer)}`);
    return revision;
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
      if (email === "admin@saaliheen.test") admin = signedIn;
    });

    step("I have published Surah 107's edits {any} against Passage version {int}", async (_, edits: string, base: number) => {
      await published(editsOf(edits), base);
    });

    step("I have undone Surah 107's Passage revision {int} against Passage version {int}", async (_, version: number, base: number) => {
      const done = await send("POST", UNDO(SURAH, version), credentialHeaders("session cookie", admin), JSON.stringify({ base }));
      expect(done.status, said(done)).toBe(200);
    });

    step("I list Surah {int}'s Passage revisions with {any}", async (_, surah: number, credential: string) => {
      await list(surah, credential);
    });

    step("I undo Surah {int}'s Passage revision {int} against Passage version {int}, with {any}", async (_, surah: number, version: number, base: number, credential: string) => {
      await undo(surah, version, JSON.stringify({ base }), credential);
    });

    step("I undo Surah 107's Passage revision {int} sending {any}, with {any}", async (_, version: number, body: string, credential: string) => {
      await undo(SURAH, version, body.replace(/^`|`$/g, ""), credential);
    });

    step("the answer's status is {int}", (_, status: number) => {
      expect(answer?.status, said(answer)).toBe(status);
    });

    step("the undo's answer has an error", () => {
      expect(typeof (answer?.json as { error?: unknown } | undefined)?.error, said(answer)).toBe("string");
    });

    step("the answer has an error", () => {
      expect(typeof (answer?.json as { error?: unknown } | undefined)?.error, said(answer)).toBe("string");
    });

    step("the answer's error says {string}", (_, words: string) => {
      expect((answer?.json as { error?: string } | undefined)?.error ?? said(answer)).toContain(words);
    });

    // -------------------------------------------------- the list

    step("the answer is for Surah {int}, at Passage version {int}, listing versions {any} in that order", (_, surah: number, version: number, written: string) => {
      const versions = written.split(/, | and /).map(Number);
      expect({ surah: listed().surah, version: listed().version, versions: listed().revisions.map((r) => r.version) }).toEqual({ surah, version, versions });
    });

    step(
      "revision {int} is by the Admin's Account, made just now, on version {int}, undoing nothing, holding the edits {any}",
      (_, version: number, base: number, rest: string) => {
        const m = /^(`[^`]*`), and changed (.+)$/.exec(rest);
        if (!m) throw new Error(`not a revision as written: ${rest}`);
        const r = revisionAt(version);
        expect({ author: r.author.kind === "admin" && r.author.email, base: r.base, undoes: r.undoes, edits: r.edits, changes: r.changes }).toEqual({
          author: admin!.email,
          base,
          undoes: null,
          edits: editsOf(m[1]),
          changes: changesWritten(m[2]),
        });
        expect(justNow(r.createdAt), `made just now: ${r.createdAt}`).toBe(true);
      },
    );

    step("revision {int} is by the seed, on version {int}, with no edit and no changes recorded", (_, version: number, base: number) => {
      const r = revisionAt(version);
      expect({ author: r.author, base: r.base, edits: r.edits, undoes: r.undoes, changes: r.changes }).toEqual({ author: { kind: "seed" }, base, edits: [], undoes: null, changes: null });
    });

    // -------------------------------------------------- an undo

    step("the answer holds exactly a surah, a version, its passages, its phrases and its allahReferences", () => {
      expect(Object.keys(surahAnswer()).sort()).toEqual(["allahReferences", "passages", "phrases", "surah", "version"]);
    });

    step("the answer is for Surah {int}, at Passage version {int}", (_, surah: number, version: number) => {
      expect({ surah: surahAnswer().surah, version: surahAnswer().version }).toEqual({ surah, version });
    });

    step("the answer's Passages are as loaded, and it has no Phrase", () => {
      expect({ passages: surahAnswer().passages, phrases: surahAnswer().phrases }).toEqual({ passages: loaded(), phrases: [] });
    });

    step("the answer's Passages are as loaded, and its Phrases are exactly {string}", (_, written: string) => {
      expect({ passages: surahAnswer().passages, phrases: surahAnswer().phrases }).toEqual({ passages: loaded(), phrases: phrasesIn(written) });
    });

    step("the answer's Passages are exactly one Passage, 1–7, with Passage 1–3's titles as loaded", () => {
      expect(surahAnswer().passages).toEqual([titledAsLoaded(1, 7)]);
    });

    step("Surah 107's Passages and Phrases in the database are as loaded", async () => {
      expect(await stored()).toEqual({ passages: loaded(), phrases: [] });
    });

    step("Surah 107's Passages and Phrases in the database are those the answer holds", async () => {
      expect(await stored()).toEqual({ passages: surahAnswer().passages, phrases: surahAnswer().phrases });
    });

    step(
      "Surah 107's newest Passage revision is version {int}, by the Admin's Account, made just now, on version {int}, undoing version {int}, with no edit",
      async (_, version: number, base: number, undoes: number) => {
        const r = await newestRevision();
        const edits = typeof r.edits === "string" ? JSON.parse(r.edits) : r.edits;
        expect({ version: r.version, author: r.author, base: r.base, undoes: r.undoes, edits }).toEqual({ version, author: await adminId(), base, undoes, edits: [] });
        expect(justNow(r.created_at), `made just now: ${String(r.created_at)}`).toBe(true);
      },
    );

    step("Surah 107's newest Passage revision is version {int}", async (_, version: number) => {
      expect((await newestRevision()).version).toBe(version);
    });

    step("a client's Surah 107 file from /data/v1 has exactly one Passage, 1–7", async () => {
      expect(await surahFilePassages(sameAs([titledAsLoaded(1, 7)]))).toEqual([titledAsLoaded(1, 7)]);
    });

    step("within moments a client's Surah 107 file from /data/v1 has its Passages as loaded", async () => {
      expect(await surahFilePassages(sameAs(loaded()))).toEqual(loaded());
    });

    // -------------------------------------------------- clashes

    step("the answer's latest is for Surah 107, at Passage version {int}", async (_, version: number) => {
      const latest = (answer?.json as { latest?: SurahAnswer } | undefined)?.latest;
      expect({ surah: latest?.surah, version: latest?.version, passages: latest?.passages, phrases: latest?.phrases }).toEqual({
        surah: SURAH,
        version,
        ...(await stored()),
      });
    });

    // -------------------------------------------------- the audit

    step("every content audit row written since the undo was sent names the Admin's Account as its actor", async () => {
      const rows = await auditRowsSince(mark);
      expect(rows.length, "content audit rows since the undo").toBeGreaterThan(0);
      const id = await adminId();
      expect(rows.filter((r) => r.actor !== id).map((r) => `${r.table_name} ${r.operation} by ${r.actor}`)).toEqual([]);
    });

    step("no content audit row is written since the undo was sent", async () => {
      expect(mark, "no undo was sent").toBeGreaterThan(0);
      expect(await auditRowsSince(mark)).toEqual([]);
    });
  });

  Background(({ Given }) => {
    Given("Surah 107 holds its Passages as loaded, no Phrase and its seed Passage revision only", async () => {
      await putBackAsLoaded(SURAH);
    });
  });

  Scenario("An Admin lists a Surah's Passage revisions newest first, each with its author, time, edits, versions and the rows it changed", () => {});
  Scenario("The list through the bearer token answers the same", () => {});
  Scenario("The list of Surah 115 is refused 404", () => {});
  Scenario("An Admin's undo puts back the rows the revision changed and writes one more revision naming the Admin and the version it undoes", () => {});
  Scenario("Within moments of an undo, readers' Surah file from /data/v1 carries the Passages put back", () => {});
  Scenario("An undo through the bearer token passes too, and undoing the undo puts the revision's rows back again", () => {});
  Scenario("An undo of an earlier revision keeps what a later revision changed in other rows", () => {});
  Scenario("An undo of a revision whose row a later revision changed again is refused as a clash, naming the row, with the latest, and nothing is written", () => {});
  Scenario("An undo against a Passage version no longer the Surah's is refused as a clash with the latest, and nothing is written", () => {});

  ScenarioOutline("An undo of <which> is refused <status>, and nothing is written", ({ Given, When, Then }, variables) => {
    Given("<arranged>", async () => {
      await arrange(variables.arranged);
    });
    When("I undo <which>, Surah <surah>'s Passage revision <version>, against Passage version <base>, with session cookie", async () => {
      await undo(Number(variables.surah), Number(variables.version), JSON.stringify({ base: Number(variables.base) }), "session cookie");
    });
    Then("the answer's status is <status>", () => {
      expect(answer?.status, said(answer)).toBe(Number(variables.status));
    });
  });

  Scenario("An undo whose body is not { base } is refused 400, and nothing is written", () => {});

  ScenarioOutline("The list and an undo from <email> with <credential> are refused <status>, and nothing is written", ({ And, When, Then }, variables) => {
    And('I am signed in as "<email>"', async () => {
      signedIn = await signIn(variables.email);
    });
    When("I list Surah 107's Passage revisions with <credential>", async () => {
      await list(SURAH, variables.credential);
    });
    Then("the answer's status is <status>", () => {
      expect(answer?.status, said(answer)).toBe(Number(variables.status));
    });
    When("I undo Surah 107's Passage revision 2 against Passage version 2, with <credential>", async () => {
      await undo(SURAH, 2, JSON.stringify({ base: 2 }), variables.credential);
    });
    Then("the undo's status is <status> too", () => {
      expect(answer?.status, said(answer)).toBe(Number(variables.status));
    });
  });
});
