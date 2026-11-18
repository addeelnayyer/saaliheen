import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { accountId, credentialHeaders, rowsOf, send, signIn, type Answer, type SignedIn } from "./support";

const feature = await loadFeature("./settings.feature");

const SETTINGS = "/api/v1/settings";
type StepFn = Parameters<StepTest["Given"]>[1];

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
  const settings = () => answered().json as Record<string, unknown>;
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

    step("I PATCH {string} with my {any} and the JSON:", async (_, path: string, credential: string, body: string) => {
      answer = await send("PATCH", path, headersFor(credential), body);
    });

    step("I PATCH {string} with my {any} and the body {string}", async (_, path: string, credential: string, body: string) => {
      answer = await send("PATCH", path, headersFor(credential), body);
    });

    step("I have saved the Script {string} and the Language {string}", async (_, script: string, language: string) => {
      const saved = await send("PATCH", SETTINGS, headersFor("session cookie"), JSON.stringify({ script, language }));
      expect(saved.status, `the API saved the settings: ${saved.text.slice(0, 200)}`).toBe(200);
    });

    step(
      "reading the settings back with my {any} gives the Script {string} and the Language {string}",
      async (_, credential: string, script: string, language: string) => {
        const read = await send("GET", SETTINGS, headersFor(credential));
        expect(read.status, `the API's answer: ${read.text.slice(0, 200)}`).toBe(200);
        expect(read.json).toMatchObject({ script, language });
      },
    );

    step("read back with my {any}, the settings hold exactly a Script and a Language", async (_, credential: string) => {
      const read = await send("GET", SETTINGS, headersFor(credential));
      expect(read.status, `the API's answer: ${read.text.slice(0, 200)}`).toBe(200);
      expect(Object.keys(read.json as object).sort()).toEqual(["language", "script"]);
    });

    step(
      "the API answers {int} with the Script {string} and the Language {string}",
      (_, status: number, script: string, language: string) => {
        const { status: got, text, json } = answered();
        expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
        expect(json).toMatchObject({ script, language });
      },
    );

    step("I sign out through the API with my {any}", async (_, credential: string) => {
      const out = await send("POST", "/api/v1/auth/sign-out", headersFor(credential), "{}");
      expect(out.status, "signed out").toBe(200);
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

    step("the settings name no Script and no Language", () => {
      expect(settings()).toEqual({ script: null, language: null });
    });

    step("the settings are the Script {string} and the Language {string}", (_, script: string, language: string) => {
      expect(settings()).toMatchObject({ script, language });
    });

    step("the settings hold exactly a Script and a Language", () => {
      expect(Object.keys(settings()).sort()).toEqual(["language", "script"]);
    });

    step("the Account database holds no Arabic size or Meaning size for the Account", async () => {
      if (!signedIn) throw new Error("not signed in in this scenario");
      const rows = await rowsOf(await accountId(signedIn));
      const held = JSON.stringify(rows);
      expect(held, "no row tied to the Account names an Arabic size or a Meaning size").not.toMatch(/arabic|meaning/i);
      expect(held, "no row tied to the Account holds the sizes sent").not.toMatch(/\b(130|115)\b/);
    });

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });

    step("that minimum app version is the one {string} names, {string}", async (_, manifestPath: string, version: string) => {
      const manifest = await send("GET", manifestPath, {});
      expect(manifest.status).toBe(200);
      const named = (manifest.json as { minAppVersion?: unknown }).minAppVersion;
      expect(named, `${manifestPath}'s minimum app version`).toBe(version);
      expect(answered().headers.get("min-app-version")).toBe(named);
    });
  });

  ScenarioOutline("A new Account reads its settings with its <credential>, and has chosen no Script or Language yet", () => {});

  ScenarioOutline(
    "An Account saves its Script and Language with its <credential> and reads them back with its <other credential>",
    () => {},
  );

  Scenario("Saving only the Language keeps the Script, and saving only the Script keeps the Language", () => {});

  ScenarioOutline("Saving the settings with the body <body> is refused and changes nothing", () => {});

  Scenario("Arabic size and Meaning size sent with the settings are never kept", () => {});

  Scenario("One Account's settings are never another's", () => {});

  ScenarioOutline("The API refuses a <method> of the settings with <credential>", ({ When }, variables) => {
    When(`I <method> "${SETTINGS}" with <credential>`, async () => {
      const body = variables.method === "PATCH" ? JSON.stringify({ script: "indopak" }) : undefined;
      answer = await send(variables.method, SETTINGS, headersFor(variables.credential), body);
    });
  });

  ScenarioOutline("After signing out, the signed-out session's <credential> is refused", () => {});

  // The requests whose answers must name the minimum app version, as the Examples name them.
  const REQUESTS: Record<string, () => Promise<Answer>> = {
    [`GET "${SETTINGS}" with my bearer token`]: () => send("GET", SETTINGS, headersFor("bearer token")),
    [`PATCH "${SETTINGS}" with my bearer token and a Script`]: () =>
      send("PATCH", SETTINGS, headersFor("bearer token"), JSON.stringify({ script: "indopak" })),
    [`PATCH "${SETTINGS}" with my session cookie and a Script that is not one`]: () =>
      send("PATCH", SETTINGS, headersFor("session cookie"), JSON.stringify({ script: "none" })),
    [`GET "${SETTINGS}" with neither cookie nor token`]: () => send("GET", SETTINGS, headersFor("neither cookie nor token")),
  };

  ScenarioOutline("The answer to <request> names the minimum app version the manifest names", ({ When }, variables) => {
    When("I <request>", async () => {
      const request = REQUESTS[variables.request];
      if (!request) throw new Error(`no request named "${variables.request}"`);
      answer = await request();
    });
  });
});
