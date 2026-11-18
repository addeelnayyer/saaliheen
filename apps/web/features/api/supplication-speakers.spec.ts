import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { ADMIN_EMAIL } from "../site/admin-settings.ts";
import { curated, runOf } from "../site/supplications-data.ts";
import { credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

// An Admin's adds, saves and deletes of Speakers (#202, #196, ADR 0027): POST
// /api/v1/supplications/speakers and PUT and DELETE
// /api/v1/supplications/speakers/{id} over HTTP, as the Supplication editor
// sends them, and what they leave in the run's Postgres: the
// `supplication_speaker` rows and the Speaker revisions in
// `supplication_speaker_revision`, which no endpoint answers. After each
// scenario the Speakers are put back as the curated file's load left them,
// through the endpoints, so that the caches the saves refreshed show the
// curated file again to the features that follow; then their versions are set
// back to 1, as supplications.feature reads them, and the scenario's revisions
// are removed.

const feature = await loadFeature("./supplication-speakers.feature");

interface Speaker {
  id: string;
  nameEn: string;
  nameUr: string;
  includesProphet: boolean;
  version: number;
}
interface Revision {
  speaker_id: string;
  author: string;
  base: number;
  version: number;
  before: Speaker | null;
  after: Speaker | null;
}

const COLUMNS = `id, name_en as "nameEn", name_ur as "nameUr", includes_prophet as "includesProphet", version`;

/** Every Speaker the database holds, by id. */
async function everySpeaker(): Promise<Speaker[]> {
  const { rows } = await database().query<Speaker>(`select ${COLUMNS} from supplication_speaker order by id`);
  return rows.map((r) => ({ ...r, version: Number(r.version) }));
}

async function oneSpeaker(id: string): Promise<Speaker> {
  const speaker = (await everySpeaker()).find((s) => s.id === id);
  expect(speaker, `a Speaker "${id}" in the database`).toBeDefined();
  return speaker!;
}

/** The Speaker revisions written since revision `since`, oldest first. */
async function revisionsSince(since: number): Promise<Revision[]> {
  const { rows } = await database().query<Revision>(`select * from supplication_speaker_revision where id > $1 order by id`, [since]);
  return rows.map((r) => ({ ...r, base: Number(r.base), version: Number(r.version) }));
}

/** The text of each entry's heading in a page of served HTML. */
const headingsOf = (html: string) =>
  [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
    m[1]
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

const prophetMark = (who: string) => who === "who includes a Prophet";

type StepFn = Parameters<StepTest["Given"]>[1];

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario, defineSteps }) => {
  let answer: Answer | undefined;
  let signedIn: SignedIn | undefined;
  /** The Speaker as noted, or as added in arranging. */
  let noted: Speaker | undefined;
  /** The answer's Speaker from before the latest read. */
  let remembered: Speaker | undefined;
  /** The newest Speaker revision before the scenario: those after it are the scenario's own. */
  let lastRevisionId = 0;
  /** The newest Speaker revision before the scenario's arranging: those after it are removed after the scenario. */
  let firstRevisionId = 0;

  BeforeEachScenario(async () => {
    answer = signedIn = noted = remembered = undefined;
    const { rows } = await database().query<{ last: number | null }>(`select max(id) as last from supplication_speaker_revision`);
    lastRevisionId = firstRevisionId = Number(rows[0].last ?? 0);
  });

  // Put the Speakers back as the curated file's load left them, through the endpoints: delete each one the file
  // hasn't, save each one it has that differs, then set their versions back to 1.
  AfterEachScenario(async () => {
    const admin = credentialHeaders("session cookie", await signIn(ADMIN_EMAIL));
    const wanted = curated().speakers;
    for (const speaker of await everySpeaker()) {
      const was = wanted.find((c) => c.id === speaker.id);
      if (!was) {
        const res = await send("DELETE", `/api/v1/supplications/speakers/${speaker.id}`, admin, JSON.stringify({ base: speaker.version }));
        expect(res.status, `the Speaker "${speaker.id}" is taken out (${res.text.slice(0, 200)})`).toBe(204);
      } else if (was.nameEn !== speaker.nameEn || was.nameUr !== speaker.nameUr || was.includesProphet !== speaker.includesProphet) {
        const { nameEn, nameUr, includesProphet } = was;
        const res = await send("PUT", `/api/v1/supplications/speakers/${speaker.id}`, admin, JSON.stringify({ nameEn, nameUr, includesProphet, base: speaker.version }));
        expect(res.status, `the Speaker "${speaker.id}" is put back (${res.text.slice(0, 200)})`).toBe(200);
      }
    }
    await database().query(`update supplication_speaker set version = 1 where version <> 1`);
    await database().query(`delete from supplication_speaker_revision where id > $1`, [firstRevisionId]);
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
  const answeredSpeaker = () => {
    const s = json().speaker as Speaker | undefined;
    expect(s, 'the answer holds the Speaker as "speaker"').toBeTypeOf("object");
    return s!;
  };
  const notedSpeaker = () => {
    if (!noted) throw new Error("no Speaker noted in this scenario");
    return noted;
  };
  const sendAs = async (method: string, path: string, credential: string, body: unknown) => {
    answer = await send(method, path, credentialHeaders(credential, signedIn), JSON.stringify(body));
  };
  const admin = () => credentialHeaders("session cookie", signedIn);
  const listedSpeakers = () => (json().speakers as Speaker[] | undefined) ?? [];

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    // ---------------------------------------------------------------- arranging

    step("I note the Speaker {string} and his Speaker revisions", async (_, id: string) => {
      noted = await oneSpeaker(id);
    });

    step("I am signed in as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    for (const text of ["a reader has read {string}", "a reader reads {string}"]) {
      step(text, async (_, url: string) => {
        if (answer?.json && typeof answer.json === "object" && "speaker" in answer.json) remembered = answeredSpeaker();
        answer = await send("GET", url, credentialHeaders("neither cookie nor token"));
        expect(answer.status, `GET ${url}`).toBe(200);
      });
    }

    step("the Speaker {string} has since been saved named {string} and {string}", async (_, id: string, nameEn: string, nameUr: string) => {
      const { version, includesProphet } = await oneSpeaker(id);
      const res = await send("PUT", `/api/v1/supplications/speakers/${id}`, admin(), JSON.stringify({ nameEn, nameUr, includesProphet, base: version }));
      expect(res.status, `the earlier save passes (${res.text.slice(0, 200)})`).toBe(200);
    });

    step("I have added the Speaker {string}, {string}, {any}", async (_, nameEn: string, nameUr: string, who: string) => {
      const res = await send("POST", "/api/v1/supplications/speakers", admin(), JSON.stringify({ nameEn, nameUr, includesProphet: prophetMark(who) }));
      expect(res.status, `the add passes (${res.text.slice(0, 200)})`).toBe(201);
      noted = (res.json as { speaker: Speaker }).speaker;
      // The add is the scenario's arranging: only the revisions after it are what the scenario checks.
      const { rows } = await database().query<{ last: number }>(`select max(id) as last from supplication_speaker_revision`);
      lastRevisionId = Number(rows[0].last);
    });

    // ---------------------------------------------------------------- adding, saving, deleting

    step("I add the Speaker {string}, {string}, {any}, with {any}", async (_, nameEn: string, nameUr: string, who: string, credential: string) => {
      await sendAs("POST", "/api/v1/supplications/speakers", credential, { nameEn, nameUr, includesProphet: prophetMark(who) });
    });

    step(
      "I save the Speaker {string} named {string} and {string}, {any}, against his own version, with {any}",
      async (_, id: string, nameEn: string, nameUr: string, who: string, credential: string) => {
        const { version } = await oneSpeaker(id);
        await sendAs("PUT", `/api/v1/supplications/speakers/${id}`, credential, { nameEn, nameUr, includesProphet: prophetMark(who), base: version });
      },
    );

    step(
      "I save the Speaker {string} named {string} and {string}, {any}, against his noted version, with {any}",
      async (_, id: string, nameEn: string, nameUr: string, who: string, credential: string) => {
        await sendAs("PUT", `/api/v1/supplications/speakers/${id}`, credential, { nameEn, nameUr, includesProphet: prophetMark(who), base: notedSpeaker().version });
      },
    );

    step("I save the Speaker {string} with his Prophet mark sent as the text {string}, with {any}", async (_, id: string, mark: string, credential: string) => {
      const { nameEn, nameUr, version } = await oneSpeaker(id);
      await sendAs("PUT", `/api/v1/supplications/speakers/${id}`, credential, { nameEn, nameUr, includesProphet: mark, base: version });
    });

    step("I delete the Speaker {string} against its own version, with {any}", async (_, id: string, credential: string) => {
      const { version } = await oneSpeaker(id);
      await sendAs("DELETE", `/api/v1/supplications/speakers/${id}`, credential, { base: version });
    });

    step("I send the Speaker {any} with {any}", async (_, action: string, credential: string) => {
      const { nameEn, includesProphet, version } = await oneSpeaker("musa");
      if (action === "add") await sendAs("POST", "/api/v1/supplications/speakers", credential, { nameEn: "The people of Yunus", nameUr: "قومِ یونس", includesProphet: false });
      else if (action === "save") await sendAs("PUT", "/api/v1/supplications/speakers/musa", credential, { nameEn, nameUr: "حضرت موسیٰ", includesProphet, base: version });
      else await sendAs("DELETE", "/api/v1/supplications/speakers/musa", credential, { base: version });
    });

    step("I send a Speaker {any} to {string}, with {any}", async (_, action: string, path: string, credential: string) => {
      if (action === "save") await sendAs("PUT", path, credential, { nameEn: "Nobody", nameUr: "کوئی نہیں", includesProphet: false, base: 1 });
      else await sendAs("DELETE", path, credential, { base: 1 });
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

    step("the answer's error says {string} still says the curated file's Supplications of {string}", (_, name: string, id: string) => {
      const count = curated().supplications.filter((s) => s.speakerId === id).length;
      expect(json().error).toBe(`${name} still says ${count} Supplications. Give each of them another Speaker before deleting ${name}.`);
    });

    step(
      "the answer's Speaker is {string}, named {string} and {string}, {any}, at version {int}",
      (_, id: string, nameEn: string, nameUr: string, who: string, version: number) => {
        expect(answeredSpeaker()).toEqual({ id, nameEn, nameUr, includesProphet: prophetMark(who), version });
      },
    );

    step(
      "the answer's Speaker is {string}, named {string} and {string}, {any}, at his noted version plus one",
      (_, id: string, nameEn: string, nameUr: string, who: string) => {
        expect(answeredSpeaker()).toEqual({ id, nameEn, nameUr, includesProphet: prophetMark(who), version: notedSpeaker().version + 1 });
      },
    );

    step("the answer lists the answer's Speaker from before", () => {
      if (!remembered) throw new Error("no Speaker answered before this read");
      expect(listedSpeakers().find((s) => s.id === remembered!.id), "the Speaker in /api/v1/supplications").toEqual(remembered);
    });

    step("the answer lists no Speaker {string}", (_, id: string) => {
      expect(listedSpeakers().map((s) => s.id)).not.toContain(id);
    });

    step("the page served has no entry for any of the curated file's Supplications said by {string}", (_, id: string) => {
      const headings = headingsOf(answered().text);
      expect(headings.length, "the page's entries").toBeGreaterThan(0);
      for (const s of curated().supplications.filter((c) => c.speakerId === id)) {
        expect(headings.filter((h) => h.endsWith(` ${runOf(s)}`)), `entries for ${runOf(s)}`).toEqual([]);
      }
    });

    // ---------------------------------------------------------------- the database

    step("the database still holds just the curated file's Speakers, with no new Speaker revision", async () => {
      const wanted = curated().speakers.map((s) => ({ ...s, version: 1 }));
      const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);
      expect((await everySpeaker()).toSorted(byId)).toEqual(wanted.toSorted(byId));
      expect(await revisionsSince(lastRevisionId), "new Speaker revisions").toEqual([]);
    });

    const theRevisions = async (id: string) =>
      (await revisionsSince(lastRevisionId)).filter((r) => r.speaker_id === id).map(({ author, base, version, before, after }) => ({ author, base, version, before, after }));

    step(
      "exactly one Speaker revision names {string}, by {string}, with base {int} and version {int}, nothing before and the answer's Speaker after",
      async (_, id: string, author: string, base: number, version: number) => {
        expect(await theRevisions(id)).toEqual([{ author, base, version, before: null, after: answeredSpeaker() }]);
      },
    );

    step(
      "exactly one Speaker revision names {string}, by {string}, with base his noted version and version one more, the noted Speaker before and the answer's Speaker after",
      async (_, id: string, author: string) => {
        const was = notedSpeaker();
        expect(await theRevisions(id)).toEqual([{ author, base: was.version, version: was.version + 1, before: was, after: answeredSpeaker() }]);
      },
    );

    step(
      "exactly one Speaker revision names {string}, by {string}, with base {int} and version {int}, the added Speaker before and nothing after",
      async (_, id: string, author: string, base: number, version: number) => {
        expect(await theRevisions(id)).toEqual([{ author, base, version, before: notedSpeaker(), after: null }]);
      },
    );
  });

  Scenario("An Admin adds a Speaker, at version 1, and GET /api/v1/supplications lists it at once", () => {});
  ScenarioOutline("An add with a blank name or another Speaker's is refused 422, and adds nothing", () => {});
  Scenario("An Admin renames Musa in Urdu and unmarks him as a Prophet, and every Supplication of Musa shows it at once", () => {});
  Scenario("A Speaker save made against an older version is refused, with the latest Speaker", () => {});
  ScenarioOutline("A Speaker save with a blank name or another Speaker's is refused 422, and changes nothing", () => {});
  Scenario("An Admin deletes a Speaker who says no Supplication, and its revision is kept", () => {});
  Scenario("A Speaker who still says a Supplication can't be deleted", () => {});
  ScenarioOutline("A Speaker <action> with <credential> is refused <status>, and changes nothing", () => {});
  ScenarioOutline("A Speaker <action> of an id no Speaker has is answered 404", () => {});
  Scenario("A body that isn't a Speaker save is answered 400, and changes nothing", () => {});
});
