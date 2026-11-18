import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { curated, openingsIn, parseRun, quranOrder, runOf } from "../site/supplications-data.ts";
import { credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// An Admin's adds and deletes of Supplications (#202, #196, ADR 0027): POST
// /api/v1/supplications and DELETE /api/v1/supplications/{id} over HTTP, as
// the Supplication editor sends them, and what they leave in the run's
// Postgres: the `supplication` rows and the Supplication revisions in
// `supplication_revision`, which no endpoint answers. After each scenario the
// Supplications are put back as the curated file's load left them, through the
// endpoints, so that the caches the saves refreshed show the curated file again
// to the features that follow; then the scenario's revisions are removed.

const feature = await loadFeature("./supplication-adds.feature");

interface Row {
  id: number;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  openings: string[];
  kind: string;
  version: number;
}
interface Revision {
  supplication_id: number;
  author: string;
  base: number;
  version: number;
  before: Row | null;
  after: Row | null;
}

const COLUMNS = `id, surah, ayah_from as "ayahFrom", ayah_to as "ayahTo", speaker_id as "speakerId", openings, kind, version`;

const numeric = (r: Row): Row => ({ ...r, id: Number(r.id), surah: Number(r.surah), ayahFrom: Number(r.ayahFrom), ayahTo: Number(r.ayahTo), version: Number(r.version) });

/** Every Supplication the database holds, in Quran order. */
async function everyRow(): Promise<Row[]> {
  const { rows } = await database().query<Row>(`select ${COLUMNS} from supplication order by surah, ayah_from, ayah_to`);
  return rows.map(numeric);
}

/** The Supplication whose run is `run`, exactly, if there is one. */
async function rowAt(run: string): Promise<Row | undefined> {
  const { surah, ayahFrom, ayahTo } = parseRun(run);
  return (await everyRow()).find((r) => r.surah === surah && r.ayahFrom === ayahFrom && r.ayahTo === ayahTo);
}

async function oneRowAt(run: string): Promise<Row> {
  const row = await rowAt(run);
  expect(row, `a Supplication at ${run} in the database`).toBeDefined();
  return row!;
}

/** The Supplication revisions written since revision `since`, oldest first. */
async function revisionsSince(since: number): Promise<Revision[]> {
  const { rows } = await database().query<Revision>(`select * from supplication_revision where id > $1 order by id`, [since]);
  return rows.map((r) => ({ ...r, supplication_id: Number(r.supplication_id), base: Number(r.base), version: Number(r.version) }));
}

/** A Supplication's editable state, as a scenario names it, with no spans (#270). */
const stateOf = (run: string, speakerId: string, openings: string, kind: string) => ({ ...parseRun(run), speakerId, openings: openingsIn(openings), kind, spans: [] });

/** Text a reader sees in a slice of served HTML: tags and comments taken out, spaces squashed. */
const textOf = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let answer: Answer | undefined;
  let signedIn: SignedIn | undefined;
  /** The Supplications as noted. */
  let noted: Row[] = [];
  /** The newest Supplication revision before the scenario: those after it are the scenario's own. */
  let lastRevisionId = 0;

  BeforeEachScenario(async () => {
    answer = signedIn = undefined;
    noted = [];
    const { rows } = await database().query<{ last: number | null }>(`select max(id) as last from supplication_revision`);
    lastRevisionId = Number(rows[0].last ?? 0);
  });

  // Put the Supplications back as the curated file's load left them, through the endpoints: delete each one the file
  // hasn't, or has otherwise or at another version than 1, then add each one it has that is missing, at version 1.
  AfterEachScenario(async () => {
    const admin = credentialHeaders("session cookie", await signIn(ADMIN_EMAIL));
    const wanted = curated().supplications;
    const same = (a: { surah: number; ayahFrom: number; ayahTo: number }, b: typeof a) => runOf(a) === runOf(b);
    for (const row of await everyRow()) {
      const was = wanted.find((c) => same(c, row));
      const unchanged = was && was.speakerId === row.speakerId && was.kind === row.kind && JSON.stringify(was.openings) === JSON.stringify(row.openings);
      if (unchanged && row.version === 1) continue;
      const res = await send("DELETE", `/api/v1/supplications/${row.id}`, admin, JSON.stringify({ base: row.version }));
      expect(res.status, `the Supplication at ${runOf(row)} is taken out (${res.text.slice(0, 200)})`).toBe(204);
    }
    const left = await everyRow();
    for (const missing of wanted.filter((c) => !left.some((r) => same(c, r)))) {
      const res = await send("POST", "/api/v1/supplications", admin, JSON.stringify({ ...missing, spans: [] }));
      expect(res.status, `the Supplication at ${runOf(missing)} is put back (${res.text.slice(0, 200)})`).toBe(201);
    }
    await database().query(`delete from supplication_revision where id > $1`, [lastRevisionId]);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const json = () => {
    const body = answered().json as Record<string, unknown> | undefined;
    expect(body, `the answer is a JSON object (${answered().text.slice(0, 200)})`).toBeTypeOf("object");
    return body!;
  };
  const answeredSupplication = () => {
    const s = json().supplication as Row | undefined;
    expect(s, 'the answer holds the Supplication as "supplication"').toBeTypeOf("object");
    return s!;
  };
  const notedRow = () => {
    if (noted.length === 0) throw new Error("no Supplication noted in this scenario");
    return noted[0];
  };
  const add = async (credential: string, body: unknown) => {
    answer = await send("POST", "/api/v1/supplications", credentialHeaders(credential, signedIn), JSON.stringify(body));
  };
  const remove = async (path: string, credential: string, body: unknown) => {
    answer = await send("DELETE", path, credentialHeaders(credential, signedIn), JSON.stringify(body));
  };
  const admin = () => credentialHeaders("session cookie", signedIn);
  const listedRuns = async () => {
    const res = await send("GET", "/api/v1/supplications", credentialHeaders("neither cookie nor token"));
    return ((res.json as { supplications: Row[] }).supplications ?? []).map(runOf);
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- arranging

    step("I note the Supplication at {any}", async (_, run: string) => {
      noted.push(await oneRowAt(run));
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    for (const text of ["a reader has read {string}", "a reader reads {string}"]) {
      step(text, async (_, url: string) => {
        answer = await send("GET", url, credentialHeaders("neither cookie nor token"));
        expect(answer.status, `GET ${url}`).toBe(200);
      });
    }

    step("the noted Supplication has since been saved with the Openings {string}", async (_, openings: string) => {
      const { id, version, ...state } = notedRow();
      const res = await send("PUT", `/api/v1/supplications/${id}`, admin(), JSON.stringify({ ...state, base: version, openings: openingsIn(openings), spans: [] }));
      expect(res.status, `the earlier save passes (${res.text.slice(0, 200)})`).toBe(200);
    });

    // ---------------------------------------------------------------- adding

    step(
      "I add a Supplication at {any}, said by {string}, with the Openings {string} and the kind {string}, with {any}",
      async (_, run: string, speakerId: string, openings: string, kind: string, credential: string) => {
        await add(credential, stateOf(run, speakerId, openings, kind));
      },
    );

    step(
      "I add a Supplication in Surah {any}, Ayahs {any} to {any}, said by {string}, with the Openings {string} and the kind {string}, with {any}",
      async (_, surah: string, from: string, to: string, speakerId: string, openings: string, kind: string, credential: string) => {
        await add(credential, { surah: Number(surah), ayahFrom: Number(from), ayahTo: Number(to), speakerId, openings: openingsIn(openings), kind, spans: [] });
      },
    );

    step("I add a Supplication at {any} with its Openings sent as the text {string}, with {any}", async (_, run: string, openings: string, credential: string) => {
      await add(credential, { ...stateOf(run, "allahs-believing-servants", "", "supplication"), openings });
    });

    // ---------------------------------------------------------------- deleting

    step("I delete the noted Supplication against its own version, with {any}", async (_, credential: string) => {
      await remove(`/api/v1/supplications/${notedRow().id}`, credential, { base: (await oneRowAt(runOf(notedRow()))).version });
    });

    step("I delete the noted Supplication against its noted version, with {any}", async (_, credential: string) => {
      await remove(`/api/v1/supplications/${notedRow().id}`, credential, { base: notedRow().version });
    });

    step("I delete the noted Supplication with no base, with {any}", async (_, credential: string) => {
      await remove(`/api/v1/supplications/${notedRow().id}`, credential, {});
    });

    step("I delete {string} against version {int}, with {any}", async (_, path: string, base: number, credential: string) => {
      await remove(path, credential, { base });
    });

    // ---------------------------------------------------------------- joining and splitting

    step("I delete the Supplication at {any} and save the Supplication at {any} with the run {any}", async (_, gone: string, kept: string, run: string) => {
      const deleted = await oneRowAt(gone);
      const res = await send("DELETE", `/api/v1/supplications/${deleted.id}`, admin(), JSON.stringify({ base: deleted.version }));
      expect(res.status, `the delete passes (${res.text.slice(0, 200)})`).toBe(204);
      const { id, version, ...state } = await oneRowAt(kept);
      const saved = await send("PUT", `/api/v1/supplications/${id}`, admin(), JSON.stringify({ ...state, ...parseRun(run), base: version, spans: [] }));
      expect(saved.status, `the save passes (${saved.text.slice(0, 200)})`).toBe(200);
    });

    step(
      "I save the Supplication at {any} with the run {any} and add a Supplication at {any}, said by {string}, with the Openings {string} and the kind {string}",
      async (_, at: string, run: string, rest: string, speakerId: string, openings: string, kind: string) => {
        const { id, version, ...state } = await oneRowAt(at);
        const saved = await send("PUT", `/api/v1/supplications/${id}`, admin(), JSON.stringify({ ...state, ...parseRun(run), base: version, spans: [] }));
        expect(saved.status, `the save passes (${saved.text.slice(0, 200)})`).toBe(200);
        const added = await send("POST", "/api/v1/supplications", admin(), JSON.stringify(stateOf(rest, speakerId, openings, kind)));
        expect(added.status, `the add passes (${added.text.slice(0, 200)})`).toBe(201);
      },
    );

    step("GET \\/api\\/v1\\/supplications lists a Supplication at {any} and none at {any} or {any}", async (_, shown: string, a: string, b: string) => {
      const runs = await listedRuns();
      expect(runs).toContain(runOf(parseRun(shown)));
      expect(runs).not.toContain(runOf(parseRun(a)));
      expect(runs).not.toContain(runOf(parseRun(b)));
    });

    step("GET \\/api\\/v1\\/supplications lists a Supplication at {any} and one at {any}, and none at {any}", async (_, a: string, b: string, gone: string) => {
      const runs = await listedRuns();
      expect(runs).toContain(runOf(parseRun(a)));
      expect(runs).toContain(runOf(parseRun(b)));
      expect(runs).not.toContain(runOf(parseRun(gone)));
    });

    // ---------------------------------------------------------------- the answer

    // {any}, not {int}: an outline's <status> must match it before its Examples fill it in.
    step("the answer's status is {any}", (_, status: string) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 200)})`).toBe(Number(status));
    });

    step("the answer has an error", () => {
      const error = json().error;
      expect(typeof error === "string" && error.trim() !== "", 'the answer says what is wrong in "error"').toBe(true);
    });

    for (const text of ["the answer's error is {string}", "the answer's error reads: {any}"]) {
      step(text, (_, error: string) => {
        expect(json().error, 'the answer\'s "error"').toBe(error);
      });
    }

    step(
      "the answer's Supplication is at {any}, said by {string}, with the Openings {string}, the kind {string} and version {int}",
      (_, run: string, speakerId: string, openings: string, kind: string, version: number) => {
        expect(answeredSupplication()).toEqual({ id: expect.any(Number), ...stateOf(run, speakerId, openings, kind), version });
      },
    );

    step("the answer's Supplication has the Openings {string} and its noted version plus one", (_, openings: string) => {
      expect(answeredSupplication()).toMatchObject({ id: notedRow().id, openings: openingsIn(openings), version: notedRow().version + 1 });
    });

    step(
      "the answer lists a Supplication at {any}, said by {string}, with the Openings {string}, the kind {string} and version {int}",
      (_, run: string, speakerId: string, openings: string, kind: string, version: number) => {
        const listed = (json().supplications as Row[]).filter((s) => runOf(s) === runOf(parseRun(run)));
        expect(listed, `the Supplications at ${run} in /api/v1/supplications`).toEqual([{ id: expect.any(Number), ...stateOf(run, speakerId, openings, kind), version }]);
      },
    );

    step("the answer lists no Supplication at {any}", (_, run: string) => {
      expect((json().supplications as Row[]).map(runOf)).not.toContain(runOf(parseRun(run)));
    });

    step("the page served has an entry headed {string}", (_, shown: string) => {
      const headings = [...answered().text.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1]));
      expect(headings, "the entries' headings").toContain(shown);
    });

    step("the page served has an entry headed {string} and none headed {string}", (_, shown: string, gone: string) => {
      const headings = [...answered().text.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1]));
      expect(headings, "the entries' headings").toContain(shown);
      expect(headings, "the entries' headings").not.toContain(gone);
    });

    // ---------------------------------------------------------------- the database

    step("the database still holds just the curated file's Supplications, with no new Supplication revision", async () => {
      expect((await everyRow()).map(runOf)).toEqual(curated().supplications.toSorted(quranOrder).map(runOf));
      expect(await revisionsSince(lastRevisionId), "new Supplication revisions").toEqual([]);
    });

    step("the database holds no Supplication at {any}", async (_, run: string) => {
      expect(await rowAt(run)).toBeUndefined();
    });

    step("the noted Supplication is still in the database, with the Openings {string}", async (_, openings: string) => {
      expect((await oneRowAt(runOf(notedRow()))).openings).toEqual(openingsIn(openings));
    });

    step(
      "exactly one Supplication revision names the added Supplication, by {string}, with base {int} and version {int}, nothing before and the answer's Supplication after",
      async (_, author: string, base: number, version: number) => {
        const added = answeredSupplication();
        const revisions = (await revisionsSince(lastRevisionId)).filter((r) => r.supplication_id === added.id);
        expect(revisions.map(({ author, base, version, before, after }) => ({ author, base, version, before, after }))).toEqual([{ author, base, version, before: null, after: added }]);
      },
    );

    step(
      "exactly one Supplication revision names the noted Supplication, by {string}, with base its noted version and version one more, the noted Supplication before and nothing after",
      async (_, author: string) => {
        const was = notedRow();
        const revisions = (await revisionsSince(lastRevisionId)).filter((r) => r.supplication_id === was.id);
        expect(revisions.map(({ author, base, version, before, after }) => ({ author, base, version, before, after }))).toEqual([
          { author, base: was.version, version: was.version + 1, before: { ...was, spans: [] }, after: null },
        ]);
      },
    );
  });

  Scenario("An Admin adds Al-Fatiha 1:5–7, at version 1, and GET /api/v1/supplications and the Supplications page show it at once", () => {});
  Scenario("An add through the bearer token passes too", () => {});
  ScenarioOutline("An add with <credential> is refused <status>, and adds nothing", () => {});
  Scenario("A body that isn't an add is answered 400, with an error, and adds nothing", () => {});
  ScenarioOutline("An add that breaks a rule is refused, saying which, and adds nothing", () => {});
  Scenario("An Admin deletes the Supplication at 28:17, and its revision is kept", () => {});
  ScenarioOutline("A delete with <credential> is refused <status>, and deletes nothing", () => {});
  ScenarioOutline("A delete of <path> is answered 404, with an error", () => {});
  Scenario("A delete with no base is answered 400, and deletes nothing", () => {});
  Scenario("A delete made against an older version is refused, with the latest Supplication", () => {});
  Scenario("An Admin joins 28:16 and 28:17 into 28:16–17, then splits them again by trimming and adding", () => {});
});
