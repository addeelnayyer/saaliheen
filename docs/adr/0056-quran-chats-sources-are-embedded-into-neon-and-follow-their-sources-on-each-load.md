Fulfils [0053](0053-a-published-tafsir-replaces-saaliheens-own-explanations.md) for Quran Chat, which draws on the Ayah translations and the Tafsir in both Languages.

# Quran Chat's sources are embedded into Neon and follow their sources on each load

Quran Chat answers only from the Ayah translations and the Tafsir, so before it answers it must find which of them a question is about. Every Ayah translation and every Tafsir entry, in English and in Urdu, is one row of `quran_chat_source (kind, language, surah, first_ayah, last_ayah, text, model, embedding)` in Neon (#77), made by the content migration `0017-create-quran-chat-source`. A Tafsir entry written for several Ayahs (2:3–4) is one row whose Ayah range points to each of them. Its text is embedded as a translation was imported and as a Tafsir entry was published, its bold and italic tags taken out. `src/quran-chat/sources.ts` answers the sources nearest a question, by cosine distance.

**Embeddings.** OpenAI's `text-embedding-3-small`, over HTTP with `OPENAI_API_KEY`, kept as pgvector's `halfvec(1536)`: half the size of full floats, at no cost to which sources come nearest. The index is searched over every row, with no approximate (HNSW) index: some 25,000 rows are read in milliseconds, and an exact search always finds the nearest. A row records the model that embedded it, so a change of model embeds everything again.

**Following the sources.** Indexing compares the index with the sources as they are now. It drops each row whose source is gone or whose text changed, and embeds each source with no row. A run over unchanged sources therefore embeds nothing, and a rerun finishes what a failed run left. Three commands run it, one for each way the sources change:

- `pnpm db:migrate`, after the Quran import (the Ayah translations) and the content migrations, so each deploy brings the index to the translations it imported;
- `pnpm db:load-tafsir`, after it replaces the English Tafsir (ADR 0054);
- `pnpm db:index-quran-chat`, which the owner runs after putting the Urdu Tafsir in by hand.

Without `OPENAI_API_KEY`, each one leaves the index as it is and says so. The deploy reads the key from the deployment's settings, as it reads `DATABASE_URL`. Indexing does not run inside the site, as the Tafsir refresh does: embedding thousands of entries takes longer than a request may run.

**Tests.** The API contract's runs replace OpenAI with a fake of its embeddings endpoint (`features/api/fake-openai.ts`), reached through `OPENAI_BASE_URL`. It embeds a text by its words, so a question finds the sources that share its words. The site tests run without a key and leave the index empty. pgvector is not in the `postgres:17` image, so the tests' and `pnpm dev`'s Postgres is `pgvector/pgvector:pg17`, the same Postgres 17 with the extension Neon has. A `pnpm dev` container of the old image is replaced on its own volume.

## Considered Options

- Voyage AI's embeddings: rejected by the owner in favour of OpenAI's.
- Rebuilding the whole index on every load: simpler, but every deploy would embed some 25,000 texts again for nothing.
- Triggers on `ayah` and `tafsir_entry` that mark rows to embed: Postgres cannot call OpenAI itself, so a command would still have to run, and comparing the texts finds the same rows without triggers.
- An HNSW index: needed at millions of rows, not at 25,000, and its approximate answers can miss a nearest source.
- Embedding inside the Tafsir refresh route: one request cannot embed a whole Language's entries in time.
