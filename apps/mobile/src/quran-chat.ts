// Quran Chat in the app (#81), as on the website's Quran Chat page
// (apps/web/src/app/[lang]/quran-chat/quran-chat.tsx, #78 to #80): signed in,
// the reader asks a question and the answer shows as /api/v1/questions streams
// it, each Ayah it cites opening that Ayah as a look-up, and the Tafsir
// credited beneath it when it cites an entry; a declined question shows why.
// Questions are asked in Conversations: the first starts one, each later one
// continues it until the reader starts a New Conversation, and the Account's
// Conversations, the same the website lists, are listed to reopen or delete.
// Fewer than five questions left today, Quran Chat says how many; with a
// Question limit reached, which, and when it resets, and it offers no way to
// ask until then. Signed out, it asks the reader to sign in.
// It holds to the website's rules through @saaliheen/quran-chat and says what
// the website says in its words (ADR 0029). This module imports nothing from
// React Native or Expo, so the app's scenarios (features/quran-chat.feature)
// run it in Node; the Quran Chat screen (app/explore/quran-chat.tsx) shows its state.

import {
  answerKept,
  answerParagraphs,
  answerParts,
  limitsNotice,
  readAnswerEvents,
  TAFSIR_CREDITS,
  type AnswerPart,
  type AnswerSoFar as Answer,
  type Conversation,
  type ConversationListed,
  type LimitName,
  type QuestionLimits,
} from "@saaliheen/quran-chat";
import type { AppAccount } from "./account";
import type { Language } from "./quran-analysis";

/** What Quran Chat says, in the website's words (apps/web/src/app/[lang]/strings.ts). */
export const QURAN_CHAT_WORDS = {
  quranChat: "Quran Chat",
  lead: "Ask about the Quran. Answers come only from the Ayah translations and the Tafsir, and cite each Ayah they rest on.",
  needsAccount: "Quran Chat needs an Account. Sign in to ask it about the Quran.",
  signIn: "Sign in",
  yourQuestion: "Your question",
  ask: "Ask",
  asking: "Asking…",
  answer: "Answer",
  answerFailed: "Quran Chat could not answer just now. Please try again.",
  conversations: "Conversations",
  thisConversation: "This Conversation",
  newConversation: "New Conversation",
  noConversations: "No Conversations yet. Your first question starts one.",
  conversationsFailed: "Your Conversations could not be loaded just now.",
  deleteConversation: (title: string) => `Delete “${title}”`,
  conversationGone: "This Conversation was deleted, perhaps in another browser. Ask again to start a new one.",
  noAnswerKept: "No answer was kept for this question.",
  questionsLeftToday: (n: number) => (n === 1 ? "1 question left today" : `${n} questions left today`),
  limitReached: (reached: LimitName, limit: number, resets: string) =>
    `You have asked all ${limit} of ${reached === "daily" ? "today's" : "this month's"} questions. You can ask again from ${resets}.`,
} as const;

/** A citation in an answer: of an Ayah (or a run of them), or of a Tafsir entry. */
export type Citation = Exclude<AnswerPart, { kind: "text" }>;

/** An answer as it shows: its paragraphs of words and citations, and what is said beneath it. */
export interface AnswerShown {
  /** Its paragraphs, each words and citations in order; a declined question's is why. */
  paragraphs: AnswerPart[][];
  /** Whether it is still arriving. */
  answering: boolean;
  /** What is said of it: that it is being asked, that it did not come, or that none was kept. */
  says?: string;
  /** The Tafsir's credit line, when it cites the Tafsir. */
  credit?: string;
}

/** A question of the Conversation open, and its answer as it shows. */
export interface QuestionShown {
  question: string;
  language: Language;
  answer: AnswerShown;
}

export interface QuranChatState {
  /** Whether the app is signed in to an Account; undefined until it is known. */
  signedIn: boolean | undefined;
  /** The Conversation open's id, undefined until its first question starts it. */
  conversationId?: string;
  /** The Conversation open's questions, in order. */
  questions: QuestionShown[];
  /** The Account's Conversations, the one asked in most recently first; undefined until they are read. */
  conversations?: ConversationListed[];
  /** What is said in place of the Conversations: that there are none yet, or that they could not be read. */
  conversationsSay?: string;
  /** What is said when the Conversation open was deleted elsewhere as a question was asked in it. */
  gone?: string;
  /** What is said of the Question limits, and whether one is reached. */
  notice?: { text: string; reached: boolean };
  /** Whether a question can be asked now: signed in, not answering, not reopening, no limit reached. */
  canAsk: boolean;
  /** Whether an answer is arriving. */
  busy: boolean;
}

/** How asking ended: asked, not asked at all, or refused with the question given back to ask again. */
export type AskOutcome = "asked" | "not asked" | { givenBack: string };

export interface QuranChat {
  /** Quran Chat as it shows now; the same object until it changes. */
  state(): QuranChatState;
  /** Calls `listener` each time the state changes; answers how to stop. */
  subscribe(listener: () => void): () => void;
  /** Asks `question` in `language`, in the Conversation open or, with none, starting one. */
  ask(question: string, language: Language): Promise<AskOutcome>;
  /** Stops any answer arriving and opens a new, empty Conversation. */
  startNew(): void;
  /** Reopens the Account's Conversation `id`, with its questions and answers. */
  reopen(id: string): Promise<void>;
  /** Deletes the Account's Conversation `id`. */
  remove(id: string): Promise<void>;
  /** Resolves once everything Quran Chat has started so far has finished. */
  settled(): Promise<void>;
  /** Stops any answer arriving and stops listening to the Account. */
  close(): void;
}

/** Where a citation opens: its Surah, as a look-up at its first Ayah, which leaves the Reading places as they were. */
export const citationOpens = (citation: Citation): { surah: number; word: string } => ({
  surah: citation.surah,
  word: `${citation.surah}:${citation.firstAyah}`,
});

interface QuestionAsked {
  question: string;
  language: Language;
  answer: Answer;
}

/** The Conversation open: its id undefined until the first question starts it. */
interface OpenConversation {
  id?: string;
  questions: QuestionAsked[];
}

/** `answer` as it shows in `language`: its paragraphs split at blank lines, and what is said beneath it. */
function shown(answer: Answer, language: Language): AnswerShown {
  const answering = !answer.done;
  const failed = answer.failed ? QURAN_CHAT_WORDS.answerFailed : undefined;
  if (answer.declined !== undefined) return { paragraphs: answerParagraphs([{ kind: "text", text: answer.declined }]), answering, says: failed };
  const parts = answerParts(answer.text);
  const says = failed ?? (answer.unanswered ? QURAN_CHAT_WORDS.noAnswerKept : answering && !answer.text ? QURAN_CHAT_WORDS.asking : undefined);
  return {
    paragraphs: answerParagraphs(parts),
    answering,
    says,
    credit: parts.some((part) => part.kind === "tafsir") ? TAFSIR_CREDITS[language] : undefined,
  };
}

/** Each question as it shows, kept while its answer is unchanged, so that only the answer arriving is made again as it streams. */
const shownOf = new WeakMap<QuestionAsked, QuestionShown>();
function questionShown(asked: QuestionAsked): QuestionShown {
  let made = shownOf.get(asked);
  if (!made) shownOf.set(asked, (made = { question: asked.question, language: asked.language, answer: shown(asked.answer, asked.language) }));
  return made;
}

/** Quran Chat, asking the API as the Account `account` is signed in to. */
export function openQuranChat(options: { account: Pick<AppAccount, "signedInAs" | "subscribe" | "request" | "settled"> }): QuranChat {
  const { account } = options;
  /** The Account signed in to, by email, null signed out; undefined until it is known. Another one signed in to shows its own Conversations and limits. */
  let signedInAs: string | null | undefined;
  const signedIn = () => (signedInAs === undefined ? undefined : signedInAs !== null);
  let open: OpenConversation = { questions: [] };
  let conversations: ConversationListed[] | "failed" | undefined;
  /** What the Question limits say, as last read. */
  let notice: QuranChatState["notice"];
  /** A Conversation is being reopened: no question is asked until it is open, lest it go to the one before. */
  let reopening = false;
  let gone = false;
  /** Stops the answer arriving, or the Conversation being reopened. */
  let asking: AbortController | undefined;
  let closed = false;

  const pending = new Set<Promise<unknown>>();
  /** Keeps `work` until it finishes, for settled(). */
  const track = (work: Promise<unknown>) => {
    pending.add(work);
    void work.finally(() => pending.delete(work));
  };

  const listeners = new Set<() => void>();
  let snapshot: QuranChatState;
  /** The state as it shows now, made again from what Quran Chat holds. */
  function stateNow(): QuranChatState {
    const busy = open.questions.at(-1)?.answer.done === false;
    return {
      signedIn: signedIn(),
      conversationId: open.id,
      questions: open.questions.map(questionShown),
      conversations: Array.isArray(conversations) ? conversations : undefined,
      conversationsSay:
        conversations === "failed" ? QURAN_CHAT_WORDS.conversationsFailed : conversations?.length === 0 ? QURAN_CHAT_WORDS.noConversations : undefined,
      gone: gone ? QURAN_CHAT_WORDS.conversationGone : undefined,
      notice,
      canAsk: signedIn() === true && !busy && !reopening && !notice?.reached,
      busy,
    };
  }
  /** Shows what Quran Chat holds now. */
  const changed = () => {
    if (closed) return;
    snapshot = stateNow();
    for (const listener of listeners) listener();
  };
  snapshot = stateNow();

  /** GETs /api/v1 `path`'s JSON, or undefined when it cannot be had. */
  async function read<T>(path: string, signal?: AbortSignal): Promise<T | undefined> {
    const res = await account.request("GET", path, { signal });
    if (!res?.ok) return undefined;
    return (await res.json().catch(() => undefined)) as T | undefined;
  }

  async function readLimits() {
    const got = await read<QuestionLimits>("/question-limits");
    const said = got && limitsNotice(got);
    if (got && signedIn()) {
      notice = said && {
        text: said.reached ? QURAN_CHAT_WORDS.limitReached(said.reached, said.limit, said.resets) : QURAN_CHAT_WORDS.questionsLeftToday(said.left),
        reached: !!said.reached,
      };
      changed();
    }
  }

  /** Lists the Account's Conversations again; when they cannot be, keeps any already listed. */
  async function list() {
    const got = await read<{ conversations: ConversationListed[] }>("/conversations");
    if (!signedIn()) return;
    conversations = got ? got.conversations : Array.isArray(conversations) ? conversations : "failed";
    changed();
  }

  /** Stops any answer arriving and opens a new, empty Conversation; `wasGone` when the one open was deleted elsewhere. */
  function startNew(wasGone = false) {
    asking?.abort();
    asking = undefined;
    reopening = false;
    gone = wasGone;
    open = { questions: [] };
    changed();
  }

  /** Reads which Account the app is signed in to; signed out or signed in to another, forgets what the last one showed, and signed in, reads its limits and Conversations. */
  async function readSignIn() {
    const as = (await account.signedInAs())?.email ?? null;
    if (as === signedInAs) return;
    const switched = signedInAs !== undefined;
    signedInAs = as;
    if (as === null || switched) {
      startNew();
      conversations = notice = undefined;
    }
    changed();
    if (as !== null) await Promise.all([readLimits(), list()]);
  }

  const stopListening = account.subscribe(() => track(readSignIn()));
  track(readSignIn());

  async function reopen(id: string) {
    const controller = new AbortController();
    asking?.abort();
    asking = controller;
    reopening = true;
    gone = false;
    changed();
    try {
      const kept = await read<Conversation>(`/conversations/${encodeURIComponent(id)}`, controller.signal);
      if (controller.signal.aborted) return;
      if (!kept) {
        track(list());
        return;
      }
      open = { id, questions: kept.questions.map((q) => ({ question: q.question, language: q.language, answer: answerKept(q) })) };
    } finally {
      if (asking === controller) {
        asking = undefined;
        reopening = false;
        changed();
      }
    }
  }

  async function remove(id: string) {
    if (open.id === id) startNew();
    const res = await account.request("DELETE", `/conversations/${encodeURIComponent(id)}`);
    if (res?.ok || res?.status === 404) {
      if (Array.isArray(conversations)) conversations = conversations.filter((c) => c.id !== id);
      // Reopened while it was being deleted: it is gone all the same.
      if (open.id === id) open = { questions: [] };
      changed();
    }
  }

  async function ask(question: string, language: Language): Promise<AskOutcome> {
    const asked = question.trim();
    if (!asked || !snapshot.canAsk) return "not asked";
    gone = false;
    asking?.abort();
    const controller = (asking = new AbortController());
    const n = open.questions.length;
    const conversation = open.id;
    open = { ...open, questions: [...open.questions, { question: asked, language, answer: { text: "", done: false } }] };
    changed();
    const show = (next: (now: Answer) => Answer) => {
      if (controller.signal.aborted) return;
      open = { ...open, questions: open.questions.map((q, i) => (i === n ? { ...q, answer: next(q.answer) } : q)) };
      changed();
    };
    try {
      const body = { question: asked, language, ...(conversation && { conversation }) };
      const res = await account.request("POST", "/questions", { body, signal: controller.signal });
      if (res?.status === 404 && conversation) {
        // Deleted on the website or another device: the next question starts a new Conversation, and this one is asked again in it.
        if (controller.signal.aborted) return "asked";
        startNew(true);
        track(list());
        return { givenBack: asked };
      }
      // A limit reached: the question is not asked, and the limits read again say which.
      if (res?.status === 429) {
        if (controller.signal.aborted) return "asked";
        open = { ...open, questions: open.questions.slice(0, n) };
        changed();
        return { givenBack: asked };
      }
      if (!res?.ok || !res.body) throw new Error(`Quran Chat answered ${res?.status ?? "nothing"}`);
      await readAnswerEvents(res.body, (e) => {
        if (e.type === "conversation") {
          if (!controller.signal.aborted) open = { ...open, id: e.id };
        } else if (e.type === "text") show((now) => ({ ...now, text: now.text + e.text }));
        else if (e.type === "declined") show((now) => ({ ...now, declined: e.text }));
        else if (e.type === "error") show((now) => ({ ...now, failed: true }));
      });
      show((now) => ({ ...now, done: true }));
    } catch {
      show((now) => ({ ...now, failed: true, done: true }));
    } finally {
      // Read again even when stopped: the question was counted all the same.
      track(readLimits());
      if (asking === controller) asking = undefined;
    }
    track(list());
    return "asked";
  }

  return {
    state: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    ask,
    startNew,
    reopen,
    remove,
    async settled() {
      for (;;) {
        await account.settled();
        if (pending.size === 0) return;
        await Promise.allSettled([...pending]);
      }
    },
    close() {
      asking?.abort();
      stopListening();
      closed = true;
    },
  };
}
