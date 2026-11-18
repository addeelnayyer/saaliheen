// Claude as the tests run it (#78): Quran Chat answers a question through
// Anthropic's Messages API (ADR 0057), which the tests cannot reach and must
// not pay for. ./serve-api.ts serves this fake of it on the run's machine and
// points ANTHROPIC_BASE_URL at it; the site tests' web server serves it too
// (../site/fake-llm.ts). It streams its answer as the API does, in small
// pieces, so a citation or the decline marker can arrive split across them.
//
// It answers as a fixed stub, never by meaning:
//  - a question FIXED_ANSWERS holds gets that answer, in the Language asked;
//  - a question asking for a "ruling" or naming a "sect" is declined, with the
//    marker alone;
//  - any other is answered by citing every source it was sent, in order.
// An answer asked in Urdu starts "قرآن کے مطابق", one in English "According to
// the Quran". GET /recorded answers the last request's body, so a feature can
// see which model, Language and sources Quran Chat sent, and DELETE /recorded
// forgets it.

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { DECLINED_MARKER } from "@saaliheen/quran-chat";

/** The answers the site scenarios read, by question, in each Language. */
export const FIXED_ANSWERS: Record<string, { en: string; ur: string }> = {
  "Who was Dhul-Qarnayn?": {
    en: "Dhul-Qarnayn was a ruler Allah established in the land [18:83–84], who travelled to where the sun sets [18:86]. al-Mukhtasar explains that he was a righteous king [Tafsir 18:83–84].",
    ur: "ذوالقرنین ایک حکمران تھے جنہیں اللہ نے زمین میں اقتدار دیا [18:83–84]، اور وہ سورج ڈوبنے کی جگہ تک پہنچے [18:86]۔ المختصر کے مطابق وہ ایک نیک بادشاہ تھے [Tafsir 18:83–84]۔",
  },
  "What does Al-Kawthar promise?": {
    en: "Allah tells the Prophet that He has given him al-Kawthar [108:1], so he should pray and sacrifice [108:2].",
    ur: "اللہ نبی سے فرماتا ہے کہ اس نے انہیں کوثر عطا کی [108:1]، تو وہ نماز پڑھیں اور قربانی کریں [108:2]۔",
  },
};

const PREFIX = { en: "According to the Quran", ur: "قرآن کے مطابق" };

/** How many characters each streamed piece holds: small, so a citation is split across pieces. */
const PIECE = 7;

interface MessagesRequest {
  model: string;
  system?: unknown;
  messages: { role: string; content: string | { type: string; text?: string }[] }[];
}

/** Each text block of the request's last message, in order. */
function textsOf(request: MessagesRequest): string[] {
  const content = request.messages.at(-1)?.content ?? [];
  if (typeof content === "string") return [content];
  return content.flatMap((block) => (block.type === "text" && block.text ? [block.text] : []));
}

/** What the fake answers `request`. */
export function fakeAnswer(request: MessagesRequest): string {
  const sent = textsOf(request).join("\n");
  const language = /Answer in Urdu/.test(sent) ? "ur" : "en";
  const question = /<question>([\s\S]*)<\/question>/.exec(sent)?.[1].trim() ?? "";
  const fixed = FIXED_ANSWERS[question];
  if (fixed) return fixed[language];
  if (/\b(ruling|sect)\b/i.test(question)) return DECLINED_MARKER;
  const cites = [...sent.matchAll(/<source cite="([^"]+)"/g)].map(([, cite]) => `[${cite}]`);
  return `${PREFIX[language]}: ${cites.join(" ")}`;
}

/** `text` as the Messages API streams it: server-sent events, the text in pieces of PIECE characters. */
function streamed(model: string, text: string): string[] {
  const event = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const pieces = Array.from({ length: Math.ceil(text.length / PIECE) }, (_, i) => text.slice(i * PIECE, (i + 1) * PIECE));
  return [
    event("message_start", {
      message: {
        id: "msg_fake",
        type: "message",
        role: "assistant",
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    }),
    event("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
    ...pieces.map((piece) => event("content_block_delta", { index: 0, delta: { type: "text_delta", text: piece } })),
    event("content_block_stop", { index: 0 }),
    event("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: pieces.length } }),
    event("message_stop", {}),
  ];
}

/** Serve the fake's POST /v1/messages on `port` (a free one when 0); its base URL, as ANTHROPIC_BASE_URL takes it, and a way to stop it. */
export async function serveFakeAnthropic(port = 0): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  let recorded: MessagesRequest | undefined;
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      const path = new URL(req.url ?? "/", "http://fake").pathname;
      if (req.method === "DELETE" && path === "/recorded") {
        recorded = undefined;
        res.writeHead(204).end();
        return;
      }
      if (req.method === "GET" && path === "/recorded") {
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(recorded ?? null));
        return;
      }
      if (req.method !== "POST" || path !== "/v1/messages" || !(req.headers["x-api-key"] || req.headers.authorization)) {
        res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "not found" } }));
        return;
      }
      recorded = JSON.parse(body) as MessagesRequest;
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      for (const event of streamed(recorded.model, fakeAnswer(recorded))) {
        res.write(event);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const { port: at } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${at}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
