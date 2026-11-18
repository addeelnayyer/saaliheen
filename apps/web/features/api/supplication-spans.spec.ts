import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { parseRun } from "../site/supplications-data.ts";
import { auditMark, auditRowsSince } from "./audit.ts";
import { accountId, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// Supplication spans (#270, ADR 0063): saved with a Supplication through PUT
// /api/v1/supplications/{id} and POST /api/v1/supplications, kept in its
// Supplication revisions, and read from GET /api/v1/supplications, over HTTP
// as the Supplication editor sends and the Supplications page reads them. The
// `supplication` row and its revisions are read directly, as
// ./supplication-saves.spec.ts reads them, and the spans only through the API
// but for a delete, whose Supplication no read answers. Every Supplication a
// scenario saves is put back afterwards with no spans, and every one it adds
// deleted.

const feature = await loadFeature("./supplication-spans.feature");

interface Span {
  from: string;
  to: string;
}
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
/** A Supplication as the API answers it. */
type Answered = Row & { spans: Span[] };
interface Revision {
  id: number;
  base: number;
  version: number;
  before: Answered | null;
  after: Answered | null;
}

const COLUMNS = `id, surah, ayah_from as "ayahFrom", ayah_to as "ayahTo", speaker_id as "speakerId", openings, kind, version`;
const numeric = (r: Row): Row => ({ ...r, id: Number(r.id), surah: Number(r.surah), ayahFrom: Number(r.ayahFrom), ayahTo: Number(r.ayahTo), version: Number(r.version) });

/** `[]`, or spans as a scenario writes them, quoted: "2:127:8–2:129:16, 3:35:4–3:35:18", in the order written. */
function spansIn(written: string): Span[] {
  const text = written.trim().replace(/^"|"$/g, "");
  if (text === "[]") return [];
  return text.split(",").map((s) => {
    const [from, to] = s.trim().split("–");
    if (to === undefined) throw new Error(`not a span: "${s}"`);
    return { from, to };
  });
}

/** The Supplication whose run is `run`, exactly, as the database holds it now. */
async function rowAt(run: string): Promise<Row> {
  const { surah, ayahFrom, ayahTo } = parseRun(run);
  const { rows } = await database().query<Row>(`select ${COLUMNS} from supplication where surah = $1 and ayah_from = $2 and ayah_to = $3`, [surah, ayahFrom, ayahTo]);
  expect(rows.length, `one Supplication at ${run} in the database`).toBe(1);
  return numeric(rows[0]);
}

async function rowById(id: number): Promise<Row | undefined> {
  const { rows } = await database().query<Row>(`select ${COLUMNS} from supplication where id = $1`, [id]);
  return rows[0] && numeric(rows[0]);
}

/** The Supplication revisions of Supplication `id` written since revision `since`, oldest first. */
async function revisionsSince(id: number, since: number): Promise<Revision[]> {
  const { rows } = await database().query<Revision>(`select id, base, version, before, after from supplication_revision where supplication_id = $1 and id > $2 order by id`, [id, since]);
  return rows.map((r) => ({ ...r, id: Number(r.id), base: Number(r.base), version: Number(r.version) }));
}

/** Each Supplication's spans, by id, as GET /api/v1/supplications answers them now. */
async function readSpans(): Promise<Map<number, Span[]>> {
  const read = await send("GET", "/api/v1/supplications", credentialHeaders("neither cookie nor token"));
  expect(read.status, "GET /api/v1/supplications").toBe(200);
  return new Map((read.json as { supplications: Answered[] }).supplications.map((s) => [s.id, s.spans]));
}

/** What the editor sends to save `r`: its whole editable state, its base and `spans`, with `change` made. */
const bodyOf = (r: Row, spans: unknown, change: Partial<Row & { base: number }> = {}) => ({
  base: r.version,
  surah: r.surah,
  ayahFrom: r.ayahFrom,
  ayahTo: r.ayahTo,
  speakerId: r.speakerId,
  openings: r.openings,
  kind: r.kind,
  spans,
  ...change,
});

/** An add at 1:5–7, as features/api/supplication-adds.feature adds there, with `spans`. */
const ADD = { surah: 1, ayahFrom: 5, ayahTo: 7, speakerId: "allahs-believing-servants", openings: ["other"], kind: "supplication" };

/** Each way a scenario sends a body's spans that is not a list of spans: the body as sent. */
const NOT_SPANS: Record<string, (body: Record<string, unknown>) => Record<string, unknown>> = {
  "left out": (body) => Object.fromEntries(Object.entries(body).filter(([k]) => k !== "spans")),
  "not a list": (body) => ({ ...body, spans: { from: "2:127:8", to: "2:129:16" } }),
  "a list holding a text": (body) => ({ ...body, spans: ["2:127:8–2:129:16"] }),
  'a span without its "to"': (body) => ({ ...body, spans: [{ from: "2:127:8" }] }),
  'a span whose "from" is a number': (body) => ({ ...body, spans: [{ from: 2127, to: "2:129:16" }] }),
};

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let answer: Answer | undefined;
  let signedIn: SignedIn | undefined;
  /** The Supplications as noted. */
  let noted: Row[] = [];
  /** The ids of the Supplications the scenario added. */
  let added: number[] = [];
  /** The newest Supplication revision before the scenario: those after it are the scenario's own. */
  let lastRevisionId = 0;
  let auditFrom = 0;

  BeforeEachScenario(async () => {
    answer = signedIn = undefined;
    noted = [];
    added = [];
    const { rows } = await database().query<{ last: number | null }>(`select max(id) as last from supplication_revision`);
    lastRevisionId = Number(rows[0].last ?? 0);
  });

  // Put each noted Supplication back as the curated file's load left it, with no spans: its version and revisions
  // directly, and its state by one save through the endpoint, from the version before, so the caches its save
  // refreshed show it again. Each added one is deleted through the endpoint, and its revisions dropped.
  AfterEachScenario(async () => {
    if (noted.length === 0 && added.length === 0) return;
    const admin = credentialHeaders("session cookie", await signIn(ADMIN_EMAIL));
    for (const id of added) {
      const now = await rowById(id);
      if (!now) continue;
      const gone = await send("DELETE", `/api/v1/supplications/${id}`, admin, JSON.stringify({ base: now.version }));
      expect(gone.status, `the added Supplication ${id} is deleted (${gone.text.slice(0, 200)})`).toBe(204);
    }
    const ids = [...noted.map((r) => r.id), ...added];
    const dropRevisions = () => database().query(`delete from supplication_revision where id > $1 and supplication_id = any($2)`, [lastRevisionId, ids]);
    await dropRevisions();
    for (const was of noted) {
      await database().query(`update supplication set version = $2 where id = $1`, [was.id, was.version - 1]);
      const back = await send("PUT", `/api/v1/supplications/${was.id}`, admin, JSON.stringify(bodyOf(was, [], { base: was.version - 1 })));
      expect(back.status, `the Supplication at ${was.surah}:${was.ayahFrom}–${was.ayahTo} is put back (${back.text.slice(0, 200)})`).toBe(200);
    }
    await dropRevisions();
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
    const s = json().supplication as Answered | undefined;
    expect(s, 'the answer holds the Supplication as "supplication"').toBeTypeOf("object");
    return s!;
  };
  const listed = () => {
    const list = json().supplications as Answered[] | undefined;
    expect(Array.isArray(list), 'the answer lists the Supplications as "supplications"').toBe(true);
    return list!;
  };
  const notedRow = () => {
    if (noted.length === 0) throw new Error("no Supplication noted in this scenario");
    return noted[0];
  };
  const addedId = () => {
    if (added.length === 0) throw new Error("no Supplication added in this scenario");
    return added[0];
  };
  const headers = (credential: string) => credentialHeaders(credential, signedIn);
  const save = async (id: number, credential: string, body: unknown) => {
    answer = await send("PUT", `/api/v1/supplications/${id}`, headers(credential), JSON.stringify(body));
  };
  const add = async (credential: string, body: unknown) => {
    answer = await send("POST", "/api/v1/supplications", headers(credential), JSON.stringify(body));
    const id = (answer.json as { supplication?: { id?: number } } | undefined)?.supplication?.id;
    if (answer.status === 201 && typeof id === "number") added.push(id);
  };
  const VERSIONS: Record<string, number> = { one: 1, two: 2, three: 3 };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- arranging

    step("I note the Supplication at {any} and its Supplication revisions", async (_, run: string) => {
      noted.push(await rowAt(run));
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("I note the latest content audit row", async () => {
      auditFrom = await auditMark();
    });

    step("the Supplication at {any} has since been saved with the spans {any}", async (_, run: string, spans: string) => {
      const row = await rowAt(run);
      const res = await send("PUT", `/api/v1/supplications/${row.id}`, headers("session cookie"), JSON.stringify(bodyOf(row, spansIn(spans))));
      expect(res.status, `the earlier save passes (${res.text.slice(0, 200)})`).toBe(200);
    });

    step("a reader reads {string}", async (_, url: string) => {
      answer = await send("GET", url, credentialHeaders("neither cookie nor token"));
      expect(answer.status, `GET ${url}`).toBe(200);
    });

    // ---------------------------------------------------------------- saving

    step("I save the Supplication at {any} with the run {any} and the spans {any}, with {any}", async (_, run: string, to: string, spans: string, credential: string) => {
      const row = await rowAt(run);
      await save(row.id, credential, bodyOf(row, spansIn(spans), parseRun(to)));
    });

    step("I save the Supplication at {any} with the run {any}, keeping its spans, with {any}", async (_, run: string, to: string, credential: string) => {
      const row = await rowAt(run);
      const spans = (await readSpans()).get(row.id);
      expect(spans?.length, "the spans the Supplication has, to keep").toBeGreaterThan(0);
      await save(row.id, credential, bodyOf(row, spans, parseRun(to)));
    });

    step("I save the Supplication at {any} with its spans sent as {any}, with {any}", async (_, run: string, what: string, credential: string) => {
      const row = await rowAt(run);
      await save(row.id, credential, NOT_SPANS[what](bodyOf(row, [])));
    });

    step("I save the Supplication at {any} with no spans, with {any}", async (_, run: string, credential: string) => {
      const row = await rowAt(run);
      await save(row.id, credential, bodyOf(row, []));
    });

    step("I save the Supplication at {any} with the spans {any}, with {any}", async (_, run: string, spans: string, credential: string) => {
      const row = await rowAt(run);
      await save(row.id, credential, bodyOf(row, spansIn(spans)));
    });

    step("I save the noted Supplication with the spans {any}, against its noted version, with {any}", async (_, spans: string, credential: string) => {
      const now = (await rowById(notedRow().id))!;
      await save(now.id, credential, bodyOf(now, spansIn(spans), { base: notedRow().version }));
    });

    // ---------------------------------------------------------------- adding and deleting

    step("I add a Supplication at 1:5–7 with its spans sent as {any}, with {any}", async (_, what: string, credential: string) => {
      await add(credential, NOT_SPANS[what]({ ...ADD, spans: [] }));
    });

    step("I add a Supplication at 1:5–7 with no spans, with {any}", async (_, credential: string) => {
      await add(credential, { ...ADD, spans: [] });
    });

    step("I add a Supplication at 1:5–7 with the spans {any}, with {any}", async (_, spans: string, credential: string) => {
      await add(credential, { ...ADD, spans: spansIn(spans) });
    });

    step("I delete the added Supplication, with {any}", async (_, credential: string) => {
      const now = (await rowById(addedId()))!;
      answer = await send("DELETE", `/api/v1/supplications/${now.id}`, headers(credential), JSON.stringify({ base: now.version }));
    });

    // ---------------------------------------------------------------- the answer

    // {any}, not {int}: an outline's <status> must match it before its Examples fill it in.
    step("the answer's status is {any}", (_, status: string) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 200)})`).toBe(Number(status));
    });

    step("the {any} save's status is {any} too", (_, nth: string, status: string) => {
      expect(answered().status, `the ${nth} save's status (${answered().text.slice(0, 200)})`).toBe(Number(status));
    });

    step("the answer has an error", () => {
      const error = json().error;
      expect(typeof error === "string" && error.trim() !== "", 'the answer says what is wrong in "error"').toBe(true);
    });

    step("the answer's error reads: {any}", (_, error: string) => {
      expect(json().error, 'the answer\'s "error"').toBe(error);
    });

    step("the answer's Supplication has the spans {any} and its noted version plus {any}", (_, spans: string, plus: string) => {
      expect(answeredSupplication()).toMatchObject({ id: notedRow().id, version: notedRow().version + VERSIONS[plus] });
      expect(answeredSupplication().spans, "the answer's Supplication's spans").toEqual(spansIn(spans));
    });

    step("the added Supplication has the spans {any}", (_, spans: string) => {
      expect(answeredSupplication().spans, "the added Supplication's spans").toEqual(spansIn(spans));
    });

    step("the answer lists the Supplication at {any} with the spans {any}", async (_, run: string, spans: string) => {
      const { id } = await rowAt(run);
      expect(listed().find((s) => s.id === id)?.spans, `the spans of the Supplication at ${run} in the answer`).toEqual(spansIn(spans));
    });

    step("every other Supplication in the answer has the spans []", () => {
      const others = listed().filter((s) => !noted.some((n) => n.id === s.id));
      expect(others.length, "other Supplications in the answer").toBeGreaterThan(0);
      expect(others.filter((s) => !Array.isArray(s.spans) || s.spans.length > 0).map((s) => s.id), "other Supplications whose spans are not []").toEqual([]);
    });

    // ---------------------------------------------------------------- the database

    step("the noted Supplications are as I noted them, with no spans and no new Supplication revision", async () => {
      const spans = await readSpans();
      for (const was of noted) {
        expect(await rowById(was.id), `the Supplication at ${was.surah}:${was.ayahFrom}–${was.ayahTo}`).toEqual(was);
        expect(spans.get(was.id), "its spans").toEqual([]);
        expect(await revisionsSince(was.id, lastRevisionId), "its new Supplication revisions").toEqual([]);
      }
    });

    step("the Supplication at {any} still has the spans {any}", async (_, run: string, spans: string) => {
      const { id } = await rowAt(run);
      expect((await readSpans()).get(id), `the spans of the Supplication at ${run}`).toEqual(spansIn(spans));
    });

    step("the database holds no Supplication at 1:5–7", async () => {
      const { rows } = await database().query(`select id from supplication where surah = 1 and ayah_from <= 7 and ayah_to >= 5`);
      expect(rows, "Supplications at 1:5–7").toEqual([]);
    });

    step("no Supplication span is left of the added Supplication", async () => {
      expect(await rowById(addedId()), "the added Supplication").toBeUndefined();
      const { rows } = await database().query(`select * from supplication_span where supplication_id = $1`, [addedId()]);
      expect(rows, "its Supplication spans").toEqual([]);
    });

    // ---------------------------------------------------------------- Supplication revisions and the audit

    step("the newest Supplication revision of the noted Supplication holds the spans {any} before and {any} after", async (_, before: string, after: string) => {
      const newest = (await revisionsSince(notedRow().id, lastRevisionId)).at(-1);
      expect(newest, "a new Supplication revision").toBeDefined();
      expect(newest!.before?.spans, "its spans before").toEqual(spansIn(before));
      expect(newest!.after?.spans, "its spans after").toEqual(spansIn(after));
      expect(newest!.after, "its after, the Supplication as the save answered it").toEqual(answeredSupplication());
    });

    step("the added Supplication's revisions are kept, the delete's holding the spans {any} before and nothing after", async (_, spans: string) => {
      const revisions = await revisionsSince(addedId(), lastRevisionId);
      expect(revisions.map((r) => r.version), "the add's and the delete's revisions").toEqual([1, 2]);
      expect(revisions[0].after?.spans, "the add's spans after").toEqual(spansIn(spans));
      expect(revisions[1].before?.spans, "the delete's spans before").toEqual(spansIn(spans));
      expect(revisions[1].after, "the delete's after").toBeNull();
    });

    step("the content audit since holds exactly one insert into `supplication_span`, by the Admin's Account id", async () => {
      const rows = await auditRowsSince(auditFrom, "supplication_span");
      expect(rows.map((r) => ({ operation: r.operation, actor: r.actor })), "the audit of `supplication_span` since").toEqual([
        { operation: "insert", actor: await accountId(signedIn!) },
      ]);
    });
  });

  Scenario("An Admin saves the Supplication at 2:127–129 with one span across its Ayahs, and the save and the read answer it", () => {});
  Scenario('Several spans, sent out of order, are answered in reading order by "from"', () => {});
  Scenario("A span may stop partway through an Ayah, and may be one Word", () => {});
  Scenario("An identical span sent twice is kept once", () => {});
  Scenario("The Supplication revision holds the spans before and after each save", () => {});
  Scenario("A save of the spans is audited under the Admin's Account id", () => {});
  Scenario("A save made against an older version is refused, and its answer's latest Supplication carries the spans saved since", () => {});
  ScenarioOutline("A save whose spans are <what> is not a save, and changes nothing", () => {});
  ScenarioOutline("An add whose spans are <what> is not an add, and adds nothing", () => {});
  ScenarioOutline("A save of the Supplication at 2:127–129 with the spans <spans> is refused, naming the wrong span", () => {});
  Scenario("The run's own checks come before the spans'", () => {});
  ScenarioOutline("A change of run to <run> that would strand a span is refused", () => {});
  Scenario("A change of run that takes out the span it would strand passes", () => {});
  Scenario("An add takes its spans, and a delete removes them while its revisions keep them", () => {});
  Scenario("An add with no spans answers the spans []", () => {});
  Scenario("An add's spans are checked as a save's", () => {});
});
