// Embedding Quran Chat's sources and questions (#77, ADR 0056): OpenAI's
// text-embedding-3-small, called over HTTP at OPENAI_BASE_URL (OpenAI's own
// when unset) with OPENAI_API_KEY. The tests point OPENAI_BASE_URL at a fake
// of the endpoint (features/api/fake-openai.ts).

/** Turns texts into vectors of `dimensions` numbers, a text's meaning near another's when their vectors are. */
export interface Embedder {
  /** The model's name, kept beside each vector: a vector of another model is embedded again. */
  model: string;
  embed(texts: readonly string[]): Promise<number[][]>;
}

/** The model, whose 1536 dimensions the index's column holds (scripts/content/quran-chat-source.ts). */
const EMBEDDING_MODEL = "text-embedding-3-small";

/** How often a request OpenAI refused for load, or failed to answer, is tried in all. */
const TRIES = 4;

/** OpenAI's embedder, or undefined when there is no OPENAI_API_KEY. */
export function openAiEmbedder(): Embedder | undefined {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return undefined;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  return {
    model: EMBEDDING_MODEL,
    async embed(texts) {
      for (let attempt = 1; ; attempt++) {
        const response = await fetch(`${base}/embeddings`, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
        });
        if (response.ok) {
          const { data } = (await response.json()) as { data: { index: number; embedding: number[] }[] };
          return data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
        }
        const retry = response.status === 429 || response.status >= 500;
        if (!retry || attempt === TRIES) throw new Error(`OpenAI refused to embed (${response.status}): ${await response.text()}`);
        await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
      }
    },
  };
}
