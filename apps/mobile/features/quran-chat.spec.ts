import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import type { ReadingPlace } from "../src/reading-places.ts";
import { citationOpens, openQuranChat, QURAN_CHAT_WORDS, type AskOutcome, type QuestionShown, type QuranChat } from "../src/quran-chat.ts";
import { AccountWorld, defineAccountSteps } from "./account-world.ts";
import { languageCode } from "./support.ts";

const feature = await loadFeature("./quran-chat.feature");

/** An answer as the screen reads it: each citation in brackets, paragraphs apart. */
const readAs = (shown: QuestionShown) =>
  shown.answer.paragraphs.map((paragraph) => paragraph.map((part) => (part.kind === "text" ? part.text : `(${part.text})`)).join("")).join("\n\n");

/** The citations an answer shows, in order. */
const citationsOf = (shown: QuestionShown) => shown.answer.paragraphs.flat().filter((part) => part.kind !== "text");

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeAllScenarios, AfterAllScenarios, AfterEachScenario, defineSteps }) => {
  const aw = new AccountWorld();
  let chat: QuranChat | undefined;
  let asking: Promise<AskOutcome> | undefined;
  let outcome: AskOutcome | undefined;
  let releaseAnswer: (() => void) | undefined;
  let placesBefore: ReadingPlace[] = [];
  let opened: { surah: number; opensAt: number } | undefined;

  BeforeAllScenarios(() => aw.start());
  AfterAllScenarios(() => aw.close());
  AfterEachScenario(() => {
    chat?.close();
    chat = asking = outcome = releaseAnswer = opened = undefined;
  });

  const api = () => aw.world.data.quranChat;
  const state = () => chat!.state();
  const lastShown = () => state().questions.at(-1)!;

  /** Opens Quran Chat, as Explore's card does, once it has read what it shows first. */
  const openChat = async () => {
    chat = openQuranChat({ account: aw.account });
    await chat.settled();
  };

  const ask = async (question: string, language: string) => {
    outcome = await chat!.ask(question, languageCode(language));
    await chat!.settled();
  };

  /** Quran Chat answers `question` in the parts of `table`. */
  const answersInParts = (question: string, table: Record<string, string>[]) => api().answers(question, { parts: table.map((row) => row.part.trim()) });

  const says = () => [state().signedIn === false ? QURAN_CHAT_WORDS.needsAccount : undefined, state().gone, state().notice?.text];

  const titles = () => (state().conversations ?? []).map((c) => c.title);

  defineSteps(({ Step }) => {
    defineAccountSteps(Step, aw);
    Step("I open Quran Chat", openChat);
    Step("I ask {string} in {word}", (_, question: string, language: string) => ask(question, language));
    Step("Quran Chat says {string}", (_, words: string) => expect(says()).toContain(words));
    Step("the app asked nothing of Quran Chat", () => expect(api().requests).toBe(0));
    Step("Quran Chat answers {string} in these parts:", (_, question: string, table: Record<string, string>[]) => answersInParts(question, table));
    Step("Quran Chat declines {string}", (_, question: string) => api().answers(question, { declined: true }));
    Step("the answer reads {string}", (_, text: string) => {
      expect(lastShown().answer.answering).toBe(false);
      expect(readAs(lastShown())).toBe(text);
    });
    Step("the answer says {string}", (_, words: string) => expect(lastShown().answer.says).toBe(words));
    Step("its citations are {string}", (_, text: string) => expect(citationsOf(lastShown()).map((c) => c.text)).toEqual([text]));
    Step("its citations are {string} and {string}", (_, first: string, second: string) =>
      expect(citationsOf(lastShown()).map((c) => c.text)).toEqual([first, second]),
    );
    Step("no Tafsir credit shows beneath it", () => expect(lastShown().answer.credit).toBeUndefined());
    Step("I open the citation {string}", async (_, text: string) => {
      const citation = citationsOf(lastShown()).find((c) => c.text === text);
      expect(citation, `the answer cites ${text}`).toBeDefined();
      placesBefore = await aw.places.list();
      const { surah, word } = citationOpens(citation!);
      const visit = await aw.places.open(surah, { word });
      opened = { surah, opensAt: visit.opensAt };
    });
    Step("Surah {int} opens at Ayah {int}", (_, surah: number, ayah: number) => expect(opened).toEqual({ surah, opensAt: ayah }));
    Step("the Reading places are as they were", async () => expect(await aw.places.list()).toEqual(placesBefore));
    Step("on the website, signed in as {string}, I asked {string}", async (_, email: string, question: string) => (await aw.websiteAs(email)).ask(question));
    Step("on the website, signed in as {string}, I delete {string}", async (_, email: string, title: string) => {
      const website = await aw.websiteAs(email);
      const listed = (await website.conversations()).find((c) => c.title === title);
      await website.deleteConversation(listed!.id);
    });
    Step("Quran Chat lists these Conversations:", (_, table: Record<string, string>[]) => expect(titles()).toEqual(table.map((row) => row.title)));
    Step("Quran Chat lists no Conversations, saying {string}", (_, words: string) => {
      expect(titles()).toEqual([]);
      expect(state().conversationsSay).toBe(words);
    });
    Step("I reopen {string}", async (_, title: string) => {
      await chat!.reopen(state().conversations!.find((c) => c.title === title)!.id);
      await chat!.settled();
    });
    Step("I start a New Conversation", () => chat!.startNew());
    Step("I delete {string}", async (_, title: string) => {
      await chat!.remove(state().conversations!.find((c) => c.title === title)!.id);
      await chat!.settled();
    });
    Step("the Conversation open holds {string}", (_, question: string) => expect(state().questions.map((q) => q.question)).toEqual([question]));
    Step("the Conversation open holds {string} then {string}", (_, first: string, second: string) =>
      expect(state().questions.map((q) => q.question)).toEqual([first, second]),
    );
    Step("the website, signed in as {string}, reads {string} holding {string} then {string}", async (_, email: string, title: string, first: string, second: string) => {
      const website = await aw.websiteAs(email);
      const listed = (await website.conversations()).find((c) => c.title === title);
      expect((await website.conversation(listed!.id)).questions.map((q) => q.question)).toEqual([first, second]);
    });
    Step("the website, signed in as {string}, lists the same Conversations", async (_, email: string) => {
      const website = await aw.websiteAs(email);
      expect((await website.conversations()).map((c) => c.title)).toEqual(titles());
    });
    Step("the website, signed in as {string}, lists no Conversations", async (_, email: string) =>
      expect(await (await aw.websiteAs(email)).conversations()).toEqual([]),
    );
    Step("the question {string} is given back to ask again", (_, question: string) => expect(outcome).toEqual({ givenBack: question }));
    Step("no Conversation is open", () => {
      expect(state().questions).toEqual([]);
      expect(state().conversationId).toBeUndefined();
    });
    Step("{string} has asked {int} questions today", (_, email: string, count: number) => api().haveAsked(email, count, Date.now()));
    Step("{string} has asked {int} questions this month, none of them today", (_, email: string, count: number) =>
      api().haveAsked(email, count, Date.now() - 24 * 60 * 60 * 1000),
    );
    Step("Quran Chat offers no way to ask", () => expect(state().canAsk).toBe(false));
  });

  Background(({ Given }) => {
    Given("the app is launched on a new device", () => aw.newScenario());
  });

  Scenario("Signed out, Quran Chat asks the reader to sign in, and asks nothing of the API", () => {});

  Scenario("The answer shows as it streams, a citation shown only once it is whole", ({ And, Then, When }) => {
    And('I ask "Who was Dhul-Qarnayn?" in English, and the first part arrives', async () => {
      releaseAnswer = api().hold("Who was Dhul-Qarnayn?");
      asking = chat!.ask("Who was Dhul-Qarnayn?", "en");
      await vi.waitFor(() => expect(state().questions.at(-1)?.answer.paragraphs.length).toBeGreaterThan(0));
    });
    Then('the answer so far reads "Dhul-Qarnayn was given power " and Quran Chat is still answering', () => {
      expect(readAs(lastShown())).toBe("Dhul-Qarnayn was given power ");
      expect(lastShown().answer.answering).toBe(true);
      expect(state().canAsk).toBe(false);
    });
    When("the rest of the answer arrives", async () => {
      releaseAnswer!();
      outcome = await asking;
      await chat!.settled();
    });
  });

  Scenario("A cited Ayah opens in the app as a look-up, leaving the Reading places as they were", () => {});

  // Predefined steps do not reach a Scenario Outline, so its steps are all defined here.
  ScenarioOutline("An answer that cites the Tafsir credits it beneath, in <Language>", ({ Given, And, When, Then }, { Language, question, answer, citation, credit }) => {
    Given('I sign in with Google as "amina@example.com"', () => aw.signIn("Google", "amina@example.com"));
    And('Quran Chat answers "<question>" with "<answer>"', () => api().answers(question, { parts: [answer] }));
    When("I open Quran Chat", openChat);
    And('I ask "<question>" in <Language>', () => ask(question, Language));
    Then('its citations are "<citation>"', () => expect(citationsOf(lastShown()).map((c) => c.text)).toEqual([citation]));
    And('the Tafsir credit beneath it reads "<credit>"', () => expect(lastShown().answer.credit).toBe(credit));
  });

  Scenario("A declined question shows why, in the reader's Language", () => {});
  Scenario("With no connection, the question is shown with the website's words for an answer that did not come", () => {});
  Scenario("The website's Conversations are the app's, to reopen and continue", () => {});
  Scenario("A New Conversation starts with its first question, listed first on the app and the website", () => {});
  Scenario("A Conversation deleted in the app is gone from the website too", () => {});
  Scenario("Asking in a Conversation deleted on the website starts again, the question kept to ask", () => {});
  Scenario("With fewer than five questions left today, Quran Chat says how many", () => {});
  Scenario("With today's limit reached, the question is refused, and Quran Chat says when it may be asked again", () => {});
  Scenario("With this month's limit reached, Quran Chat says so, and when the month resets", () => {});
  Scenario("Signed out on the website's side, Quran Chat asks the reader to sign in again", () => {});
});
