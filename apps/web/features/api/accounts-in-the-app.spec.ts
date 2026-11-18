import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { accountId, credentialHeaders, database, rowsOf, send, signIn, type Answer, type SignedIn } from "./support";

const feature = await loadFeature("./accounts-in-the-app.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

/** The headers naming where a request comes from: `"saaliheen://" in expo-origin` names it in the expo-origin header. */
function fromHeaders(origin: string, header: string): Record<string, string> {
  if (header !== "origin" && header !== "expo-origin") throw new Error(`no origin header named "${header}"`);
  return { [header]: origin };
}

/** The headers for an Examples row's `from`: `no origin`, or `"<origin>" in <header>`. */
function fromRow(from: string): Record<string, string> {
  if (from === "no origin") return {};
  const named = /^"([^"]+)" in (\S+)$/.exec(from);
  if (!named) throw new Error(`no request origin reads "${from}"`);
  return fromHeaders(named[1], named[2]);
}

/** How many Accounts the Account database holds. */
const accountCount = async () => Number((await database().query<{ n: string }>(`select count(*) as n from "user"`)).rows[0].n);

describeFeature(feature, ({ ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  /** Who this scenario last signed in as, and their Account's id. */
  let signedIn: SignedIn | undefined;
  let id = "";
  /** The same Account's sign-in on a second device. */
  let second: SignedIn | undefined;
  /** The API's last answer. */
  let answer: Answer | undefined;
  /** How many Accounts there were before the scenario's request. */
  let accountsBefore = 0;

  BeforeEachScenario(() => {
    signedIn = second = answer = undefined;
    id = "";
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  const bearer = () => credentialHeaders("bearer token", signedIn);
  const sendAs = async (method: string, path: string, credential: Record<string, string>, from: Record<string, string>) => {
    answer = await send(method, path, { ...credential, ...from }, method === "GET" ? undefined : "{}");
  };

  // Each step reads the same under any keyword, so it is defined under all of them.
  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in to an Account as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
      id = await accountId(signedIn);
    });

    step("I am signed in to the same Account on a second device", async () => {
      if (!signedIn) throw new Error("not signed in in this scenario");
      second = await signIn(signedIn.email);
    });

    step(
      "the app sends the native sign-in with {any} an id token no provider issued, from {string} in its {any} header",
      async (_, provider: string, origin: string, header: string) => {
        accountsBefore = await accountCount();
        answer = await send(
          "POST",
          "/api/v1/auth/sign-in/social",
          fromHeaders(origin, header),
          JSON.stringify({ provider, idToken: { token: "an-id-token-no-provider-issued", nonce: "a-nonce" } }),
        );
      },
    );

    step("I {word} {string} with my bearer token from {any}", (_, method: string, path: string, from: string) =>
      sendAs(method, path, bearer(), fromRow(from)),
    );

    step(
      "with my bearer token I have saved the Language {string}, read Surah {int} until Ayah {int}:{int} and marked the Root {string} as known",
      async (_, language: string, surah: number, inSurah: number, ayah: number, root: string) => {
        expect(inSurah, "the Ayah is in the Surah").toBe(surah);
        const saved = await send("PATCH", "/api/v1/settings", bearer(), JSON.stringify({ language }));
        expect(saved.status, `the settings saved: ${saved.text.slice(0, 200)}`).toBe(200);
        const read = await send("PATCH", "/api/v1/reading-places", bearer(), JSON.stringify({ readingPlaces: [{ surah, ayah, readAt: Date.now() }] }));
        expect(read.status, `the Reading place saved: ${read.text.slice(0, 200)}`).toBe(200);
        const marked = await send("PATCH", "/api/v1/known-words", bearer(), JSON.stringify({ knownWords: [{ kind: "root", text: root, known: true, markedAt: Date.now() }] }));
        expect(marked.status, `the Known Root saved: ${marked.text.slice(0, 200)}`).toBe(200);
      },
    );

    step("my sign-in was made {int} hours ago", async (_, hours: number) => {
      const token = signedIn?.token?.split(".")[0];
      expect(token, "signed in with a bearer token").toBeTruthy();
      const aged = await database().query(
        `update "session" set "createdAt" = now() - make_interval(hours => $1), "updatedAt" = now() - make_interval(hours => $1)
          where "userId" = $2 and token = $3`,
        [hours, id, token],
      );
      expect(aged.rowCount, "the sign-in's session was found").toBe(1);
    });

    step("the API answers {int}", (_, status: number) => {
      const { status: got, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
    });

    step("the API answers {int} with the code {string}", (_, status: number, code: string) => {
      const { status: got, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect((json as { code?: unknown } | undefined)?.code, `the answer's code: ${text.slice(0, 200)}`).toBe(code);
    });

    step("the API answers {int} with the session of {string}", (_, status: number, email: string) => {
      const { status: got, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(json, `the session answered: ${text.slice(0, 200)}`).toMatchObject({ user: { id, email } });
    });

    step("the answer carries no bearer token", () => {
      expect(answered().headers.get("set-auth-token"), "no set-auth-token header").toBeNull();
    });

    step("the API holds no new Account", async () => {
      expect(await accountCount(), "as many Accounts as before").toBe(accountsBefore);
    });

    step("my bearer token is refused by {string} from then on", async (_, path: string) => {
      const after = await send("GET", path, bearer());
      expect(after.status, `the API's answer: ${after.text.slice(0, 200)}`).toBe(401);
    });

    step("the second device's sign-in is refused too", async () => {
      const after = await send("GET", "/api/v1/settings", credentialHeaders("bearer token", second));
      expect(after.status, `the API's answer: ${after.text.slice(0, 200)}`).toBe(401);
    });

    step("the API still holds the Account of {string}", async (_, email: string) => {
      const rows = await rowsOf(id);
      expect(rows.user.map((u) => u.email)).toEqual([email]);
    });

    step("no row in the Account database is tied to the Account any more", async () => {
      const rows = await rowsOf(id);
      const left = Object.fromEntries(Object.entries(rows).filter(([, held]) => held.length > 0).map(([table, held]) => [table, held.length]));
      expect(left, "rows still tied to the Account, by table").toEqual({});
    });

    step("the Account database still holds the Account, its settings, its Reading places and its Known words", async () => {
      const rows = await rowsOf(id);
      expect(rows.user.length, "the Account").toBe(1);
      expect(rows.settings?.length, "its settings").toBe(1);
      expect(rows.readingPlaces?.length, "its Reading places").toBe(1);
      expect(rows.known_word?.length, "its Known words").toBe(1);
    });

    step("my bearer token still reads the Language {string} from {string}", async (_, language: string, path: string) => {
      const read = await send("GET", path, bearer());
      expect(read.status, `the API's answer: ${read.text.slice(0, 200)}`).toBe(200);
      expect((read.json as { language?: unknown }).language).toBe(language);
    });
  });

  ScenarioOutline(
    "The native sign-in with <method> from the app's <header> checks the id token, and refuses one no provider issued",
    () => {},
  );
  ScenarioOutline("The app reads its session with its bearer token from <from>", () => {});
  ScenarioOutline("Signing out with the bearer token from <from> ends the session, and the token is refused from then on", () => {});
  ScenarioOutline(
    "Deleting the Account with the bearer token from <from>, signed in in the last day, removes it and all its data at once",
    () => {},
  );
  ScenarioOutline(
    "Deleting the Account with a bearer token from a sign-in more than a day old, from <from>, is refused and deletes nothing",
    () => {},
  );
});
