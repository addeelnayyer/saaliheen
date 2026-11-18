// Steps for #153: an Admin's publish of a Surah's Allah reference changes,
// POST /api/v1/allah-references/{surah} (ADR 0043), over HTTP against the
// production build and the run's own Postgres. The database is read only to
// check what a publish wrote, and written only to arrange a precondition: the
// seed the owner runs, and "another publish" written as a publish writes one.

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

const feature = await loadFeature("./allah-reference-publishing.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The address of Surah `surah`'s Allah references: GET reads them, POST publishes changes to them. */
const ENDPOINT = (surah: number) => `/api/v1/allah-references/${surah}`;

/** The two tables of Allah references (ADR 0014), as Better Auth's schema names them. */
const REFERENCES = "allahReference";
const REVISIONS = "allahReferenceRevision";

/** Every Surah these scenarios arrange, emptied before and after each scenario so no other feature meets their rows. */
const ARRANGED = [103, 110];

/** The first key of a publish's advisory lock, `pg_advisory_xact_lock(153, <surah>)` (ADR 0043); the second is the Surah. */
const LOCK_CLASS = 153;

/** Who "another publish" names as its author: another Admin's Account. */
const ANOTHER_ADMIN = "another-admin-of-issue-153";

/** The website's own directory, where its scripts run. */
const WEB = path.join(__dirname, "..", "..");

/** The Quran text's Word counts, by Surah then Ayah, as committed before the Quran moved into Neon (#172): what the import loads. */
const WORD_COUNTS = committedWordCounts();

/** Every Word location written in `text` (`s:a:w`), in the order written; none for "nothing" or "". */
const locationsIn = (text: string | undefined): string[] => text?.match(/\d+:\d+:\d+/g) ?? [];

/** Whether `location` is a Word of the Quran text. */
function isWord(location: string): boolean {
  const [surah, ayah, word] = location.split(":").map(Number);
  return word >= 1 && word <= (WORD_COUNTS[surah - 1]?.[ayah - 1] ?? 0);
}

/** The Word locations in `text`, each checked against the Quran text: a scenario names only Words that are. */
function wordsIn(text: string): string[] {
  const locations = locationsIn(text);
  for (const l of locations) expect(isWord(l), `${l} is a Word of the Quran text`).toBe(true);
  return locations;
}

/** A Word location's numbers. */
const numbersOf = (location: string) => location.split(":").map(Number);

/** `locations` in Quran order: by Surah, then Ayah, then Word. */
function inQuranOrder(locations: Iterable<string>): string[] {
  return [...locations].sort((a, b) => {
    const [x, y] = [numbersOf(a), numbersOf(b)];
    const at = x.findIndex((n, i) => n !== y[i]);
    return at < 0 ? 0 : x[at] - y[at];
  });
}

/** The Allah references `base` holds once each tap in `taps` has turned its Word into one, or out of one. */
function replayed(base: string[], taps: string[]): Set<string> {
  const marked = new Set(base);
  for (const l of taps) if (!marked.delete(l)) marked.add(l);
  return marked;
}

/** A JSON column's list of Word locations, sorted. */
function listOf(value: unknown): string[] {
  const list = typeof value === "string" ? JSON.parse(value) : value;
  expect(Array.isArray(list), `a list of Word locations: ${JSON.stringify(value)}`).toBe(true);
  return (list as unknown[]).map(String).sort();
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

/** Another Admin's publish, as one is written (ADR 0014): the Word locations added, and a revision one version on. */
async function anotherPublish(surah: number, added: string[]) {
  const client = await database().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(`select coalesce(max(version), 0) as version from "${REVISIONS}" where surah = $1`, [surah]);
    const base = Number(rows[0].version);
    await client.query(
      `insert into "${REFERENCES}" (id, location, surah) select gen_random_uuid()::text, l, $2 from unnest($1::text[]) as l`,
      [added, surah],
    );
    await client.query(
      `insert into "${REVISIONS}" (id, surah, author, "createdAt", added, removed, base, version)
       values (gen_random_uuid()::text, $1, $2, now(), $3::jsonb, '[]'::jsonb, $4, $5)`,
      [surah, ANOTHER_ADMIN, JSON.stringify(added), base, base + 1],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Surah `surah`'s Allah references as stored, in Quran order. */
async function storedIn(surah: number): Promise<string[]> {
  const { rows } = await database().query<{ location: string }>(`select location from "${REFERENCES}" where surah = $1`, [surah]);
  return inQuranOrder(rows.map((r) => r.location));
}

/** One Allah reference revision as stored. */
interface Revision {
  author: string;
  added: string[];
  removed: string[];
  base: number;
  version: number;
  /** Seconds between when it was made and now, by the database's clock. */
  age: number;
}

/** Surah `surah`'s Allah reference revisions other than the seed's, by version. */
async function revisionsSinceSeed(surah: number): Promise<Revision[]> {
  const { rows } = await database().query(
    `select author, added, removed, base, version, extract(epoch from (now() - "createdAt")) as age
       from "${REVISIONS}" where surah = $1 and author <> 'seed' order by version`,
    [surah],
  );
  return rows.map((r) => ({
    author: String(r.author),
    added: listOf(r.added),
    removed: listOf(r.removed),
    base: Number(r.base),
    version: Number(r.version),
    age: Number(r.age),
  }));
}

/** A transaction of the run's Postgres holding Surah `surah`'s publish lock, as a publish still writing in it does. */
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

/** One content audit row as a scenario names it: its table, its operation and the Word location of the row it changed, if any. */
const auditNamed = (r: { table_name: string; operation: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }) => ({
  table: r.table_name,
  operation: r.operation,
  location: String(r.after?.location ?? r.before?.location ?? ""),
});

/** Rows as a scenario names them, in one order. */
const sortedRows = (rows: { table: string; operation: string; location: string }[]) =>
  [...rows].sort((a, b) => `${a.table} ${a.operation} ${a.location}`.localeCompare(`${b.table} ${b.operation} ${b.location}`));

/** What an answer of the endpoint holds. */
interface SurahAnswer {
  surah: unknown;
  version: unknown;
  locations: unknown;
  latest?: SurahAnswer;
}

/** One publish sent: the Surah, the changes and base it carried, and the answer. */
interface Sent {
  surah: number;
  base: number;
  changes: string[];
  answer: Answer;
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  /** Who signed in in this scenario. */
  let signedIn: SignedIn | undefined;
  /** The publishes sent and the requests made, the last one last. */
  let sent: Sent[] = [];
  /** The API's last answer. */
  let answer: Answer | undefined;
  /** The publishes sent at the same moment. */
  let together: Sent[] = [];
  /** The Word locations the seed loaded: each Surah's Allah references at version 1. */
  let seeded: string[] = [];
  /** The transaction standing for a publish still writing, holding its Surah's lock, until it ends. */
  let held: { client: PoolClient; pid: number } | undefined;
  /** The publishes started and not yet awaited, by Surah, the latest last. */
  let started: { surah: number; sent: Promise<Sent> }[] = [];
  /** The content audit's latest row before the scenario's first publish was sent. */
  let auditFrom: number | undefined;

  /** End the transaction holding a publish lock, writing nothing. */
  async function endHeld() {
    const ending = held;
    held = undefined;
    if (!ending) return;
    await ending.client.query("rollback").catch(() => {});
    ending.client.release();
  }

  BeforeEachScenario(async () => {
    signedIn = undefined;
    sent = [];
    answer = undefined;
    together = [];
    seeded = [];
    held = undefined;
    started = [];
    auditFrom = undefined;
    await empty(ARRANGED);
  });
  AfterEachScenario(async () => {
    // Whatever the scenario's end, the lock is let go and every publish waiting on it answered before the Surahs are emptied.
    await endHeld();
    await Promise.allSettled(started.map((s) => s.sent));
    started = [];
    await empty(ARRANGED);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const body = () => answered().json as SurahAnswer;

  /** POST Surah `surah`'s `changes` against `base`, with `credential`. */
  async function publish(surah: number, changes: string[], base: number, credential: string): Promise<Sent> {
    const got = await send("POST", ENDPOINT(surah), credentialHeaders(credential, signedIn), JSON.stringify({ base, changes }));
    const one = { surah, base, changes, answer: got };
    sent.push(one);
    answer = got;
    return one;
  }

  /** Expect `got` to be Surah `surah`'s Allah references at `version`, holding `locations` in Quran order. */
  function expectSurahAnswer(got: SurahAnswer | undefined, surah: number, version: number, locations: string[], what: string) {
    expect({ surah: got?.surah, version: got?.version, locations: got?.locations }, `${what}: ${answered().text.slice(0, 300)}`).toEqual({
      surah,
      version,
      locations: inQuranOrder(locations),
    });
  }

  /** The Account id of whoever signed in. */
  const adminAccount = async () => {
    if (!signedIn) throw new Error("no one signed in in this scenario");
    return accountId(signedIn);
  };

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ------------------------------------------------------------ arranging

    step("the seed has loaded a file of Allah references holding {any}", async (_, list: string) => {
      seeded = wordsIn(list);
      await runSeed(seeded);
    });

    step("another publish of Surah {int}'s Allah references has added {any}", async (_, surah: number, list: string) => {
      await anotherPublish(surah, wordsIn(list));
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    // ------------------------------------------------------------ publishing

    step("I publish Surah {int}'s Allah reference changes {string} against version {int}, with {any}", async (_, surah: number, list: string, base: number, credential: string) => {
      // Changes that are no Word of the Quran text are sent as written: the server must refuse them.
      auditFrom ??= await auditMark();
      await publish(surah, locationsIn(list), base, credential);
    });

    step("a publish in Surah {int} holds Surah {int}'s publish lock and has not ended", async (_, surah: number, locked: number) => {
      expect(locked, "the publish holds its own Surah's lock").toBe(surah);
      held = await holdPublishLock(surah);
    });

    step("I start publishing Surah {int}'s Allah reference changes {string} against version {int}, with {any}", (_, surah: number, list: string, base: number, credential: string) => {
      const sent = publish(surah, wordsIn(list), base, credential);
      sent.catch(() => {}); // awaited by the step that reads its answer, or after the scenario
      started.push({ surah, sent });
    });

    step("the publish holding Surah {int}'s publish lock ends, writing nothing", async (_, surah: number) => {
      expect(await publishLockers(surah, true), `the transaction holding Surah ${surah}'s publish lock`).toEqual([held?.pid]);
      await endHeld();
    });

    step("I publish, at the same moment, {any}", async (_, what: string) => {
      const sameSurah = /^Surah (\d+)'s Allah reference changes "([^"]*)" and "([^"]*)", both against version (\d+)$/.exec(what);
      const twoSurahs = /^Surah (\d+)'s Allah reference changes "([^"]*)" against version (\d+) and Surah (\d+)'s "([^"]*)" against version (\d+)$/.exec(what);
      let requests: [number, string[], number][];
      if (sameSurah) {
        const [, surah, a, b, base] = sameSurah;
        requests = [
          [Number(surah), wordsIn(a), Number(base)],
          [Number(surah), wordsIn(b), Number(base)],
        ];
      } else if (twoSurahs) {
        const [, s1, a, b1, s2, b, b2] = twoSurahs;
        requests = [
          [Number(s1), wordsIn(a), Number(b1)],
          [Number(s2), wordsIn(b), Number(b2)],
        ];
      } else throw new Error(`no publishes named "${what}"`);
      together = await Promise.all(requests.map(([surah, changes, base]) => publish(surah, changes, base, "session cookie")));
    });

    // ------------------------------------------------------------ reading

    step("the endpoint, read with neither cookie nor token, answers Surah {int}, at version {int}, with the Word locations {any}", async (_, surah: number, version: number, list: string) => {
      answer = await send("GET", ENDPOINT(surah), {});
      expect(answered().status, `GET ${ENDPOINT(surah)}: ${answered().text.slice(0, 300)}`).toBe(200);
      expectSurahAnswer(body(), surah, version, wordsIn(list), `GET ${ENDPOINT(surah)}`);
    });

    step("I GET Surah {int}'s parts in {any}", async (_, surah: number, named: string) => {
      const language = named.replace(/ again$/, "");
      const lang = language === "Urdu" ? "ur" : language === "English" ? "en" : undefined;
      if (!lang) throw new Error(`no Language named "${language}"`);
      const parts: Answer[] = [];
      for (let n = 1; ; n++) {
        const part = await send("GET", `/parts/${lang}/${surah}/${n}.json`, {});
        if (part.status === 404 && n > 1) break;
        expect(part.status, `/parts/${lang}/${surah}/${n}.json`).toBe(200);
        parts.push(part);
      }
      answer = { ...parts[0], json: parts.flatMap((p) => p.json as unknown[]) };
    });

    // ------------------------------------------------------------ answers

    /** Fails unless the transaction standing for a publish still holds Surah `surah`'s lock. */
    const expectStillHeld = async (surah: number) => {
      expect(held, "a publish holding the lock that has not ended").toBeDefined();
      expect(await publishLockers(surah, true), `Surah ${surah}'s publish lock, held by the publish that has not ended`).toEqual([held?.pid]);
    };

    /** The publish started last, or the one started in Surah `surah`. */
    const startedIn = (surah?: number) => {
      const one = surah === undefined ? started.at(-1) : started.find((s) => s.surah === surah);
      if (!one) throw new Error(`no publish started${surah === undefined ? "" : ` in Surah ${surah}`} in this scenario`);
      return one.sent;
    };

    /** Fails unless `sent` is answered within `seconds`; the answer is then the API's last. */
    const answeredWithin = async (sent: Promise<Sent>, seconds: number) => {
      const got = await within(sent, seconds);
      expect(got, `the publish started is answered within ${seconds} seconds`).not.toBe("unanswered");
      answer = (got as Sent).answer;
    };

    step("that publish is answered within {int} seconds, while Surah {int}'s publish lock is still held", async (_, seconds: number, surah: number) => {
      await answeredWithin(startedIn(), seconds);
      await expectStillHeld(surah);
    });

    step("the publish started in Surah {int} is answered within {int} seconds", async (_, surah: number, seconds: number) => {
      await answeredWithin(startedIn(surah), seconds);
    });

    step("that publish is still unanswered after {int} seconds, waiting on Surah {int}'s publish lock", async (_, seconds: number, surah: number) => {
      expect(await within(startedIn(), seconds), `the publish started, after ${seconds} seconds`).toBe("unanswered");
      await expectStillHeld(surah);
      expect((await publishLockers(surah, false)).length, `publishes waiting on Surah ${surah}'s publish lock`).toBe(1);
    });

    step("its status is {int}", (_, status: number) => {
      expect(answered().status, `its answer: ${answered().text.slice(0, 300)}`).toBe(status);
    });

    step("the answer's status is {any}", (_, status: string) => {
      expect(answered().status, `the API's answer: ${answered().text.slice(0, 300)}`).toBe(Number(status));
    });

    step("the second publish is answered {int} too", (_, status: number) => {
      expect(sent.length, "two publishes sent").toBe(2);
      expect(answered().status, `the second publish's answer: ${answered().text.slice(0, 300)}`).toBe(status);
    });

    step("the answer has an error", () => {
      const error = (answered().json as { error?: unknown } | undefined)?.error;
      expect(typeof error === "string" && error.trim() !== "", `the answer says what is wrong in "error": ${answered().text.slice(0, 300)}`).toBe(true);
    });

    step("the answer holds exactly a surah, a version and its locations", () => {
      expect(Object.keys(body() ?? {}).sort(), "the answer's fields").toEqual(["locations", "surah", "version"]);
    });

    step("the answer is for Surah {int}, at version {int}, with the Word locations {any}", (_, surah: number, version: number, list: string) => {
      expectSurahAnswer(body(), surah, version, wordsIn(list), "the answer");
    });

    step("its answer is for Surah {int}, at version {int}, with the Word locations {any}", (_, surah: number, version: number, list: string) => {
      expectSurahAnswer(body(), surah, version, wordsIn(list), "the second publish's answer");
    });

    step("the answer's latest is for Surah {int}, at version {int}, with the Word locations {any}", (_, surah: number, version: number, list: string) => {
      expectSurahAnswer(body()?.latest, surah, version, wordsIn(list), 'the answer\'s "latest"');
    });

    step("the parts {any} as Allah references", (_, claim: string) => {
      const list = /^(?:now )?mark exactly (.*)$/.exec(claim)?.[1];
      if (list === undefined) throw new Error(`no claim about the parts reads "${claim}"`);
      const ayahs = answered().json as { words: { location: string; allahReference?: boolean }[] }[];
      const marked = ayahs.flatMap((a) => a.words).filter((w) => w.allahReference === true).map((w) => w.location);
      expect(inQuranOrder(marked), "the Words the parts mark as Allah references").toEqual(inQuranOrder(wordsIn(list)));
    });

    step("one of the two answers is 200 and the other 409", () => {
      expect(together.map((s) => s.answer.status).sort(), together.map((s) => s.answer.text.slice(0, 200)).join("\n")).toEqual([200, 409]);
    });

    step("both answers are 200", () => {
      expect(together.map((s) => s.answer.status), together.map((s) => s.answer.text.slice(0, 200)).join("\n")).toEqual([200, 200]);
    });

    // ------------------------------------------------------------ what was written

    step("the content audit rows written since the publish was sent are exactly these, each naming the Admin's Account as its actor:", async (_, table: { table: string; operation: string; location: string }[]) => {
      if (auditFrom === undefined) throw new Error("no publish sent in this scenario");
      const rows = (await auditRowsSince(auditFrom)).filter((r) => r.table_name === REFERENCES || r.table_name === REVISIONS);
      const what = `the content audit since the publish: ${JSON.stringify(rows.map((r) => ({ ...auditNamed(r), actor: r.actor })))}`;
      expect(sortedRows(rows.map(auditNamed)), what).toEqual(sortedRows(table.map((r) => ({ table: r.table, operation: r.operation, location: r.location ?? "" }))));
      const admin = await adminAccount();
      for (const r of rows) expect(r.actor, what).toBe(admin);
    });

    step("Surah {int}'s Allah references in the database are those the publish answered 200 holds", async (_, surah: number) => {
      const passed = together.find((s) => s.answer.status === 200);
      if (!passed) throw new Error("no publish answered 200");
      const expected = inQuranOrder(replayed(seeded.filter((l) => l.startsWith(`${surah}:`)), passed.changes));
      expect((passed.answer.json as SurahAnswer).locations, "the passing publish's answer").toEqual(expected);
      expect(await storedIn(surah), `Surah ${surah}'s Allah references as stored`).toEqual(expected);
    });

    step("Surah {int}'s Allah references in the database are exactly {any}", async (_, surah: number, list: string) => {
      expect(await storedIn(surah), `Surah ${surah}'s Allah references as stored`).toEqual(inQuranOrder(wordsIn(list)));
    });

    step("Surah {int} has {any}", async (_, surah: number, claim: string) => {
      if (claim === "no Allah reference revision since the seed") {
        expect(await revisionsSinceSeed(surah), `Surah ${surah}'s revisions since the seed`).toEqual([]);
        return;
      }
      const match =
        /^exactly (one|\d+) Allah reference revisions? since the seed, by (the Admin's Account|another Admin)(, made just now)?(?:, adding "([^"]*)" and removing (?:nothing|"([^"]*)"))?(, holding the changes of the publish answered 200)?, from version (\d+) to version (\d+)$/.exec(
          claim,
        );
      if (!match) throw new Error(`no claim about Surah ${surah}'s revisions reads "${claim}"`);
      const [, count, by, justNow, added, removed, ofPassed, from, to] = match;
      const revisions = await revisionsSinceSeed(surah);
      const what = `Surah ${surah}'s revisions since the seed: ${JSON.stringify(revisions)}`;
      expect(revisions.length, what).toBe(count === "one" ? 1 : Number(count));
      const author = by === "another Admin" ? ANOTHER_ADMIN : await adminAccount();
      for (const r of revisions) expect(r.author, what).toBe(author);
      if (justNow) for (const r of revisions) expect(r.age, `${what}: made within the last minute`).toBeLessThan(60);
      // Each revision is made on the one before: from `from`, one version at a time, to `to`.
      expect(revisions.map((r) => [r.base, r.version]), what).toEqual(
        Array.from({ length: Number(to) - Number(from) }, (_, i) => [Number(from) + i, Number(from) + i + 1]),
      );
      if (added !== undefined || removed !== undefined) {
        expect({ added: revisions[0].added, removed: revisions[0].removed }, what).toEqual({ added: wordsIn(added ?? "").sort(), removed: wordsIn(removed ?? "").sort() });
      }
      if (ofPassed) {
        const passed = together.find((s) => s.answer.status === 200);
        if (!passed) throw new Error("no publish answered 200");
        const before = seeded.filter((l) => l.startsWith(`${surah}:`));
        const after = replayed(before, passed.changes);
        expect({ added: revisions[0].added, removed: revisions[0].removed }, what).toEqual({
          added: [...after].filter((l) => !before.includes(l)).sort(),
          removed: before.filter((l) => !after.has(l)).sort(),
        });
      }
    });
  });

  Scenario("An Admin's publish writes every changed Word location and one revision, and the endpoint answers them at a new version", () => {});
  Scenario("A publish through the bearer token passes too, and each publish moves the version on by one", () => {});
  Scenario("A Word tapped twice is no change, and the revision does not name it", () => {});
  Scenario("A publish's content audit rows name the Admin's Account as their actor", () => {});
  ScenarioOutline("A publish holding a change that is not a Word of the Surah, \"<changes>\", is refused whole, and nothing of it is written", () => {});
  Scenario("Two publishes against the same version at once: one lands whole, the other is refused and writes nothing", () => {});
  ScenarioOutline("After a publish, Surah 103's part in <Language> marks the published Allah references on its next request", () => {});
  ScenarioOutline("A publish against an older version is refused through the <credential>, with the latest Allah references, and nothing is written", () => {});
  Scenario("A publish against a version the Surah has not reached is refused, and nothing is written", () => {});
  Scenario("A publish in another Surah passes against that Surah's own version, whatever this Surah's", () => {});
  Scenario("A stale publish in one Surah does not stop a publish in another", () => {});
  Scenario("Publishes in two Surahs at the same moment both pass, each at its own Surah's next version", () => {});
  Scenario("While publishes in Surah 103 hold and wait on its Surah's lock, a publish in Surah 110 is answered at once", () => {});
  ScenarioOutline("A publish from <email> with <credential> is refused <status>, and nothing is written", () => {});
});
