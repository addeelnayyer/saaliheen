import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { credentialHeaders, send, signIn, type Answer, type SignedIn } from "./support";

const feature = await loadFeature("./reading-places.feature");

const READING_PLACES = "/api/v1/reading-places";
type StepFn = Parameters<StepTest["Given"]>[1];

/** A Reading place as the API holds it: readAt in milliseconds since the epoch. */
interface TimedReadingPlace {
  surah: number;
  ayah: number;
  readAt: number;
}

/** A scenario's table of Reading places, `| place | read at |` (surah:ayah, a UTC time), as the API holds them. */
function readingPlacesOf(table: Record<string, string>[]): TimedReadingPlace[] {
  return table.map((row) => {
    const [surah, ayah] = row.place.split(":").map(Number);
    const readAt = Date.parse(row["read at"]);
    if (!surah || !ayah || !Number.isFinite(readAt)) throw new Error(`not a Reading place and a time: ${JSON.stringify(row)}`);
    return { surah, ayah, readAt };
  });
}

/** The body that brings `places` to the Account. */
const bodyOf = (places: TimedReadingPlace[]) => JSON.stringify({ readingPlaces: places });

/** An answer's Reading places, after checking it is a JSON object holding exactly a list of them. */
function readingPlacesIn(answer: Answer): unknown {
  expect(answer.status, `the API's answer: ${answer.text.slice(0, 200)}`).toBe(200);
  expect(Object.keys((answer.json ?? {}) as object), "the answer holds exactly the Reading places").toEqual(["readingPlaces"]);
  return (answer.json as { readingPlaces: unknown }).readingPlaces;
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

    step(
      "I PATCH {string} with my {any} and these Reading places:",
      async (_, path: string, credential: string, table: Record<string, string>[]) => {
        answer = await send("PATCH", path, headersFor(credential), bodyOf(readingPlacesOf(table)));
      },
    );

    step("I PATCH {string} with my {any} and the body {string}", async (_, path: string, credential: string, body: string) => {
      answer = await send("PATCH", path, headersFor(credential), body);
    });

    step("the Account has these Reading places:", async (_, table: Record<string, string>[]) => {
      const saved = await send("PATCH", READING_PLACES, headersFor("session cookie"), bodyOf(readingPlacesOf(table)));
      expect(saved.status, `the API kept the Reading places: ${saved.text.slice(0, 200)}`).toBe(200);
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

    step("the answer holds no Reading places", () => {
      expect(readingPlacesIn(answered())).toEqual([]);
    });

    step("the answer holds these Reading places, newest first:", (_, table: Record<string, string>[]) => {
      expect(readingPlacesIn(answered())).toEqual(readingPlacesOf(table));
    });

    step(
      "reading the Reading places back with my {any} gives these, newest first:",
      async (_, credential: string, table: Record<string, string>[]) => {
        const read = await send("GET", READING_PLACES, headersFor(credential));
        expect(readingPlacesIn(read)).toEqual(readingPlacesOf(table));
      },
    );

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  ScenarioOutline("A new Account reads its Reading places with its <credential>, and has none yet", () => {});

  ScenarioOutline(
    "An Account brings Reading places with its <credential> and reads them back with its <other credential>, newest first",
    () => {},
  );

  Scenario("A newer read in a Surah moves its Reading place and brings it to the top", () => {});

  Scenario("A Reading place read earlier but synced later does not replace a newer one", () => {});

  Scenario("Reading places sent out of order are kept in the order they were read", () => {});

  Scenario("A device's Reading places merge with the Account's, the newer kept for each Surah, then the ten newest", () => {});

  Scenario("More than ten Reading places brought at once keep only the ten newest", () => {});

  Scenario("Bringing the same Reading places twice changes nothing", () => {});

  ScenarioOutline("Bringing Reading places with the body <body> is refused and changes nothing", () => {});

  Scenario("One Account's Reading places are never another's", () => {});

  /** A PATCH body that brings one valid Reading place. */
  const ONE_PLACE = bodyOf([{ surah: 18, ayah: 40, readAt: Date.parse("2026-10-01T09:00:00Z") }]);

  /** Send `method` to the Reading places with `credential`, a PATCH bringing one Reading place. */
  const sendMethod = async (method: string, credential: string) => {
    answer = await send(method, READING_PLACES, headersFor(credential), method === "PATCH" ? ONE_PLACE : undefined);
  };

  ScenarioOutline("The API refuses a <method> of the Reading places with <credential>", ({ When }, variables) => {
    When(`I <method> "${READING_PLACES}" with <credential>`, () => sendMethod(variables.method, variables.credential));
  });

  ScenarioOutline("The answer to a <method> of the Reading places names the minimum app version", ({ When }, variables) => {
    When(`I <method> "${READING_PLACES}" with my bearer token`, () => sendMethod(variables.method, "bearer token"));
  });
});
