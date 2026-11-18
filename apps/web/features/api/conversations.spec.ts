import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { DECLINED } from "@saaliheen/quran-chat";
import type { ConversationListed as Listed, Conversation } from "@saaliheen/quran-chat";
import {
  accountId,
  answerEvents,
  credentialHeaders,
  database,
  forgetClaude,
  LANGUAGES,
  recorded,
  send,
  signIn,
  textOf,
  type Answer,
  type SignedIn,
} from "./support";

const feature = await loadFeature("./conversations.feature");

type DataTable = Record<string, string>[];

type StepFn = Parameters<StepTest["Given"]>[1];

const QUESTIONS = "/api/v1/questions";
const CONVERSATIONS = "/api/v1/conversations";

/** A question asked in a scenario: its text, the Conversation its answer named, and the answer's text. */
interface Asked {
  question: string;
  conversation: string | undefined;
  answer: string;
}

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  /** The other sign-in to the same Account, "as on another device". */
  let other: SignedIn | undefined;
  let answer: Answer | undefined;
  let asked: Asked[] = [];
  let noted: Record<string, string> = {};
  let deletedAccount: string | undefined;

  BeforeEachScenario(async () => {
    signedIn = other = answer = deletedAccount = undefined;
    asked = [];
    noted = {};
    await forgetClaude();
  });

  const answered = () => {
    if (!answer) throw new Error("nothing sent yet in this scenario");
    return answer;
  };
  /** The Conversation the last question's answer named. */
  const thatConversation = () => {
    const id = asked.at(-1)?.conversation;
    if (!id) throw new Error("no answer has named a Conversation yet in this scenario");
    return id;
  };
  const notedAs = (name: string) => {
    const id = noted[name];
    if (!id) throw new Error(`no Conversation noted as "${name}"`);
    return id;
  };
  /** The headers of `credential`: the latest sign-in's, or, after signing in again, the other device's for the credential not used first. */
  const headers = (credential: string) => credentialHeaders(credential, other ?? signedIn);
  /** The headers of `credential` on the first sign-in. */
  const firstHeaders = (credential: string) => credentialHeaders(credential, signedIn);

  const ask = async (question: string, language: string, conversation: string | undefined, sent: Record<string, string>) => {
    const lang = LANGUAGES[language];
    if (!lang) throw new Error(`no Language named "${language}"`);
    answer = await send("POST", QUESTIONS, sent, JSON.stringify({ question, language: lang, ...(conversation ? { conversation } : {}) }));
    if (answer.status !== 200) return;
    const events = answerEvents(answer);
    asked.push({
      question,
      conversation: events[0]?.type === "conversation" ? events[0].id : undefined,
      answer: events.map((event) => (event.type === "text" ? event.text : "")).join(""),
    });
  };

  const list = async (sent: Record<string, string>): Promise<Listed[]> => {
    answer = await send("GET", CONVERSATIONS, sent);
    expect(answer.status, answer.text.slice(0, 200)).toBe(200);
    return (answer.json as { conversations: Listed[] }).conversations;
  };

  const reopen = async (id: string, sent: Record<string, string>) => {
    answer = await send("GET", `${CONVERSATIONS}/${id}`, sent);
  };
  const reopened = () => {
    const { status, text, json } = answered();
    expect(status, text.slice(0, 200)).toBe(200);
    return json as Conversation;
  };
  /** The Conversations the last answer listed. */
  const listedNow = () => (answered().json as { conversations: Listed[] }).conversations;

  const expectTitles = (listed: Listed[], table: DataTable) => {
    expect(listed.map((conversation) => conversation.title)).toEqual(table.map((row) => row.title));
    for (const conversation of listed) {
      expect(typeof conversation.id).toBe("string");
      expect(Number.isFinite(conversation.startedAt), "startedAt in milliseconds").toBe(true);
      expect(conversation.updatedAt).toBeGreaterThanOrEqual(conversation.startedAt);
    }
  };

  const questionsOf = async (conversation: string) =>
    (await database().query(`select * from "conversationQuestion" where "conversationId" = $1`, [conversation])).rows;

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    for (const phrasing of ["I am signed in to an Account as {string}", "I sign in to an Account as {string}"]) {
      step(phrasing, async (_, email: string) => {
        signedIn = await signIn(email);
      });
    }

    step("I sign in to the same Account again, as on another device", async () => {
      if (!signedIn) throw new Error("not signed in in this scenario");
      other = await signIn(signedIn.email);
      expect(other.cookie, "another session").not.toBe(signedIn.cookie);
    });

    step("I {any} {string} sending neither cookie nor token", async (_, method: string, path: string) => {
      answer = await send(method, path, credentialHeaders("neither cookie nor token"));
    });

    step("I POST {string} with my {any} and the body {string}", async (_, at: string, credential: string, body: string) => {
      await forgetClaude();
      answer = await send("POST", at, headers(credential), body);
    });

    step("I ask {string} in {word} with my {any}", async (_, question: string, language: string, credential: string) => {
      await ask(question, language, undefined, firstHeaders(credential));
    });

    step("I ask {string} in {word} in that Conversation with my {any}", async (_, question: string, language: string, credential: string) => {
      await ask(question, language, thatConversation(), headers(credential));
    });

    step("I note that Conversation as {string}", (_, name: string) => {
      noted[name] = thatConversation();
    });

    step("I list my Conversations with my {any}", async (_, credential: string) => {
      await list(headers(credential));
    });

    step("I reopen that Conversation with my {any}", async (_, credential: string) => {
      await reopen(thatConversation(), firstHeaders(credential));
    });

    /** Reopen, delete or ask in the Conversation noted as `name`, Claude's record forgotten first. */
    step("I {any} the Conversation I noted as {string} with my {any}", async (_, action: string, name: string, credential: string) => {
      await forgetClaude();
      const asking = /^ask "(.+)" in (\w+) in$/.exec(action);
      if (asking) await ask(asking[1], asking[2], notedAs(name), headers(credential));
      else if (action === "reopen") await reopen(notedAs(name), headers(credential));
      else if (action === "delete") answer = await send("DELETE", `${CONVERSATIONS}/${notedAs(name)}`, headers(credential));
      else throw new Error(`no action "${action}" on a Conversation`);
    });

    step("I have deleted the Conversation I noted as {string}", async (_, name: string) => {
      const deleted = await send("DELETE", `${CONVERSATIONS}/${notedAs(name)}`, headers("bearer token"));
      expect(deleted.status, deleted.text.slice(0, 200)).toBe(204);
    });

    step("I delete my Account with my session cookie", async () => {
      if (!signedIn) throw new Error("not signed in in this scenario");
      deletedAccount = await accountId(signedIn);
      const deleted = await send("POST", "/api/v1/auth/delete-user", credentialHeaders("session cookie", signedIn), "{}");
      expect(deleted.status, deleted.text.slice(0, 200)).toBe(200);
    });

    step("the API answers {any} with JSON", (_, answers: string) => {
      const status = Number(answers);
      const { status: got, headers: sent, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(sent.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      if (status >= 400) expect(typeof (answered().json as { error?: unknown }).error, "an error named in the answer's `error`").toBe("string");
    });

    step("the API answers {int}", (_, status: number) => {
      const { status: got, headers: sent, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(sent.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });

    step("I have no Conversations", () => {
      expect(listedNow()).toEqual([]);
    });

    step("I have no Conversations, listing them with my {any}", async (_, credential: string) => {
      expect(await list(headers(credential))).toEqual([]);
    });

    const arrivesAndEnds = () => {
      const { status, headers: sent, text } = answered();
      expect(status, text.slice(0, 200)).toBe(200);
      expect(sent.get("content-type")).toMatch(/^application\/x-ndjson\b/);
      const types = answerEvents(answered()).map((event) => event.type);
      expect(types[0], `the answer's events: ${types.join(", ")}`).toBe("conversation");
      expect(types.at(-1), `the answer's events: ${types.join(", ")}`).toBe("end");
      expect(types.slice(1, -1).every((type) => type === "text"), `the answer's events: ${types.join(", ")}`).toBe(true);
      expect(types.length, "text events").toBeGreaterThan(2);
    };

    step("the answer's first event names a new Conversation, then the answer arrives and ends", () => {
      arrivesAndEnds();
      expect(asked.at(-1)?.conversation).toMatch(/^[0-9a-f-]{36}$/);
      expect(asked.slice(0, -1).map((question) => question.conversation)).not.toContain(asked.at(-1)?.conversation);
    });

    step("the answer's first event names that Conversation, then the answer arrives and ends", () => {
      arrivesAndEnds();
      expect(asked.at(-1)?.conversation).toBe(asked.at(-2)?.conversation);
    });

    step("my Conversations are, newest first:", (_, table: DataTable) => {
      expectTitles(listedNow(), table);
    });

    step("listing my Conversations gives, newest first:", async (_, table: DataTable) => {
      expectTitles(await list(headers("bearer token")), table);
    });

    step("the Conversation the answer named is the first of them", () => {
      expect(listedNow()[0].id).toBe(thatConversation());
    });

    step("listing my Conversations shows only that one", async () => {
      expect((await list(firstHeaders("bearer token"))).map((conversation) => conversation.id)).toEqual([thatConversation()]);
    });

    step("Claude was sent {string} and its answer before {string}", async (_, earlier: string, later: string) => {
      const request = await recorded();
      expect(request, "Claude was asked").not.toBeNull();
      const messages = request!.messages;
      expect(messages.map((message) => message.role)).toEqual(["user", "assistant", "user"]);
      expect(textOf(messages[0].content)).toContain(`<question>${earlier}</question>`);
      expect(textOf(messages[1].content)).toBe(asked.find((question) => question.question === earlier)?.answer);
      expect(textOf(messages[2].content)).toContain(`<question>${later}</question>`);
    });

    step("the Conversation is titled {string} and holds, in order:", (_, title: string, table: DataTable) => {
      const conversation = reopened();
      expect(conversation.id).toBe(thatConversation());
      expect(conversation.title).toBe(title);
      expect(conversation.questions.map(({ question, language, declined }) => ({ question, language, declined }))).toEqual(
        table.map(({ question, language, declined }) => ({ question, language, declined: declined === "yes" })),
      );
      conversation.questions.forEach((kept, n) => {
        const expected = table[n].answer;
        if (expected === "the fake Claude's answer") {
          expect(kept.answer, `the answer to "${kept.question}"`).toBe(asked.find((question) => question.question === kept.question)?.answer);
        } else if (expected === "Quran Chat's decline in Urdu") {
          expect(kept.answer).toBe(DECLINED.ur);
        } else throw new Error(`no answer named "${expected}"`);
        expect(Number.isFinite(kept.askedAt), "askedAt in milliseconds").toBe(true);
      });
      const times = conversation.questions.map((kept) => kept.askedAt);
      expect(times, "asked in order").toEqual([...times].sort((a, b) => a - b));
    });

    step("the Conversation's questions are {string} then {string}", (_, first: string, second: string) => {
      expect(reopened().questions.map((kept) => kept.question)).toEqual([first, second]);
    });

    step("Claude was not asked again", async () => {
      expect(await recorded()).toBeNull();
    });

    step("the Account database holds no question of the Conversation I noted as {string}", async (_, name: string) => {
      expect(await questionsOf(notedAs(name))).toEqual([]);
    });

    step("the Account database still holds the Conversation I noted as {string}, with its one question", async (_, name: string) => {
      const id = notedAs(name);
      expect((await database().query(`select id from conversation where id = $1`, [id])).rows).toHaveLength(1);
      expect(await questionsOf(id)).toHaveLength(1);
    });

    step("the Account database holds no Conversation of the deleted Account", async () => {
      expect((await database().query(`select id from conversation where "userId" = $1`, [deletedAccount])).rows).toEqual([]);
    });
  });

  ScenarioOutline("<method> <path> without signing in is refused", () => {});
  Scenario("A new Account has no Conversations yet", () => {});
  Scenario("Asking without a Conversation starts one, titled by the question, which the list shows", () => {});
  Scenario(
    "Asking in a Conversation continues it, sending Claude its earlier questions and answers, and reopening it shows them in order",
    () => {},
  );
  Scenario("A declined question is kept, declined, in its Language", () => {});
  Scenario("The Conversation asked in most recently is listed first", () => {});
  ScenarioOutline(
    "A Conversation started with the <first> is listed, reopened and continued with the <second> of another sign-in to the same Account",
    () => {},
  );
  Scenario("Deleting a Conversation deletes it and its questions, and leaves the others", () => {});
  ScenarioOutline("A deleted Conversation is not found: <action> answers 404", () => {});
  ScenarioOutline("Another Account's Conversation is not found: <action> answers 404, and it stays", () => {});
  ScenarioOutline("Asking in a Conversation named by something not the Account's Conversation's id is refused: <status>", () => {});
  Scenario("Deleting the Account deletes its Conversations and their questions", () => {});
});
