// Quran Chat's sources (#77, ADR 0056): Quran Chat answers only from the Ayah
// translations and the Tafsir, in both Languages (ADR 0053), and finds what to
// answer from by meaning, in an index in Neon of every Ayah translation and
// every Tafsir entry with its embedding ("quran_chat_source",
// scripts/content/quran-chat-source.ts). A Tafsir entry written for several
// Ayahs is one source pointing to each of them.
//
// Indexing brings the index to its sources: it drops every row whose source is
// gone or changed, or which another model embedded, and embeds every source
// with no row, so a run over unchanged sources embeds nothing and a rerun
// finishes what a failed run left. `pnpm db:migrate` runs it after the Quran
// import, `pnpm db:load-tafsir` after a load, and `pnpm db:index-quran-chat`
// when the owner has put the Urdu Tafsir in.

import type { Pool, PoolClient } from "pg";
import type { Language } from "@saaliheen/passages";
import { openAiEmbedder, type Embedder } from "./embeddings.ts";

/** One thing Quran Chat may answer from. */
export interface QuranChatSource {
  kind: "ayah-translation" | "tafsir-entry";
  language: Language;
  surah: number;
  firstAyah: number;
  lastAyah: number;
  /** Each Ayah it is for, as `surah:ayah`: one for a translation, every one of its Tafsir entry. */
  ayahs: string[];
  /** As embedded: a translation as imported, a Tafsir entry as published without its markup. */
  text: string;
}

/** What one indexing did. */
export interface Indexed {
  embedded: number;
  dropped: number;
}

/**
 * Every source as it is now: each Ayah's two translations and each Tafsir
 * entry, its bold and italic tags taken out, since they mean nothing to a
 * question.
 */
const SOURCES = `
  select 'ayah-translation' as kind, 'en' as language, surah, number as first_ayah, number as last_ayah, translation_en as text from ayah
  union all
  select 'ayah-translation', 'ur', surah, number, number, translation_ur from ayah
  union all
  select 'tafsir-entry', language, surah, first_ayah, last_ayah, btrim(regexp_replace(text, '<[^>]*>', '', 'g')) from tafsir_entry`;

/** Serialises indexings of one database: two would embed the same sources. */
const LOCK = "hashtext('quran_chat_index')";

/** At most this many texts, and this many characters, go to OpenAI in one request, well under its 2,048 inputs and 300,000 tokens. */
const BATCH_TEXTS = 1_024;
const BATCH_CHARACTERS = 200_000;

interface SourceRow {
  kind: QuranChatSource["kind"];
  language: Language;
  surah: number;
  first_ayah: number;
  last_ayah: number;
  text: string;
}

/** `rows` cut into requests OpenAI takes. */
function batchesOf(rows: SourceRow[]): SourceRow[][] {
  const batches: SourceRow[][] = [];
  let batch: SourceRow[] = [];
  let characters = 0;
  for (const row of rows) {
    if (batch.length && (batch.length === BATCH_TEXTS || characters + row.text.length > BATCH_CHARACTERS)) {
      batches.push(batch);
      batch = [];
      characters = 0;
    }
    batch.push(row);
    characters += row.text.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

/** pgvector's text form of `vector`. */
const vectorText = (vector: number[]) => `[${vector.join(",")}]`;

/** Bring the index to its sources, embedding with `embedder`. */
export async function indexQuranChatSources(pool: Pool, embedder: Embedder): Promise<Indexed> {
  const client = await pool.connect();
  try {
    await client.query(`select pg_advisory_lock(${LOCK})`);
    // Two deletes, not one with an `or`: a `not exists` of its own is a hash anti-join, not a rescan of the sources per row.
    const otherModel = await client.query(`delete from quran_chat_source where model <> $1`, [embedder.model]);
    const changed = await client.query(
      `with source as (${SOURCES})
        delete from quran_chat_source q
         where not exists (
           select from source s
            where (s.kind, s.language, s.surah, s.first_ayah, s.last_ayah, s.text)
                = (q.kind, q.language, q.surah, q.first_ayah, q.last_ayah, q.text))`,
    );
    const { rows } = await client.query<SourceRow>(
      `with source as (${SOURCES})
        select s.* from source s
         where not exists (
           select from quran_chat_source q
            where (q.kind, q.language, q.surah, q.first_ayah) = (s.kind, s.language, s.surah, s.first_ayah))
         order by s.kind, s.language, s.surah, s.first_ayah`,
    );
    for (const batch of batchesOf(rows)) await write(client, embedder.model, batch, await embedder.embed(batch.map((row) => row.text)));
    return { embedded: rows.length, dropped: (otherModel.rowCount ?? 0) + (changed.rowCount ?? 0) };
  } finally {
    await client.query(`select pg_advisory_unlock(${LOCK})`).catch(() => undefined);
    client.release();
  }
}

/** Write `batch`'s rows with their `embeddings`. */
async function write(client: PoolClient, model: string, batch: SourceRow[], embeddings: number[][]) {
  if (embeddings.length !== batch.length) throw new Error(`asked to embed ${batch.length} texts, given ${embeddings.length} embeddings`);
  await client.query(
    `insert into quran_chat_source (kind, language, surah, first_ayah, last_ayah, text, model, embedding)
      select kind, language, surah, first_ayah, last_ayah, text, $1, embedding::halfvec
        from unnest($2::text[], $3::text[], $4::int[], $5::int[], $6::int[], $7::text[], $8::text[])
          as t(kind, language, surah, first_ayah, last_ayah, text, embedding)`,
    [
      model,
      batch.map((r) => r.kind),
      batch.map((r) => r.language),
      batch.map((r) => r.surah),
      batch.map((r) => r.first_ayah),
      batch.map((r) => r.last_ayah),
      batch.map((r) => r.text),
      embeddings.map(vectorText),
    ],
  );
}

/** The `limit` sources nearest in meaning to `question`, nearest first; with `tafsirLanguage`, its Tafsir entries only in that Language. */
export async function searchQuranChatSources(
  pool: Pool,
  embedder: Embedder,
  question: string,
  limit = 8,
  tafsirLanguage?: Language,
): Promise<QuranChatSource[]> {
  const [embedding] = await embedder.embed([question]);
  const { rows } = await pool.query<SourceRow>(
    `select kind, language, surah, first_ayah, last_ayah, text from quran_chat_source
      where model = $1 and ($4::text is null or kind <> 'tafsir-entry' or language = $4)
      order by embedding <=> $2::halfvec
      limit $3`,
    [embedder.model, vectorText(embedding), limit, tafsirLanguage ?? null],
  );
  return rows.map((row) => ({
    kind: row.kind,
    language: row.language,
    surah: row.surah,
    firstAyah: row.first_ayah,
    lastAyah: row.last_ayah,
    ayahs: Array.from({ length: row.last_ayah - row.first_ayah + 1 }, (_, i) => `${row.surah}:${row.first_ayah + i}`),
    text: row.text,
  }));
}

/** How an indexing is reported: "Quran Chat's index: 2 sources embedded, 0 dropped". */
export const indexedLine = ({ embedded, dropped }: Indexed) =>
  `Quran Chat's index: ${embedded} ${embedded === 1 ? "source" : "sources"} embedded, ${dropped} dropped`;

/** Bring the index to its sources with OpenAI's embedder when OPENAI_API_KEY is set; the line saying what was done, or that nothing was. */
export async function indexWhenKeyed(pool: Pool): Promise<string> {
  const embedder = openAiEmbedder();
  return embedder
    ? indexedLine(await indexQuranChatSources(pool, embedder))
    : "Quran Chat's index not updated: set OPENAI_API_KEY, then run `pnpm db:index-quran-chat`";
}
