import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { curated, openingsIn, parseRun, quranOrder, runOf } from "../site/supplications-data.ts";
import { credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// An Admin's save of a Supplication (#201, #196, ADR 0027): PUT
// /api/v1/supplications/{id} over HTTP, as the Supplication editor sends it,
// and what the save leaves in the run's Postgres: the `supplication` row, read
// directly as features/api/supplications.spec.ts reads it, and the
// Supplication revisions in `supplication_revision`, which no endpoint answers.
// Each scenario's Supplication is found by its run in the curated file's load,
// and put back after the scenario, its version and revisions as the load left
// them, through one save at the endpoint, so that the caches the save refreshed
// show the curated file again to the features that follow.

const feature = await loadFeature("./supplication-saves.feature");

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
  created_at: Date;
  base: number;
  version: number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/** What the editor sends: the whole editable state, its spans (#270) included, and its base. */
interface SaveBody {
  base: number;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  openings: string[];
  kind: string;
  spans: { from: string; to: string }[];
}

const COLUMNS = `id, surah, ayah_from as "ayahFrom", ayah_to as "ayahTo", speaker_id as "speakerId", openings, kind, version`;

const numeric = (r: Row): Row => ({
  ...r,
  id: Number(r.id),
  surah: Number(r.surah),
  ayahFrom: Number(r.ayahFrom),
  ayahTo: Number(r.ayahTo),
  version: Number(r.version),
});

/** The Supplication whose run is `run`, exactly. */
async function rowAt(run: string): Promise<Row> {
  const { surah, ayahFrom, ayahTo } = parseRun(run);
  const { rows } = await database().query<Row>(`select ${COLUMNS} from supplication where surah = $1 and ayah_from = $2 and ayah_to = $3`, [surah, ayahFrom, ayahTo]);
  expect(rows.length, `one Supplication at ${run} in the database`).toBe(1);
  return numeric(rows[0]);
}

/** Supplication `id` as the database holds it now. */
async function rowById(id: number): Promise<Row> {
  const { rows } = await database().query<Row>(`select ${COLUMNS} from supplication where id = $1`, [id]);
  expect(rows.length, `Supplication ${id} in the database`).toBe(1);
  return numeric(rows[0]);
}

/** The Supplication revisions of Supplication `id` written since revision `since`, oldest first. */
async function revisionsSince(id: number, since: number): Promise<Revision[]> {
  const { rows } = await database().query<Revision>(`select * from supplication_revision where supplication_id = $1 and id > $2 order by version, created_at`, [id, since]);
  return rows.map((r) => ({ ...r, supplication_id: Number(r.supplication_id), base: Number(r.base), version: Number(r.version) }));
}

const bodyOf = (r: Row, change: Partial<SaveBody> = {}): SaveBody => ({
  base: r.version,
  surah: r.surah,
  ayahFrom: r.ayahFrom,
  ayahTo: r.ayahTo,
  speakerId: r.speakerId,
  openings: r.openings,
  kind: r.kind,
  spans: [],
  ...change,
});

/** A Supplication's editable state, as a scenario names it: its run, Speaker, Openings and kind. */
const stateOf = (run: string, speakerId: string, openings: string, kind: string) => {
  const { surah, ayahFrom, ayahTo } = parseRun(run);
  return { surah, ayahFrom, ayahTo, speakerId, openings: openingsIn(openings), kind };
};

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
  /** The revision the scenario's save wrote. */
  let revision: Revision | undefined;
  /** The newest Supplication revision before the scenario: those after it are the scenario's own. */
  let lastRevisionId = 0;

  BeforeEachScenario(async () => {
    answer = signedIn = revision = undefined;
    noted = [];
    const { rows } = await database().query<{ last: number | null }>(`select max(id) as last from supplication_revision`);
    lastRevisionId = Number(rows[0].last ?? 0);
  });

  // Put each noted Supplication back as the curated file's load left it: its version and revisions directly, and its
  // state by one save through the endpoint, from the version before, so the caches its save refreshed show it again.
  AfterEachScenario(async () => {
    if (noted.length === 0) return;
    const admin = await signIn(ADMIN_EMAIL);
    const dropRevisions = () =>
      database().query(`delete from supplication_revision where id > $1 and supplication_id = any($2)`, [lastRevisionId, noted.map((r) => r.id)]);
    await dropRevisions();
    for (const was of noted) {
      await database().query(`update supplication set version = $2 where id = $1`, [was.id, was.version - 1]);
      const back = await send("PUT", `/api/v1/supplications/${was.id}`, credentialHeaders("session cookie", admin), JSON.stringify(bodyOf(was, { base: was.version - 1 })));
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
    const s = json().supplication as Row | undefined;
    expect(s, 'the answer holds the Supplication as "supplication"').toBeTypeOf("object");
    return s!;
  };
  const notedRow = () => {
    if (noted.length === 0) throw new Error("no Supplication noted in this scenario");
    return noted[0];
  };
  const save = async (id: number, credential: string, body: unknown) => {
    answer = await send("PUT", `/api/v1/supplications/${id}`, credentialHeaders(credential, signedIn), JSON.stringify(body));
  };
  const newRevisions = () => revisionsSince(notedRow().id, lastRevisionId);

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

    // ---------------------------------------------------------------- saving

    step(
      "I save the Supplication at {any} with the run {any}, the Speaker {string}, the Openings {string} and the kind {string}, against its own version, with {any}",
      async (_, run: string, to: string, speakerId: string, openings: string, kind: string, credential: string) => {
        const row = await rowAt(run);
        await save(row.id, credential, bodyOf(row, stateOf(to, speakerId, openings, kind)));
      },
    );

    step("I save the Supplication at 2:127–129's state to {string}, with {any}", async (_, path: string, credential: string) => {
      answer = await send("PUT", path, credentialHeaders(credential, signedIn), JSON.stringify(bodyOf(await rowAt("2:127–129"))));
    });

    step("I save the noted Supplication with its Openings sent as the text {string}, with {any}", async (_, openings: string, credential: string) => {
      const now = await rowById(notedRow().id);
      await save(now.id, credential, { ...bodyOf(now), openings });
    });

    step("the Supplication at {any} has since been saved with the Openings {string}", async (_, run: string, openings: string) => {
      const row = await rowAt(run);
      const res = await send("PUT", `/api/v1/supplications/${row.id}`, credentialHeaders("session cookie", signedIn), JSON.stringify(bodyOf(row, { openings: openingsIn(openings) })));
      expect(res.status, `the earlier save passes (${res.text.slice(0, 200)})`).toBe(200);
    });

    step("I save the noted Supplication with the Openings {string}, against its noted version, with {any}", async (_, openings: string, credential: string) => {
      const now = await rowById(notedRow().id);
      await save(now.id, credential, bodyOf(now, { openings: openingsIn(openings), base: notedRow().version }));
    });

    step(
      "I save the noted Supplication with the Surah {any}, Ayahs {any} to {any}, the Speaker {string}, the Openings {string} and the kind {string}, against its own version, with {any}",
      async (_, surah: string, from: string, to: string, speakerId: string, openings: string, kind: string, credential: string) => {
        const now = await rowById(notedRow().id);
        await save(now.id, credential, bodyOf(now, { surah: Number(surah), ayahFrom: Number(from), ayahTo: Number(to), speakerId, openings: openingsIn(openings), kind }));
      },
    );

    // A read before the save, so the caches the save must refresh hold the Supplications from before it.
    for (const text of ["a reader has read {string}", "a reader reads {string}"]) {
      step(text, async (_, url: string) => {
        answer = await send("GET", url, credentialHeaders("neither cookie nor token"));
        expect(answer.status, `GET ${url}`).toBe(200);
      });
    }

    // ---------------------------------------------------------------- the answer

    step("the second save's status is {int} too", (_, status: number) => {
      expect(answered().status, answered().text.slice(0, 300)).toBe(status);
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

    step("the answer's Supplication has the Openings {string} and its noted version plus one", (_, openings: string) => {
      expect(answeredSupplication()).toMatchObject({ id: notedRow().id, openings: openingsIn(openings), version: notedRow().version + 1 });
    });

    step(
      "the answer lists the noted Supplication with the run {any}, the Speaker {string}, the Openings {string}, the kind {string} and its noted version plus one",
      (_, run: string, speakerId: string, openings: string, kind: string) => {
        const listed = (json().supplications as Row[]).find((s) => s.id === notedRow().id);
        expect(listed, "the Supplication in /api/v1/supplications").toEqual({ id: notedRow().id, ...stateOf(run, speakerId, openings, kind), version: notedRow().version + 1, spans: [] });
      },
    );

    step("the page served has an entry headed {string} and none headed {string}", (_, shown: string, gone: string) => {
      const headings = [...answered().text.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => textOf(m[1]));
      expect(headings, "the entries' headings").toContain(shown);
      expect(headings, "the entries' headings").not.toContain(gone);
    });

    // {any}, not {int}: an outline's <status> must match it before its Examples fill it in.
    step("the answer's status is {any}", (_, status: string) => {
      expect(answered().status, `the answer's status (${answered().text.slice(0, 200)})`).toBe(Number(status));
    });

    step(
      "the answer's Supplication is the noted one with the run {any}, the Speaker {string}, the Openings {string}, the kind {string} and its noted version plus one",
      (_, run: string, speakerId: string, openings: string, kind: string) => {
        expect(answeredSupplication()).toEqual({ id: notedRow().id, ...stateOf(run, speakerId, openings, kind), version: notedRow().version + 1, spans: [] });
      },
    );

    // ---------------------------------------------------------------- the database

    step(
      "the noted Supplication in the database has the run {any}, the Speaker {string}, the Openings {string}, the kind {string} and its noted version plus one",
      async (_, run: string, speakerId: string, openings: string, kind: string) => {
        expect(await rowById(notedRow().id)).toEqual({ id: notedRow().id, ...stateOf(run, speakerId, openings, kind), version: notedRow().version + 1 });
      },
    );

    step("the noted Supplication in the database has the Openings {string} and its noted version plus one", async (_, openings: string) => {
      expect(await rowById(notedRow().id)).toMatchObject({ openings: openingsIn(openings), version: notedRow().version + 1 });
    });

    step(
      "the noted Supplication in the database has the run {any}, the Speaker {string}, the Openings {string}, the kind {string} and its noted version plus two",
      async (_, run: string, speakerId: string, openings: string, kind: string) => {
        expect(await rowById(notedRow().id)).toEqual({ id: notedRow().id, ...stateOf(run, speakerId, openings, kind), version: notedRow().version + 2 });
      },
    );

    step("the noted Supplications are as I noted them, with no new Supplication revision", async () => {
      for (const was of noted) {
        expect(await rowById(was.id), `the Supplication at ${was.surah}:${was.ayahFrom}–${was.ayahTo}`).toEqual(was);
        expect(await revisionsSince(was.id, lastRevisionId), "its new Supplication revisions").toEqual([]);
      }
    });

    step("the database still holds just the curated file's Supplications", async () => {
      const { rows } = await database().query<Row>(`select ${COLUMNS} from supplication order by surah, ayah_from`);
      expect(rows.map(numeric).map(runOf)).toEqual(curated().supplications.toSorted(quranOrder).map(runOf));
    });

    // ---------------------------------------------------------------- Supplication revisions

    step("exactly one new Supplication revision names the noted Supplication", async () => {
      const added = await newRevisions();
      expect(added.length, "new Supplication revisions of the noted Supplication").toBe(1);
      revision = added[0];
    });

    step(
      "exactly {int} new Supplication revisions name the noted Supplication, their versions the noted version plus one and plus two",
      async (_, count: number) => {
        const added = await newRevisions();
        expect(added.length, "new Supplication revisions").toBe(count);
        const v = notedRow().version;
        expect(added.map((r) => [r.base, r.version])).toEqual([
          [v, v + 1],
          [v + 1, v + 2],
        ]);
      },
    );

    const theRevision = () => {
      if (!revision) throw new Error("no Supplication revision found yet in this scenario");
      return revision;
    };

    step("that Supplication revision's author is {string}, made within the last minute", (_, author: string) => {
      expect(theRevision().author, "the revision's author").toBe(author);
      const age = Date.now() - new Date(theRevision().created_at).getTime();
      expect(age >= -5_000 && age < 60_000, `the revision was made ${age} ms ago`).toBe(true);
    });

    step("that Supplication revision's base is the noted version and its version the noted version plus one", () => {
      expect([theRevision().base, theRevision().version]).toEqual([notedRow().version, notedRow().version + 1]);
    });

    step("that Supplication revision holds the noted Supplication before the save", () => {
      expect(theRevision().before, "the revision's before").toEqual({ ...notedRow(), spans: [] });
    });

    step("that Supplication revision holds the answer's Supplication after the save", () => {
      expect(theRevision().after, "the revision's after").toEqual(answeredSupplication());
    });
  });

  Scenario("An Admin changes the Speaker, Openings and run of the Supplication at 2:127–129, and the save passes", () => {});
  Scenario("A save writes exactly one Supplication revision, naming the Admin, with the Supplication before and after", () => {});
  Scenario("A save through the bearer token passes too, and each save moves the version on by one", () => {});
  Scenario("Openings are kept once each, in the order Rabbana, Rabbi, Other", () => {});
  Scenario("After a save, GET /api/v1/supplications and the Supplications page show it at once", () => {});
  ScenarioOutline("A save with <credential> is refused <status>, and changes nothing", () => {});
  ScenarioOutline("A save of <path> is answered 404, with an error", () => {});
  Scenario("A body that isn't a save is answered 400, with an error, and changes nothing", () => {});
  ScenarioOutline("A save made against an older version is refused, with the latest Supplication, through the <credential>", () => {});
  ScenarioOutline("A save of the Supplication at 2:127–129 that breaks a rule is refused, saying which", () => {});
  Scenario("A run taking in Other words to Allah names them as such", () => {});
});
