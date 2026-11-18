// A Conversation as /api/v1/conversations answers it (#79, ADR 0059), to the
// website and the mobile app alike: listed, and reopened with its questions.

import type { Language } from "@saaliheen/passages";

/** A Conversation as it is listed: times in milliseconds since the epoch. */
export interface ConversationListed {
  id: string;
  title: string;
  startedAt: number;
  updatedAt: number;
}

/** A question of a Conversation, with its answer: null while it is written, or when none came. */
export interface QuestionKept {
  question: string;
  language: Language;
  askedAt: number;
  answer: string | null;
  declined: boolean;
}

/** A Conversation reopened: its questions in the order they were asked. */
export interface Conversation extends ConversationListed {
  questions: QuestionKept[];
}

/** An answer as it has arrived so far, or as it was kept. */
export interface AnswerSoFar {
  text: string;
  declined?: string;
  failed?: boolean;
  /** A kept question whose answer never came whole. */
  unanswered?: boolean;
  done: boolean;
}

/** A kept question's answer as it shows: declined, missing, or whole. */
export const answerKept = (kept: QuestionKept): AnswerSoFar =>
  kept.declined
    ? { text: "", declined: kept.answer ?? "", done: true }
    : { text: kept.answer ?? "", unanswered: kept.answer === null, done: true };
