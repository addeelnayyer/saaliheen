// Reading Quran Chat's answer as /api/v1/questions streams it (ADR 0057): one
// JSON event per line, handed on as each line arrives, in the website's
// browser and in the mobile app (through expo/fetch, whose body streams) alike.

import type { AnswerEvent } from "./answer-text.ts";

/** Read `body`'s newline-delimited JSON events, handing each to `on` as it arrives. */
export async function readAnswerEvents(body: ReadableStream<Uint8Array>, on: (event: AnswerEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let rest = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const lines = (rest + decoder.decode(value, { stream: true })).split("\n");
    rest = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) on(JSON.parse(line) as AnswerEvent);
  }
  rest += decoder.decode();
  if (rest.trim()) on(JSON.parse(rest) as AnswerEvent);
}
