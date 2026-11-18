import fs from "node:fs";
import path from "node:path";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { QUESTION_SOURCES } from "../../src/quran-chat/answer.ts";
import { LANGUAGE_NAME } from "@saaliheen/passages";
import { cite } from "@saaliheen/quran-chat";
import { openAiEmbedder } from "../../src/quran-chat/embeddings.ts";
import { searchQuranChatSources, type QuranChatSource } from "../../src/quran-chat/sources.ts";
import {
  answerEvents,
  credentialHeaders,
  database,
  forgetClaude,
  LANGUAGES,
  recorded,
  runScript,
  send,
  signIn,
  textOf,
  type Answer,
  type SignedIn,
} from "./support";

const feature = await loadFeature("./quran-chat-questions.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const QUESTIONS = "/api/v1/questions";
const SAMPLE = path.join(__dirname, "tafsir-sample.json");

/** The sample's text of the Tafsir entry holding Ayah `key`. */
function sampleText(key: string): string {
  const sample = JSON.parse(fs.readFileSync(SAMPLE, "utf8")) as Record<string, { text: string } | string>;
  const held = sample[key];
  return typeof held === "string" ? sampleText(held) : held.text;
}

/** `source` as a scenario reads it in what Claude was sent: its cite, then its Language. */
const named = (source: QuranChatSource) =>
  `${cite(source.kind === "tafsir-entry", source.surah, source.firstAyah, source.lastAyah)} in ${LANGUAGE_NAME[source.language]}`;

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeAllScenarios, BeforeEachScenario, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  let answer: Answer | undefined;

  BeforeAllScenarios(async () => {
    await database().query(`delete from tafsir_entry`);
    const loaded = await runScript("db:load-tafsir", [SAMPLE]);
    expect(loaded.ok, loaded.output).toBe(true);
  });

  BeforeEachScenario(async () => {
    signedIn = undefined;
    answer = undefined;
    await forgetClaude();
  });

  const answered = () => {
    if (!answer) throw new Error("no question asked yet in this scenario");
    return answer;
  };
  /** The answer's events, one a line. */
  const events = () => answerEvents(answered());
  /** The answer's text, its "text" events joined. */
  const answerText = () =>
    events()
      .map((event) => (event.type === "text" ? event.text : ""))
      .join("");
  /** Each text block Claude was last sent, joined. */
  const sentText = async () => {
    const request = await recorded();
    expect(request, "Claude was asked").not.toBeNull();
    return request!.messages.map((message) => textOf(message.content)).join("\n");
  };

  const ask = async (question: string, language: string, headers: Record<string, string>) => {
    const lang = LANGUAGES[language];
    if (!lang) throw new Error(`no Language named "${language}"`);
    answer = await send("POST", QUESTIONS, headers, JSON.stringify({ question, language: lang }));
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("I am signed in to an Account as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    step("I ask {string} in {any}, sending {any}", async (_, question: string, language: string, credential: string) => {
      await ask(question, language, credentialHeaders(credential));
    });

    step("I ask {string} in {any} with my {any}", async (_, question: string, language: string, credential: string) => {
      await ask(question, language, credentialHeaders(credential, signedIn));
    });

    step(
      "I ask the sample's text of the Tafsir entry for {any} in {any} with my {any}",
      async (_, key: string, language: string, credential: string) => {
        await ask(sampleText(key), language, credentialHeaders(credential, signedIn));
      },
    );

    step("I POST {string} with my {any} and the body {string}", async (_, at: string, credential: string, body: string) => {
      answer = await send("POST", at, credentialHeaders(credential, signedIn), body);
    });

    step("the API answers {int} with JSON", (_, status: number) => {
      const { status: got, headers, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof (answered().json as { error?: unknown }).error, "an error named in the answer's `error`").toBe("string");
    });

    step("the API answers {int} with newline-delimited JSON", (_, status: number) => {
      const { status: got, headers, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "newline-delimited JSON").toMatch(/^application\/x-ndjson\b/);
      expect(headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });

    step("Claude was not asked", async () => {
      expect(await recorded()).toBeNull();
    });

    step('the answer names its Conversation, then arrives in more than one "text" event, then an "end" event', () => {
      const types = events().map((event) => event.type);
      expect(types[0], `the answer's events: ${types.join(", ")}`).toBe("conversation");
      expect(types.at(-1), `the answer's events: ${types.join(", ")}`).toBe("end");
      expect(types.slice(1, -1).every((type) => type === "text"), `the answer's events: ${types.join(", ")}`).toBe(true);
      expect(types.length - 2, "text events").toBeGreaterThan(1);
    });

    /** Claude was asked to answer `question` in `language` from the nearest sources, Tafsir entries only in `language`, and no others. */
    const askedFromTheSources = async (language: string, question: string) => {
      const request = await recorded();
      expect(request?.model).toBe("claude-sonnet-5-5");
      const sent = await sentText();
      expect(sent).toContain(`Answer in ${language}.`);
      const embedder = openAiEmbedder();
      if (!embedder) throw new Error("no OPENAI_API_KEY: ./serve-api.ts names the fake OpenAI");
      const lang = LANGUAGES[language];
      if (!lang) throw new Error(`no Language named "${language}"`);
      const expected = await searchQuranChatSources(database(), embedder, question, QUESTION_SOURCES, lang);
      expect(expected.length, "sources found").toBeGreaterThan(0);
      const sentSources = [...sent.matchAll(/<source cite="([^"]+)" kind="[^"]+" language="([^"]+)"/g)].map(([, cite, lang]) => `${cite} in ${lang}`);
      expect(sentSources).toEqual(expected.map(named));
    };

    step(
      "Claude Sonnet 5.5 was asked to answer in {word} from the sources Quran Chat's index finds for {string}, and from no others",
      (_, language: string, question: string) => askedFromTheSources(language, question),
    );

    step(
      "Claude Sonnet 5.5 was asked to answer in {word} from the sources Quran Chat's index finds for the sample's text of the Tafsir entry for {any}, and from no others",
      (_, language: string, key: string) => askedFromTheSources(language, sampleText(key)),
    );

    step("Claude was sent the English Tafsir entry for {any}", async (_, key: string) => {
      const [surah, ayah] = key.split(":").map(Number);
      expect(await sentText()).toContain(`<source cite="${cite(true, surah, ayah, ayah)}" kind="Tafsir entry" language="English">`);
    });

    step("Claude was sent no English Tafsir entry", async () => {
      expect(await sentText()).not.toMatch(/kind="Tafsir entry" language="English"/);
    });

    step("the answer cites {string} and {string}", (_, first: string, second: string) => {
      for (const cite of [first, second]) expect(answerText(), "the answer").toContain(cite);
    });

    step("the answer cites {string}", (_, cite: string) => {
      expect(answerText()).toContain(cite);
    });

    step("the answer starts {string}", (_, start: string) => {
      expect(answerText().startsWith(start), `the answer: ${answerText().slice(0, 200)}`).toBe(true);
    });

    step('the answer names its Conversation, then is one "declined" event, then an "end" event', () => {
      expect(events().map((event) => event.type)).toEqual(["conversation", "declined", "end"]);
    });

    step("the declined event's text is {string}", (_, text: string) => {
      expect(events().find((event) => event.type === "declined")?.text).toBe(text);
    });
  });

  ScenarioOutline("Asking with <credential> is refused", () => {});
  ScenarioOutline("A request that is not a question in a Language is refused", () => {});
  ScenarioOutline("An answer streams, citing the Ayahs Quran Chat found, with the <credential>", () => {});
  Scenario("A question asked in Urdu is answered in Urdu", () => {});
  Scenario("A question the Tafsir answers is sent its Tafsir entry, which the answer cites", () => {});
  Scenario("A question asked in Urdu is sent no English Tafsir, so the Tafsir it cites is the edition credited in Urdu", () => {});
  ScenarioOutline('A question asking for a ruling or a sectarian judgement, "<question>", is declined in <language>, pointing to a Scholar', () => {});
});
