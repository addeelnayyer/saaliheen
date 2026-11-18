// The Quran Chat side of /api/v1 the app's Quran Chat scenarios (#81) talk
// to: a faithful stand-in, on the data origin (./support.ts), beside the
// Account stand-in (./accounts-api.ts) whose bearer tokens it accepts, for
// what the website's API contract (apps/web/features/api/quran-chat-questions,
// quran-chat-limits and conversations features) pins against the real build,
// Postgres and a fake Claude:
//
// - POST /api/v1/questions { question, language, conversation? }: 401 signed
//   out; 400 for a body that is not one; 429 { error, limit, resetsAt } with
//   Retry-After once the Free Plan's daily (20) or monthly (300) Question
//   limit is reached, the question not counted; the question is counted, then
//   404 { error } for a Conversation that is not the Account's; else 200,
//   newline-delimited JSON events: the Conversation first, then the answer's
//   text, or its decline, then the end. Each Account's questions are counted by
//   UTC day and month at the scenario's clock.
// - GET /api/v1/question-limits: { plan, daily, monthly }, each { limit, asked, left, resetsAt }.
// - GET /api/v1/conversations: { conversations }, most recently asked in first.
// - GET and DELETE /api/v1/conversations/:id: the Conversation with its
//   questions, or 204; 404 for one that is not the Account's.
//
// A scenario says how Quran Chat answers a question (in parts, or declining
// it); a question it says nothing of is answered in one part citing Ayat
// al-Kursi. An answer can be held after its first part until the scenario lets
// the rest arrive.

import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { MIN_APP_VERSION } from "@saaliheen/dataset/published";
import { DECLINED, limitReached, QUESTION_CHARACTERS, type AnswerEvent, type Conversation, type Limit, type QuestionLimits } from "@saaliheen/quran-chat";
import { bodyOf, isObject, type AccountsApi } from "./accounts-api.ts";

const DAILY_LIMIT = 20;
const MONTHLY_LIMIT = 300;

/** How Quran Chat answers a question: its text in the parts it streams as, or declining it. */
type Answering = { parts: string[] } | { declined: true };

/** A Conversation kept for an Account, by the Account's email. */
interface Kept extends Conversation {
  email: string;
}

const LANGUAGES = ["ur", "en"];

/** The UTC day and month `now` is in, each as when it starts and when the next starts. */
function periods(now: number) {
  const d = new Date(now);
  const [year, month, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  return {
    daily: { from: Date.UTC(year, month, day), to: Date.UTC(year, month, day + 1) },
    monthly: { from: Date.UTC(year, month, 1), to: Date.UTC(year, month + 1, 1) },
  };
}

export class QuranChatApi {
  /** When each Account asked each of its questions, by email. */
  private readonly asked = new Map<string, number[]>();
  private readonly conversations = new Map<string, Kept>();
  private readonly answering = new Map<string, Answering>();
  /** Answers held after their first part, by question, until released. */
  private readonly held = new Map<string, { released: Promise<void>; release: () => void }>();
  /** How many requests the app has made to Quran Chat. */
  requests = 0;

  constructor(private readonly accounts: AccountsApi) {}

  /** Quran Chat answers `question` in these `parts`, or declines it. */
  answers(question: string, answering: Answering) {
    this.answering.set(question, answering);
  }

  /** Holds the answer to `question` after its first part; answers how to let the rest arrive. */
  hold(question: string): () => void {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    this.held.set(question, { released, release });
    return release;
  }

  /** Account `email` has asked `count` questions at `at`. */
  haveAsked(email: string, count: number, at: number) {
    this.asked.set(email, [...(this.asked.get(email) ?? []), ...Array.from({ length: count }, () => at)]);
  }

  reset() {
    this.asked.clear();
    this.conversations.clear();
    this.answering.clear();
    for (const { release } of this.held.values()) release();
    this.held.clear();
    this.requests = 0;
  }

  /** Whether `pathname` is one of Quran Chat's resources. */
  handles(pathname: string): boolean {
    return pathname === "/api/v1/questions" || pathname === "/api/v1/question-limits" || /^\/api\/v1\/conversations(\/[^/]+)?$/.test(pathname);
  }

  /** Account `email`'s Question limits now. */
  private limits(email: string): QuestionLimits {
    const { daily, monthly } = periods(Date.now());
    const times = this.asked.get(email) ?? [];
    const limit = (allowed: number, period: { from: number; to: number }): Limit => {
      const asked = times.filter((t) => t >= period.from && t < period.to).length;
      return { limit: allowed, asked, left: Math.max(0, allowed - asked), resetsAt: new Date(period.to).toISOString() };
    };
    return { plan: "Free", daily: limit(DAILY_LIMIT, daily), monthly: limit(MONTHLY_LIMIT, monthly) };
  }

  /** Account `email`'s Conversation `id`, or undefined when it has none by that id. */
  private conversationOf(email: string, id: string): Kept | undefined {
    const kept = this.conversations.get(id);
    return kept?.email === email ? kept : undefined;
  }

  async answer(req: IncomingMessage, res: ServerResponse, pathname: string, from: "the app" | "the website") {
    if (from === "the app") this.requests++;
    const method = req.method ?? "GET";
    const json = method === "POST" ? (await bodyOf(req)).json : undefined;
    const headers = { "Min-App-Version": MIN_APP_VERSION };
    const send = (status: number, body: unknown, more: Record<string, string> = {}) =>
      res.writeHead(status, { "content-type": "application/json", ...headers, ...more }).end(JSON.stringify(body));
    const email = this.accounts.whoIs(req.headers.authorization ?? null);
    if (!email) return send(401, { error: "not signed in: send the session cookie or a bearer token" });
    const noSuchConversation = () => send(404, { error: "no such Conversation: it is not this Account's, or it was deleted" });

    if (pathname === "/api/v1/question-limits" && method === "GET") return send(200, this.limits(email), { "cache-control": "no-store" });
    if (pathname === "/api/v1/conversations" && method === "GET") {
      // Kept in the order they were last asked in, so most recently asked in first, even at the scenarios' still clock.
      const listed = [...this.conversations.values()]
        .reverse()
        .filter((c) => c.email === email)
        .map(({ id, title, startedAt, updatedAt }) => ({ id, title, startedAt, updatedAt }));
      return send(200, { conversations: listed });
    }
    const one = /^\/api\/v1\/conversations\/([^/]+)$/.exec(pathname);
    if (one) {
      const kept = this.conversationOf(email, decodeURIComponent(one[1]));
      if (!kept) return noSuchConversation();
      if (method === "DELETE") {
        this.conversations.delete(kept.id);
        return res.writeHead(204, headers).end();
      }
      const { id, title, startedAt, updatedAt, questions } = kept;
      return send(200, { id, title, startedAt, updatedAt, questions } satisfies Conversation);
    }
    if (pathname !== "/api/v1/questions" || method !== "POST") return send(404, { error: "no such resource" });

    const { question, language, conversation } = isObject(json) ? json : {};
    const asked = typeof question === "string" ? question.trim() : "";
    if (!asked || asked.length > QUESTION_CHARACTERS || !LANGUAGES.includes(language as string) || (conversation !== undefined && typeof conversation !== "string")) {
      return send(400, { error: "send a JSON object with a question (1 to 2,000 characters), a language (ur or en) and, to continue a Conversation, its id as conversation" });
    }
    const limits = this.limits(email);
    const reached = limitReached(limits);
    if (reached) {
      const { resetsAt } = limits[reached];
      const retryAfter = String(Math.ceil((Date.parse(resetsAt) - Date.now()) / 1000));
      return send(429, { error: `the ${reached} Question limit is reached: it resets at ${resetsAt}`, limit: reached, resetsAt }, { "Retry-After": retryAfter });
    }
    this.haveAsked(email, 1, Date.now());
    const now = Date.now();
    let kept: Kept | undefined;
    if (conversation !== undefined) {
      kept = this.conversationOf(email, conversation as string);
      if (!kept) return noSuchConversation();
    } else {
      kept = { email, id: randomUUID(), title: asked.slice(0, 80), startedAt: now, updatedAt: now, questions: [] };
      this.conversations.set(kept.id, kept);
    }
    kept.updatedAt = now;
    this.conversations.delete(kept.id);
    this.conversations.set(kept.id, kept);
    const answering = this.answering.get(asked) ?? { parts: ["An answer resting on Ayat al-Kursi [2:255]."] };
    const lang = language as "ur" | "en";
    const answerText = "declined" in answering ? DECLINED[lang] : answering.parts.join("");
    kept.questions.push({ question: asked, language: lang, askedAt: now, answer: answerText, declined: "declined" in answering });

    res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", ...headers });
    const write = (event: AnswerEvent) => res.write(`${JSON.stringify(event)}\n`);
    write({ type: "conversation", id: kept.id });
    if ("declined" in answering) write({ type: "declined", text: DECLINED[lang] });
    else
      for (const [n, text] of answering.parts.entries()) {
        write({ type: "text", text });
        if (n === 0) await this.held.get(asked)?.released;
      }
    write({ type: "end" });
    res.end();
  }
}
