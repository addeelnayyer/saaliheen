// `pnpm db:index-quran-chat` (#77, ADR 0056): brings Quran Chat's index in the
// Postgres DATABASE_URL names (Neon) to its sources, the Ayah translations and
// the Tafsir in both Languages, embedding with OpenAI each source that is new
// or changed and dropping each that is gone (../src/quran-chat/sources.ts).
// `pnpm db:migrate` and `pnpm db:load-tafsir` run the same indexing; the owner
// runs this after putting the Urdu Tafsir into Neon, or to finish an indexing
// that failed.
//
//   DATABASE_URL=… OPENAI_API_KEY=… pnpm db:index-quran-chat

import { database } from "../src/database.ts";
import { openAiEmbedder } from "../src/quran-chat/embeddings.ts";
import { indexedLine, indexQuranChatSources } from "../src/quran-chat/sources.ts";

if (!process.env.DATABASE_URL) throw new Error("db:index-quran-chat: set DATABASE_URL");
const embedder = openAiEmbedder();
if (!embedder) throw new Error("db:index-quran-chat: set OPENAI_API_KEY");

const pool = database();
try {
  console.log(`db:index-quran-chat: ${indexedLine(await indexQuranChatSources(pool, embedder))}`);
} finally {
  await pool.end();
}
