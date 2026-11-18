// Steps for #154: a Surah's Allah reference revisions,
// GET /api/v1/allah-references/{surah}/revisions, and undoing a publish,
// POST /api/v1/allah-references/{surah}/revisions/{version}/undo (ADR 0044),
// over HTTP against the production build and the run's own Postgres. The
// database is written only to arrange a precondition (the seed the owner runs,
// and a transaction holding a Surah's publish lock) and read only to check
// what was written; the Admin's publishes are made through the API.

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import type { PoolClient } from "pg";
import { expect } from "vitest";
import { committedWordCounts } from "../site/committed-output.ts";
import { testDatabase } from "../site/test-database.ts";
import { auditMark, auditRowsSince } from "./audit";
import { accountId, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

const feature = await loadFeature("./allah-reference-revisions.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** Surah `surah`'s Allah references: GET reads them, POST publishes changes to them. */
const ENDPOINT = (surah: number) => `/api/v1/allah-references/${surah}`;
/** Surah `surah`'s Allah reference revisions, listed to Admins. */
const REVISIONS_ENDPOINT = (surah: number) => `${ENDPOINT(surah)}/revisions`;
/** The undo of Surah `surah`'s revision at `version`. */
const UNDO_ENDPOINT = (surah: number, version: number) => `${REVISIONS_ENDPOINT(surah)}/${version}/undo`;

/** The two tables of Allah references (ADR 0014). */
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";

/** Every Surah these scenarios arrange, emptied before and after each scenario. */
const ARRANGED = [102, 106];

/** The first key of a publish's advisory lock (ADR 0043); the second is the Surah. */
const LOCK_CLASS = 153;

const ADMIN_EMAIL = "admin@saaliheen.test";

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");

/** The Quran text's Word counts, by Surah then Ayah. */
const WORD_COUNTS = committedWordCounts();

/** Every Word location written in `text`, in the order written. */
const locationsIn = (text: string | undefined): string[] => text?.match(/\d+:\d+:\d+/g) ?? [];

/** The Word locations in `text`, each checked against the Quran text. */
function wordsIn(text: string | undefined): string[] {
  const locations = locationsIn(text);
  for (const l of locations) {
    const [surah, ayah, word] = l.split(":").map(Number);
    expect(word >= 1 && word <= (WORD_COUNTS[surah - 1]?.[ayah - 1] ?? 0), `${l} is a Word of the Quran text`).toBe(true);
  }
  return locations;
}

const numbersOf = (location: string) => location.split(":").map(Number);

/** `locations` in Quran order. */
function inQuranOrder(locations: Iterable<string>): string[] {
  return [...locations].sort((a, b) => {
    const [x, y] = [numbersOf(a), numbersOf(b)];
    const at = x.findIndex((n, i) => n !== y[i]);
    return at < 0 ? 0 : x[at] - y[at];
  });
}

/** Run the seed the owner runs, `pnpm db:seed-allah-references <file>`, against the run's own Postgres. */
async function runSeed(locations: string[]) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "allah-references-")), "allah-references.json");
  fs.writeFileSync(file, JSON.stringify(locations));
  const env = { ...process.env, DATABASE_URL: testDatabase(Number(process.env.PORT)).url };
  try {
    await promisify(execFile)("pnpm", ["run", "--silent", "db:seed-allah-references", file], { cwd: WEB, env, encoding: "utf8" });
  } catch (error) {
    const { stdout = "", stderr = "", message } = error as { stdout?: string; stderr?: string; message: string };
    throw new Error(`the seed did not run: ${stdout}\n${stderr}\n${message}`);
  }
}

/** Empty Surahs `surahs` of Allah references and Allah reference revisions. */
async function empty(surahs: number[]) {
  await database().query(`delete from "${REFERENCES}" where surah = any($1::int[])`, [surahs]);
  await database().query(`delete from "${REVISIONS}" where surah = any($1::int[])`, [surahs]);
}

/** Surah `surah`'s Allah references as stored, in Quran order. */
async function storedIn(surah: number): Promise<string[]> {
  const { rows } = await database().query<{ location: string }>(`select location from "${REFERENCES}" where surah = $1`, [surah]);
  return inQuranOrder(rows.map((r) => r.location));
}

/** A transaction holding Surah `surah`'s publish lock, as a publish still writing in it does. */
async function holdPublishLock(surah: number): Promise<{ client: PoolClient; pid: number }> {
  const client = await database().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock($1, $2)", [LOCK_CLASS, surah]);
    const { rows } = await client.query<{ pid: number }>("select pg_backend_pid() as pid");
    return { client, pid: Number(rows[0].pid) };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    client.release();
    throw error;
  }
}

/** The backends holding (`granted`) or waiting for Surah `surah`'s publish lock. */
async function publishLockers(surah: number, granted: boolean): Promise<number[]> {
  const { rows } = await database().query<{ pid: number }>(
    `select pid from pg_locks where locktype = 'advisory' and classid = $1 and objid = $2 and objsubid = 2 and granted = $3`,
    [LOCK_CLASS, surah, granted],
  );
  return rows.map((r) => Number(r.pid));
}

/** `promise`'s value, or "unanswered" when `seconds` pass first. */
async function within<T>(promise: Promise<T>, seconds: number): Promise<T | "unanswered"> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<"unanswered">((resolve) => (timer = setTimeout(() => resolve("unanswered"), seconds * 1000)));
  try {
    return await Promise.race([promise, late]);
  } finally {
    clearTimeout(timer);
  }
}

/** One revision as the list answers it. */
interface ListedRevision {
  version: unknown;
  base: unknown;
  createdAt: unknown;
  author: { kind?: unknown; email?: unknown; name?: unknown } | undefined;
  added: unknown;
  removed: unknown;
}

/** What an answer of the endpoints holds. */
interface Body {
  surah?: unknown;
  version?: unknown;
  locations?: unknown;
  revisions?: ListedRevision[];
  latest?: Body;
  error?: unknown;
}

/** A row of a scenario's table of revisions. */
interface RevisionRow {
  version: string;
  base: string;
  by: string;
  added?: string;
  removed?: string;
}

/** How the list names who made a revision, from how a scenario does. */
function authorNamed(by: string) {
  if (by === "the seed") return { kind: "seed" };
  if (by === "the Admin") return { kind: "admin", email: ADMIN_EMAIL };
  throw new Error(`no author named "${by}"`);
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  /** Who signed in last in this scenario. */
  let signedIn: SignedIn | undefined;
  /** The Admin's sign-in, kept when someone else signs in after them. */
  let admin: SignedIn | undefined;
  /** The API's last answer. */
  let answer: Answer | undefined;
  /** The undos sent at the same moment. */
  let together: Answer[] = [];
  /** The transaction holding a publish lock, until it ends. */
  let held: { client: PoolClient; pid: number } | undefined;
  /** The undo started and not yet awaited. */
  let started: Promise<Answer> | undefined;
  /** The content audit's latest row before the undo was sent. */
  let auditFrom: number | undefined;

  async function endHeld() {
    const ending = held;
    held = undefined;
    if (!ending) return;
    await ending.client.query("rollback").catch(() => {});
    ending.client.release();
  }

  BeforeEachScenario(async () => {
    signedIn = undefined;
    admin = undefined;
    answer = undefined;
    together = [];
    held = undefined;
    started = undefined;
    auditFrom = undefined;
    await empty(ARRANGED);
  });
  AfterEachScenario(async () => {
    await endHeld();
    await Promise.allSettled([started]);
    started = undefined;
    await empty(ARRANGED);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const body = () => (answered().json ?? {}) as Body;

  const asAdmin = () => {
    if (!admin) throw new Error(`${ADMIN_EMAIL} has not signed in in this scenario`);
    return admin;
  };

  /** POST the undo of Surah `surah`'s revision at `version` against `base`, with `credential`. */
  const undo = (surah: number, version: number, base: number, credential: string) =>
    send("POST", UNDO_ENDPOINT(surah, version), credentialHeaders(credential, signedIn), JSON.stringify({ base }));

  /** Expect `got` to be Surah `surah`'s Allah references at `version`, holding `locations`. */
  function expectSurahAnswer(got: Body | undefined, surah: number, version: number, locations: string[], what: string) {
    expect({ surah: got?.surah, version: got?.version, locations: got?.locations }, `${what}: ${answered().text.slice(0, 300)}`).toEqual({
      surah,
      version,
      locations: inQuranOrder(locations),
    });
  }

  /** Expect `got` to list Surah `surah`'s revisions at `version` exactly as `rows` say, newest first. */
  async function expectRevisions(got: Answer, surah: number, version: number, rows: RevisionRow[]) {
    const listed = got.json as Body;
    expect({ surah: listed?.surah, version: listed?.version }, `the list: ${got.text.slice(0, 400)}`).toEqual({ surah, version });
    expect(Array.isArray(listed.revisions), `the list's revisions: ${got.text.slice(0, 400)}`).toBe(true);
    const shown = listed.revisions!.map((r) => ({
      version: r.version,
      base: r.base,
      author: r.author?.kind === "admin" ? { kind: r.author.kind, email: r.author.email } : { kind: r.author?.kind },
      added: r.added,
      removed: r.removed,
    }));
    expect(shown, `the list: ${got.text.slice(0, 800)}`).toEqual(
      // A table of its header alone reaches the step as no rows at all.
      (rows ?? []).map((row) => ({
        version: Number(row.version),
        base: Number(row.base),
        author: authorNamed(row.by),
        added: inQuranOrder(wordsIn(row.added)),
        removed: inQuranOrder(wordsIn(row.removed)),
      })),
    );
  }

  /** Surah `surah`'s revisions, listed with the Admin's session. */
  async function listedByAdmin(surah: number): Promise<Answer> {
    const got = await send("GET", REVISIONS_ENDPOINT(surah), credentialHeaders("session cookie", asAdmin()));
    expect(got.status, `the Admin's list of Surah ${surah}'s revisions: ${got.text.slice(0, 300)}`).toBe(200);
    return got;
  }

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ------------------------------------------------------------ arranging

    step("the seed has loaded a file of Allah references holding {any}", async (_, list: string) => {
      await runSeed(wordsIn(list));
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
      if (email === ADMIN_EMAIL) admin = signedIn;
    });

    step("I have published Surah {int}'s Allah reference changes {string} against version {int}", async (_, surah: number, list: string, base: number) => {
      const got = await send("POST", ENDPOINT(surah), credentialHeaders("session cookie", asAdmin()), JSON.stringify({ base, changes: wordsIn(list) }));
      expect(got.status, `the Admin's publish: ${got.text.slice(0, 300)}`).toBe(200);
    });

    step("I have undone Surah {int}'s revision at version {int} against version {int}", async (_, surah: number, version: number, base: number) => {
      const got = await send("POST", UNDO_ENDPOINT(surah, version), credentialHeaders("session cookie", asAdmin()), JSON.stringify({ base }));
      expect(got.status, `the Admin's undo: ${got.text.slice(0, 300)}`).toBe(200);
    });

    step("a publish in Surah {int} holds Surah {int}'s publish lock and has not ended", async (_, surah: number, locked: number) => {
      expect(locked, "the publish holds its own Surah's lock").toBe(surah);
      held = await holdPublishLock(surah);
    });

    step("the publish holding Surah {int}'s publish lock ends, writing nothing", async (_, surah: number) => {
      expect(await publishLockers(surah, true), `the transaction holding Surah ${surah}'s publish lock`).toEqual([held?.pid]);
      await endHeld();
    });

    // ------------------------------------------------------------ asking

    step("I list Surah {int}'s Allah reference revisions, with {any}", async (_, surah: number, credential: string) => {
      answer = await send("GET", REVISIONS_ENDPOINT(surah), credentialHeaders(credential, signedIn));
    });

    step("I GET {string} with {any}", async (_, url: string, credential: string) => {
      answer = await send("GET", url, credentialHeaders(credential, signedIn));
    });

    step("I undo {any}, POSTing {string} with session cookie and the body {any}", async (_, _what: string, url: string, text: string) => {
      answer = await send("POST", url, credentialHeaders("session cookie", signedIn), text === "nothing" ? undefined : text);
    });

    step("I undo Surah {int}'s revision at version {int} against version {int}, with {any}", async (_, surah: number, version: number, base: number, credential: string) => {
      auditFrom ??= await auditMark();
      answer = await undo(surah, version, base, credential);
    });

    step("I start undoing Surah {int}'s revision at version {int} against version {int}, with {any}", (_, surah: number, version: number, base: number, credential: string) => {
      started = undo(surah, version, base, credential);
      started.catch(() => {});
    });

    step("I undo, at the same moment, Surah {int}'s revisions at versions {int} and {int}, both against version {int}", async (_, surah: number, a: number, b: number, base: number) => {
      together = await Promise.all([a, b].map((version) => undo(surah, version, base, "session cookie")));
    });

    step("I GET Surah {int}'s parts in English", async (_, surah: number) => {
      const parts: Answer[] = [];
      for (let n = 1; ; n++) {
        const part = await send("GET", `/parts/en/${surah}/${n}.json`, {});
        if (part.status === 404 && n > 1) break;
        expect(part.status, `/parts/en/${surah}/${n}.json`).toBe(200);
        parts.push(part);
      }
      answer = { ...parts[0], json: parts.flatMap((p) => p.json as unknown[]) };
    });

    // ------------------------------------------------------------ answers

    step("that undo is answered {int} too", (_, status: number) => {
      expect(answered().status, `the API's answer: ${answered().text.slice(0, 300)}`).toBe(status);
    });

    step("the answer's status is {any}", (_, status: string) => {
      expect(answered().status, `the API's answer: ${answered().text.slice(0, 300)}`).toBe(Number(status));
    });

    step("the answer has an error", () => {
      const error = body().error;
      expect(typeof error === "string" && error.trim() !== "", `the answer says what is wrong in "error": ${answered().text.slice(0, 300)}`).toBe(true);
    });

    step("the answer holds exactly a surah, a version and its {word}", (_, field: string) => {
      expect(Object.keys(body()).sort(), "the answer's fields").toEqual([field, "surah", "version"].sort());
    });

    step("the answer lists no revision", () => {
      expect(body().revisions, `the refusal lists no revision: ${answered().text.slice(0, 300)}`).toBeUndefined();
    });

    step("the answer lists Surah {int}'s revisions at version {int}, newest first, exactly:", async (_, surah: number, version: number, rows: RevisionRow[]) => {
      await expectRevisions(answered(), surah, version, rows);
    });

    step("Surah {int}'s revisions, listed by the Admin, are at version {int}, newest first, exactly:", async (_, surah: number, version: number, rows: RevisionRow[]) => {
      await expectRevisions(await listedByAdmin(surah), surah, version, rows);
    });

    step("Surah {int}'s revisions, listed by the Admin, are at version {int}", async (_, surah: number, version: number) => {
      const listed = (await listedByAdmin(surah)).json as Body;
      expect({ version: listed.version, count: listed.revisions?.length }, `Surah ${surah}'s revisions`).toEqual({ version, count: version });
    });

    step("each revision listed says when it was made, within the last {int} minutes, and none was made after the one listed above it", (_, minutes: number) => {
      const times = (body().revisions ?? []).map((r) => (typeof r.createdAt === "string" ? Date.parse(r.createdAt) : NaN));
      const now = Date.now();
      for (const t of times) {
        expect(Number.isFinite(t), `each createdAt is an ISO 8601 time: ${answered().text.slice(0, 400)}`).toBe(true);
        expect(now - t, "made within the window").toBeLessThan(minutes * 60_000);
        expect(t - now, "not made in the future").toBeLessThan(60_000);
      }
      for (let i = 1; i < times.length; i++) expect(times[i], "newest first").toBeLessThanOrEqual(times[i - 1]);
    });

    step("the answer is for Surah {int}, at version {int}, with the Word locations {string}", (_, surah: number, version: number, list: string) => {
      expectSurahAnswer(body(), surah, version, wordsIn(list), "the answer");
    });

    step("the answer is now for Surah {int}, at version {int}, with the Word locations {string}", (_, surah: number, version: number, list: string) => {
      expectSurahAnswer(body(), surah, version, wordsIn(list), "the latest answer");
    });

    step("the answer's latest is for Surah {int}, at version {int}, with the Word locations {string}", (_, surah: number, version: number, list: string) => {
      expectSurahAnswer(body().latest, surah, version, wordsIn(list), 'the answer\'s "latest"');
    });

    step("the endpoint, read with neither cookie nor token, answers Surah {int}, at version {int}, with the Word locations {string}", async (_, surah: number, version: number, list: string) => {
      answer = await send("GET", ENDPOINT(surah), {});
      expect(answered().status, `GET ${ENDPOINT(surah)}: ${answered().text.slice(0, 300)}`).toBe(200);
      expectSurahAnswer(body(), surah, version, wordsIn(list), `GET ${ENDPOINT(surah)}`);
    });

    step("the parts now mark exactly {string} as Allah references", (_, list: string) => {
      const ayahs = answered().json as { words: { location: string; allahReference?: boolean }[] }[];
      const marked = ayahs.flatMap((a) => a.words).filter((w) => w.allahReference === true).map((w) => w.location);
      expect(inQuranOrder(marked), "the Words the parts mark as Allah references").toEqual(inQuranOrder(wordsIn(list)));
    });

    step("Surah {int}'s Allah references in the database are exactly {string}", async (_, surah: number, list: string) => {
      expect(await storedIn(surah), `Surah ${surah}'s Allah references as stored`).toEqual(inQuranOrder(wordsIn(list)));
    });

    step("one of the two answers is 200 and the other 409", () => {
      expect(together.map((a) => a.status).sort(), together.map((a) => a.text.slice(0, 200)).join("\n")).toEqual([200, 409]);
    });

    step("that undo is still unanswered after {int} seconds, waiting on Surah {int}'s publish lock", async (_, seconds: number, surah: number) => {
      if (!started) throw new Error("no undo started in this scenario");
      expect(await within(started, seconds), `the undo started, after ${seconds} seconds`).toBe("unanswered");
      expect(await publishLockers(surah, true), `Surah ${surah}'s publish lock, still held`).toEqual([held?.pid]);
      expect((await publishLockers(surah, false)).length, `undos waiting on Surah ${surah}'s publish lock`).toBe(1);
    });

    step("that undo is answered within {int} seconds", async (_, seconds: number) => {
      if (!started) throw new Error("no undo started in this scenario");
      const got = await within(started, seconds);
      expect(got, `the undo is answered within ${seconds} seconds`).not.toBe("unanswered");
      answer = got as Answer;
    });

    step("the content audit rows written since the undo was sent are exactly these, each naming the Admin's Account as its actor:", async (_, table: { table: string; operation: string; location: string }[]) => {
      if (auditFrom === undefined) throw new Error("no undo sent in this scenario");
      const rows = (await auditRowsSince(auditFrom)).filter((r) => r.table_name === REFERENCES || r.table_name === REVISIONS);
      const named = rows.map((r) => ({
        table: r.table_name,
        operation: r.operation,
        location: String((r.after as Record<string, unknown> | null)?.location ?? (r.before as Record<string, unknown> | null)?.location ?? ""),
      }));
      const sorted = (list: { table: string; operation: string; location: string }[]) =>
        [...list].sort((a, b) => `${a.table} ${a.operation} ${a.location}`.localeCompare(`${b.table} ${b.operation} ${b.location}`));
      const what = `the content audit since the undo: ${JSON.stringify(rows.map((r, i) => ({ ...named[i], actor: r.actor })))}`;
      expect(sorted(named), what).toEqual(sorted(table.map((r) => ({ table: r.table, operation: r.operation, location: r.location ?? "" }))));
      const id = await accountId(asAdmin());
      for (const r of rows) expect(r.actor, what).toBe(id);
    });
  });

  ScenarioOutline("An Admin lists a Surah's revisions through the <credential>, newest first, each naming who made it, when, and what it added and removed", () => {});
  Scenario("A Surah that has no revision lists none, at version 0", () => {});
  ScenarioOutline('Listing the revisions of "<path>", which is no Surah, is answered 404', () => {});
  ScenarioOutline("Listing the revisions as <email> with <credential> is refused <status>, and lists nothing", () => {});
  ScenarioOutline("An Admin's undo through the <credential> writes a new revision reversing the publish, which readers get on their next request", () => {});
  Scenario("Undoing an older publish turns back only its own Word locations, keeping a later publish's", () => {});
  Scenario("An undo is a revision of its own: undoing it puts the publish's changes back, and undoing the publish again changes nothing and is refused", () => {});
  Scenario("An undo's content audit rows name the Admin's Account as their actor", () => {});
  Scenario("An undo waits on the Surah's publish lock, as a publish does", () => {});
  Scenario("The seed's revision cannot be undone, and nothing is written", () => {});
  ScenarioOutline("Undoing <what> is answered <status>, and nothing is written", () => {});
  ScenarioOutline("An undo against an older version is refused through the <credential>, with the latest Allah references, and nothing is written", () => {});
  Scenario("Two undos against the same version at once: one lands, the other is refused and writes nothing", () => {});
  ScenarioOutline("An undo as <email> with <credential> is refused <status>, and nothing is written", () => {});
});
