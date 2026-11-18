// Quran Chat's Conversations (#79): a person's questions and Quran Chat's
// answers, kept for their Account so they can come back to them on any
// device. A Conversation is started by its first question, titled by it, and
// continued by each question asked in it; it is deleted with every question
// in it, and with its Account. A Conversation is only ever found for the
// Account it belongs to: for any other, it is not there.

import type { BetterAuthPlugin } from "better-auth";
import type { Pool } from "pg";
import type { Language } from "@saaliheen/passages";
import type { Conversation, ConversationListed } from "@saaliheen/quran-chat";
import type { Asked } from "./answer.ts";

/** The table of Conversations: one row per Conversation. */
const CONVERSATIONS = "conversation";
/** The table of the questions asked in them: one row per question, with its answer. */
const QUESTIONS = "conversationQuestion";

/** Why a Conversation is not found for an Account: never saying whether it is another's. */
export const NO_SUCH_CONVERSATION = "no such Conversation: it is not this Account's, or it was deleted";

/** How many of a Conversation's latest answered questions Claude is sent before the question, with their answers. */
export const EARLIER_QUESTIONS = 10;

/** The longest a Conversation's title is, in characters: its first question, cut short. */
const TITLE_CHARACTERS = 80;

/**
 * Quran Chat's two tables, through Better Auth's schema like the Reading
 * places', so `pnpm db:migrate` applies them with the Account tables.
 * "conversation": its Account ("userId", deleted with its "user" row), its
 * `title`, when it was started (`createdAt`) and last asked in
 * (`updatedAt`). "conversationQuestion": its Conversation (deleted with it),
 * the `question`, its `language`, when it was asked (`askedAt`), and the
 * `answer` once it is whole (null until then, and when none came), `declined`
 * when it was.
 */
export const conversationsSchema = () =>
  ({
    id: "quran-chat-conversations",
    schema: {
      [CONVERSATIONS]: {
        fields: {
          userId: { type: "string", required: true, index: true, references: { model: "user", field: "id", onDelete: "cascade" } },
          title: { type: "string", required: true },
          createdAt: { type: "date", required: true },
          updatedAt: { type: "date", required: true },
        },
      },
      [QUESTIONS]: {
        fields: {
          conversationId: { type: "string", required: true, index: true, references: { model: CONVERSATIONS, field: "id", onDelete: "cascade" } },
          question: { type: "string", required: true },
          language: { type: "string", required: true },
          askedAt: { type: "date", required: true },
          answer: { type: "string", required: false },
          declined: { type: "boolean", required: true },
        },
      },
    },
  }) satisfies BetterAuthPlugin;

/** `question` as a Conversation's title: its first TITLE_CHARACTERS, on one line. */
export function titleOf(question: string): string {
  const line = question.replace(/\s+/g, " ").trim();
  return line.length <= TITLE_CHARACTERS ? line : `${line.slice(0, TITLE_CHARACTERS - 1).trimEnd()}…`;
}

interface ConversationRow {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const listed = (row: ConversationRow): ConversationListed => ({
  id: row.id,
  title: row.title,
  startedAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime(),
});

/** The Account `userId`'s Conversations, the one asked in most recently first. */
export async function listConversations(pool: Pool, userId: string): Promise<ConversationListed[]> {
  const { rows } = await pool.query<ConversationRow>(
    `select id, title, "createdAt", "updatedAt" from "${CONVERSATIONS}" where "userId" = $1 order by "updatedAt" desc, id`,
    [userId],
  );
  return rows.map(listed);
}

/** The Account `userId`'s Conversation `id`, with its questions in order; undefined when it has none by that id. */
export async function readConversation(pool: Pool, userId: string, id: string): Promise<Conversation | undefined> {
  const { rows } = await pool.query<ConversationRow>(
    `select id, title, "createdAt", "updatedAt" from "${CONVERSATIONS}" where id = $1 and "userId" = $2`,
    [id, userId],
  );
  if (!rows[0]) return undefined;
  const questions = await pool.query<{ question: string; language: Language; askedAt: Date; answer: string | null; declined: boolean }>(
    `select question, language, "askedAt", answer, declined from "${QUESTIONS}" where "conversationId" = $1 order by "askedAt", id`,
    [id],
  );
  return {
    ...listed(rows[0]),
    questions: questions.rows.map((row) => ({
      question: row.question,
      language: row.language,
      askedAt: row.askedAt.getTime(),
      answer: row.answer,
      declined: row.declined,
    })),
  };
}

/** Delete the Account `userId`'s Conversation `id` and every question in it; whether it had one by that id. */
export async function deleteConversation(pool: Pool, userId: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`delete from "${CONVERSATIONS}" where id = $1 and "userId" = $2`, [id, userId]);
  return (rowCount ?? 0) > 0;
}

/** An earlier question of a Conversation that was answered, and its answer, as Claude is sent them. */
export interface Exchange {
  question: string;
  language: Language;
  answer: string;
}

/** A question just asked in a Conversation: the Conversation, its earlier answered questions, and a way to keep the answer. */
export interface Asking {
  conversation: string;
  /** Its latest EARLIER_QUESTIONS answered questions, in the order they were asked. */
  earlier: Exchange[];
  /** Keep the question's answer once it is whole. */
  keep: (answer: string, declined: boolean) => Promise<void>;
}

/**
 * Ask `asked` in the Account `userId`'s Conversation it names, or, naming
 * none, in a new Conversation titled by its question. The
 * question is kept at once, its answer to come; the Conversation moves to the
 * top of the list. Undefined when the Account has no Conversation by that id.
 */
export async function askIn(
  pool: Pool,
  userId: string,
  { question, language, conversation }: Asked,
): Promise<Asking | undefined> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const now = new Date();
    let id = conversation;
    if (id === undefined) {
      id = crypto.randomUUID();
      await client.query(
        `insert into "${CONVERSATIONS}" (id, "userId", title, "createdAt", "updatedAt") values ($1, $2, $3, $4, $4)`,
        [id, userId, titleOf(question), now],
      );
    } else {
      const { rowCount } = await client.query(
        `update "${CONVERSATIONS}" set "updatedAt" = $3 where id = $1 and "userId" = $2`,
        [id, userId, now],
      );
      if (!rowCount) {
        await client.query("rollback");
        return undefined;
      }
    }
    const { rows } = await client.query<Exchange>(
      `select question, language, answer from "${QUESTIONS}"
        where "conversationId" = $1 and answer is not null and not declined order by "askedAt" desc, id desc limit $2`,
      [id, EARLIER_QUESTIONS],
    );
    const questionId = crypto.randomUUID();
    await client.query(
      `insert into "${QUESTIONS}" (id, "conversationId", question, language, "askedAt", declined) values ($1, $2, $3, $4, $5, false)`,
      [questionId, id, question, language, now],
    );
    await client.query("commit");
    return {
      conversation: id,
      earlier: rows.reverse(),
      keep: async (answer, declined) => {
        await pool.query(`update "${QUESTIONS}" set answer = $2, declined = $3 where id = $1`, [questionId, answer, declined]);
      },
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
