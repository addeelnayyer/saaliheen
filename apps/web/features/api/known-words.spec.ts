import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { accountId, credentialHeaders, database, send, signIn, type Answer, type SignedIn } from "./support";

const feature = await loadFeature("./known-words.feature");

const KNOWN_WORDS = "/api/v1/known-words";
type StepFn = Parameters<StepTest["Given"]>[1];

/** A Known words entry as the API holds it: markedAt in milliseconds since the epoch. */
interface KnownWordEntry {
  kind: string;
  text: string;
  known: boolean;
  markedAt: number;
}

/** A scenario's table of Known words, `| kind | text | known | marked at |` (a UTC time), as the API holds them. */
function knownWordsOf(table: Record<string, string>[]): KnownWordEntry[] {
  return table.map((row) => {
    const markedAt = Date.parse(row["marked at"]);
    if (!Number.isFinite(markedAt) || !["true", "false"].includes(row.known)) throw new Error(`not a Known words entry: ${JSON.stringify(row)}`);
    return { kind: row.kind, text: row.text, known: row.known === "true", markedAt };
  });
}

/** The body that brings `entries` to the Account. */
const bodyOf = (entries: KnownWordEntry[]) => JSON.stringify({ knownWords: entries });

/** An answer's Known words, after checking it is a JSON object holding exactly a list of them. */
function knownWordsIn(answer: Answer): unknown {
  expect(answer.status, `the API's answer: ${answer.text.slice(0, 200)}`).toBe(200);
  expect(Object.keys((answer.json ?? {}) as object), "the answer holds exactly the Known words").toEqual(["knownWords"]);
  return (answer.json as { knownWords: unknown }).knownWords;
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  /** Who this scenario last signed in as. */
  let signedIn: SignedIn | undefined;
  /** The API's last answer. */
  let answer: Answer | undefined;

  BeforeEachScenario(() => {
    signedIn = undefined;
    answer = undefined;
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const headersFor = (credential: string) => credentialHeaders(credential, signedIn);

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in to an Account as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("I GET {string} with my {any}", async (_, path: string, credential: string) => {
      answer = await send("GET", path, headersFor(credential));
    });

    step("I PATCH {string} with my {any} and these Known words:", async (_, path: string, credential: string, table: Record<string, string>[]) => {
      answer = await send("PATCH", path, headersFor(credential), bodyOf(knownWordsOf(table)));
    });

    step("I PATCH {string} with my {any} and the body {string}", async (_, path: string, credential: string, body: string) => {
      answer = await send("PATCH", path, headersFor(credential), body);
    });

    step("the Account has these Known words:", async (_, table: Record<string, string>[]) => {
      const saved = await send("PATCH", KNOWN_WORDS, headersFor("session cookie"), bodyOf(knownWordsOf(table)));
      expect(saved.status, `the API kept the Known words: ${saved.text.slice(0, 200)}`).toBe(200);
    });

    step("the API answers {int} with JSON", (_, status: number) => {
      const { status: got, headers, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof answered().json, "a JSON object").toBe("object");
    });

    step("the API answers {int} with a JSON error", (_, status: number) => {
      const { status: got, headers, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof (json as { error?: unknown } | undefined)?.error, "an error named in the answer's `error`").toBe("string");
    });

    step("the answer holds no Known words", () => {
      expect(knownWordsIn(answered())).toEqual([]);
    });

    step("the answer holds these Known words, oldest marked first:", (_, table: Record<string, string>[]) => {
      expect(knownWordsIn(answered())).toEqual(knownWordsOf(table));
    });

    step(
      "reading the Known words back with my {any} gives these, oldest marked first:",
      async (_, credential: string, table: Record<string, string>[]) => {
        const read = await send("GET", KNOWN_WORDS, headersFor(credential));
        expect(knownWordsIn(read)).toEqual(knownWordsOf(table));
      },
    );

    // The storage itself (AC-4), read where no endpoint answers it: the Account's rows, in any order.
    step("the Account database holds these rows of the Account's Known words:", async (_, table: Record<string, string>[]) => {
      if (!signedIn) throw new Error("not signed in in this scenario");
      const { rows } = await database().query<{ kind: string; text: string; known: boolean; marked_at: string }>(
        `select kind, text, known, marked_at from known_word where "userId" = $1`,
        [await accountId(signedIn)],
      );
      const held = rows.map((r) => ({ kind: r.kind, text: r.text, known: r.known, markedAt: Number(r.marked_at) }));
      const byText = (a: KnownWordEntry, b: KnownWordEntry) => `${a.kind} ${a.text}`.localeCompare(`${b.kind} ${b.text}`);
      expect(held.sort(byText)).toEqual(knownWordsOf(table).sort(byText));
    });

    step("no change to Known words is in the content audit", async () => {
      const { rows } = await database().query<{ n: number }>(`select count(*)::int as n from content_audit where table_name = 'known_word'`);
      expect(rows[0].n, "content_audit rows of known_word").toBe(0);
    });

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  ScenarioOutline("A new Account reads its Known words with its <credential>, and has none yet", () => {});

  ScenarioOutline("An Account brings marks and unmarks with its <credential> and reads them back with its <other credential>", () => {});

  Scenario("An unmark beats an older mark sent after it", () => {});

  Scenario("A newer mark beats an older unmark", () => {});

  Scenario("A mark and an unmark made at the same moment leave it unmarked", () => {});

  Scenario("A device's Known words merge with the Account's, the newer kept for each Root and particle", () => {});

  Scenario("A Root and a particle written alike are different Known words", () => {});

  Scenario("The Account database keeps one row per Root or particle, holding whether it is known and when it was marked", () => {});

  ScenarioOutline("Bringing Known words with the body <body> is refused and changes nothing", () => {});

  Scenario("One Account's Known words are never another's", () => {});

  /** A PATCH body that brings one valid Known words entry. */
  const ONE_ENTRY = bodyOf([{ kind: "root", text: "ر ح م", known: true, markedAt: Date.parse("2026-10-01T08:00:00Z") }]);

  /** Send `method` to the Known words with `credential`, a PATCH bringing one entry. */
  const sendMethod = async (method: string, credential: string) => {
    answer = await send(method, KNOWN_WORDS, headersFor(credential), method === "PATCH" ? ONE_ENTRY : undefined);
  };

  ScenarioOutline("The API refuses a <method> of the Known words with <credential>", ({ When }, variables) => {
    When(`I <method> "${KNOWN_WORDS}" with <credential>`, () => sendMethod(variables.method, variables.credential));
  });

  ScenarioOutline("The answer to a <method> of the Known words names the minimum app version", ({ When }, variables) => {
    When(`I <method> "${KNOWN_WORDS}" with my bearer token`, () => sendMethod(variables.method, "bearer token"));
  });
});
