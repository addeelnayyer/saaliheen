// OpenAI as the API contract runs it (#77): Quran Chat's index embeds its
// sources through OpenAI's embeddings endpoint (ADR 0056), which the tests
// cannot reach and must not pay for. ./serve-api.ts serves this fake of it on
// the run's machine and points OPENAI_BASE_URL at it, for `pnpm db:migrate`,
// the scripts the features run and the server alike. It embeds a text by its
// words, each word adding to a few dimensions picked by its hashes. So a
// question finds the texts that share its words, a text's own words find that
// text first, and a text with none of a question's words is far from it.

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** text-embedding-3-small's dimensions, which the index's column holds. */
const DIMENSIONS = 1536;

/** How many dimensions each word adds to, so two words that share one by chance are still far apart. */
const DIMENSIONS_PER_WORD = 8;

/** FNV-1a of `word` seeded by `seed`: the same on every run. */
function hashOf(word: string, seed: number): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0;
  for (const unit of word) {
    hash ^= unit.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** `text`'s embedding: each of its words, lowercased, adds ±1 to each of its dimensions, and the vector is scaled to length 1. */
export function fakeEmbedding(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    for (let seed = 0; seed < DIMENSIONS_PER_WORD; seed++) {
      const hash = hashOf(word, seed);
      vector[hash % DIMENSIONS] += hash & 0x80000000 ? -1 : 1;
    }
  const length = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Math.round((v / length) * 10_000) / 10_000);
}

/** Serve the fake's POST /v1/embeddings on `port` (a free one when 0); its base URL, as OPENAI_BASE_URL takes it, and a way to stop it. */
export async function serveFakeOpenAi(port = 0): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (req.method !== "POST" || req.url !== "/v1/embeddings" || !/^Bearer \S+/.test(req.headers.authorization ?? "")) {
        res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: "not found" } }));
        return;
      }
      const { input, model } = JSON.parse(body) as { input: string[]; model: string };
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          object: "list",
          model,
          data: input.map((text, index) => ({ object: "embedding", index, embedding: fakeEmbedding(text) })),
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const { port: at } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${at}/v1`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
