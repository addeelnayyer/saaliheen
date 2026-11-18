// Quran Chat's answers (#78, ADR 0057): a question is answered by Claude
// Sonnet 5.5, called from the server, from the sources Quran Chat's index finds
// for it (./sources.ts, ADR 0056) and from nothing else, in the person's
// Language, each Ayah it rests on cited, and the Tafsir credited and cited when
// it is used. A question asking for a ruling or a sectarian judgement is
// declined. A question is asked in a Conversation (./conversations.ts, #79),
// whose earlier answered questions Claude is sent before it, and its whole
// answer is kept there. The answer streams as newline-delimited JSON events
// (./answer-text.ts) as Claude writes it, the first naming its Conversation.
// Claude is reached at ANTHROPIC_BASE_URL (Anthropic's own when unset) with ANTHROPIC_API_KEY; the
// tests point it at a fake (features/api/fake-anthropic.ts).

import Anthropic from "@anthropic-ai/sdk";
import type { Pool } from "pg";
import { LANGUAGE_NAME, LANGUAGES, type Language } from "@saaliheen/passages";
import { cite, DECLINED, DECLINED_MARKER, QUESTION_CHARACTERS, type AnswerEvent } from "@saaliheen/quran-chat";
import type { Asking, Exchange } from "./conversations.ts";
import { openAiEmbedder, type Embedder } from "./embeddings.ts";
import { searchQuranChatSources, type QuranChatSource } from "./sources.ts";

/**
 * How many sources Quran Chat sends Claude for a question: the nearest the
 * index finds, its Tafsir entries only in the person's Language, so that the
 * Tafsir an answer cites is the edition credited in that Language.
 */
export const QUESTION_SOURCES = 8;

/** The model that answers. */
const MODEL = "claude-sonnet-5-5";

/** Room for Claude's thinking and an answer of a few paragraphs. */
const MAX_TOKENS = 8_000;

/** The same for every question, so it is cached ahead of the sources. */
const SYSTEM = `You are Quran Chat, on Saaliheen, a website for reading the Quran word by word. A person asks you about the Quran, and you answer them.

Answer only from the sources given with the question: Ayah translations of the Quran, in English and Urdu, and entries of the Tafsir al-Mukhtasar fi Tafsir al-Quran al-Karim (al-Mukhtasar), in English and Urdu. Use nothing you know from anywhere else. If the sources do not answer the question, say so plainly, and say what they do cover if that helps.

The question may come after earlier questions of the same conversation and your answers to them, without their sources: use them only to understand what the question refers to, and answer it from its own sources.

Answer in the Language the question names, whatever Language the question or the sources are in.

Cite every Ayah your answer rests on, right after what it supports, exactly as the source's cite gives it: [18:83] for one Ayah, [18:83–84] for a run of them. Cite only Ayahs the sources hold. When you use a Tafsir entry, say that the explanation is al-Mukhtasar's and cite the entry as its source's cite gives it, in brackets: [Tafsir 18:83–84]. Keep to plain prose: no headings and no Markdown.

If the question asks for a ruling of Islamic law (what is permitted, forbidden, obligatory or disliked, a fatwa) or for a judgement between sects or schools of thought, do not answer it: reply with ${DECLINED_MARKER} and nothing else.`;

/** A question as it is asked: its text, the Language it is to be answered in, and the Conversation it continues, if any. */
export interface Asked {
  question: string;
  language: Language;
  conversation?: string;
}

/**
 * `body` as a question, or undefined when it is not a JSON object with a
 * question (1–2,000 characters) and a Language, and, when it names a
 * Conversation to continue, its id as text.
 */
export function askedQuestion(body: unknown): Asked | undefined {
  if (!body || typeof body !== "object") return undefined;
  const { question, language, conversation } = body as Record<string, unknown>;
  if (typeof question !== "string" || typeof language !== "string") return undefined;
  if (conversation !== undefined && typeof conversation !== "string") return undefined;
  const text = question.trim();
  if (!text || text.length > QUESTION_CHARACTERS || !(LANGUAGES as readonly string[]).includes(language)) return undefined;
  return { question: text, language: language as Language, ...(conversation === undefined ? {} : { conversation }) };
}

/** What answering needs: OpenAI's embedder for the question and a Claude client. */
interface QuranChatAnswerer {
  embedder: Embedder;
  claude: Anthropic;
}

/** The answerer, or undefined when OPENAI_API_KEY or ANTHROPIC_API_KEY is missing. */
export function quranChatAnswerer(): QuranChatAnswerer | undefined {
  const embedder = openAiEmbedder();
  if (!embedder || !process.env.ANTHROPIC_API_KEY) return undefined;
  return { embedder, claude: new Anthropic() };
}

const escaped = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** `source` as Claude is sent it, with the cite it is to be cited by. */
function sourceText(source: QuranChatSource): string {
  const tafsir = source.kind === "tafsir-entry";
  const cited = cite(tafsir, source.surah, source.firstAyah, source.lastAyah);
  return `<source cite="${cited}" kind="${tafsir ? "Tafsir entry" : "Ayah translation"}" language="${LANGUAGE_NAME[source.language]}">${escaped(source.text)}</source>`;
}

/** A question as Claude is sent it: the Language to answer in, then the question. */
const questionText = (question: string, language: Language) => `Answer in ${LANGUAGE_NAME[language]}.\n\n<question>${escaped(question)}</question>`;

/** A Conversation's earlier questions and answers, as the turns before the question. */
const earlierTurns = (earlier: Exchange[]): Anthropic.MessageParam[] =>
  earlier.flatMap(({ question, language, answer }) => [
    { role: "user" as const, content: questionText(question, language) },
    { role: "assistant" as const, content: answer },
  ]);

/** The Messages API request answering `asked` from `sources`, after the Conversation's `earlier` questions. */
function request(asked: Asked, sources: QuranChatSource[], earlier: Exchange[]): Anthropic.MessageStreamParams {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: "low" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      ...earlierTurns(earlier),
      {
        role: "user",
        content: [
          { type: "text", text: `<sources>\n${sources.map(sourceText).join("\n")}\n</sources>` },
          { type: "text", text: questionText(asked.question, asked.language) },
        ],
      },
    ],
  };
}

/**
 * The answer to `asked`, as it is written: one newline-delimited JSON event a
 * line, the first naming the Conversation it is asked in. The answer's first
 * characters are held back until they cannot be the decline marker; when they
 * are, the person is told why, in their Language, and Claude is stopped. A
 * whole answer, or a decline, is kept in the Conversation.
 */
export function answerStream(
  pool: Pool,
  { embedder, claude }: QuranChatAnswerer,
  asked: Asked,
  { conversation, earlier, keep }: Asking,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let stream: ReturnType<Anthropic["messages"]["stream"]> | undefined;
  let cancelled = false;
  return new ReadableStream({
    async start(controller) {
      const send = (event: AnswerEvent) => {
        if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      send({ type: "conversation", id: conversation });
      /** The answer's text as sent so far, to keep once it is whole. */
      let written = "";
      const sendText = (text: string) => {
        written += text;
        send({ type: "text", text });
      };
      try {
        const sources = await searchQuranChatSources(pool, embedder, asked.question, QUESTION_SOURCES, asked.language);
        stream = claude.messages.stream(request(asked, sources, earlier));
        let held = "";
        let deciding = true;
        for await (const event of stream) {
          if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
          if (!deciding) {
            sendText(event.delta.text);
            continue;
          }
          held += event.delta.text;
          const start = held.trimStart();
          if (start.startsWith(DECLINED_MARKER)) {
            stream.abort();
            await keep(DECLINED[asked.language], true);
            send({ type: "declined", text: DECLINED[asked.language] });
            send({ type: "end" });
            return;
          }
          if (!DECLINED_MARKER.startsWith(start)) {
            deciding = false;
            sendText(start);
          }
        }
        if (deciding && held.trim()) sendText(held.trimStart());
        const { stop_reason } = await stream.finalMessage();
        if (stop_reason === "refusal") {
          send({ type: "error", error: "Quran Chat could not answer this question" });
          return;
        }
        // An empty answer is not kept: Claude is never sent an empty earlier turn.
        if (written.trim()) await keep(written, false);
        send({ type: "end" });
      } catch (error) {
        if (cancelled) return;
        console.error("Quran Chat:", error instanceof Error ? error.message : error);
        send({ type: "error", error: "Quran Chat could not answer just now: please try again" });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      stream?.abort();
    },
  });
}
