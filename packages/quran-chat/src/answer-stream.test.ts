import { describe, expect, it } from "vitest";
import { readAnswerEvents, type AnswerEvent } from "./index.ts";

/** A body that arrives as `chunks`, each cut wherever it is, even inside a character. */
const arriving = (chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const read = async (body: ReadableStream<Uint8Array>) => {
  const events: AnswerEvent[] = [];
  await readAnswerEvents(body, (event) => events.push(event));
  return events;
};

describe("a streamed answer", () => {
  it("is read event by event, whatever the chunks it arrives in", async () => {
    const bytes = new TextEncoder().encode(
      ['{"type":"conversation","id":"c1"}', '{"type":"text","text":"اللہ [18:83]"}', '{"type":"end"}', ""].join("\n"),
    );
    // Cut inside the Urdu text's first letter, and inside the second line's JSON.
    const cut = [0, 20, 58, 61, bytes.length];
    const chunks = cut.slice(1).map((end, n) => bytes.slice(cut[n], end));
    expect(await read(arriving(chunks))).toEqual([
      { type: "conversation", id: "c1" },
      { type: "text", text: "اللہ [18:83]" },
      { type: "end" },
    ]);
  });

  it("reads a last event that has no newline after it", async () => {
    const body = arriving([new TextEncoder().encode('{"type":"text","text":"a"}\n\n{"type":"error","error":"stopped"}')]);
    expect(await read(body)).toEqual([
      { type: "text", text: "a" },
      { type: "error", error: "stopped" },
    ]);
  });
});
