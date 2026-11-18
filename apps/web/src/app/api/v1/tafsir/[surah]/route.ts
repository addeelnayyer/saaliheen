// A Surah's Tafsir in one Language, as the website and the mobile app read it
// (#233, ADR 0053, ADR 0054), GET /api/v1/tafsir/{surah}?lang=en|ur: answers
// { surah, language, credit, entries }, needing no Account. "entries" are the
// Surah's Tafsir entries in that Language in order, each
// { firstAyah, lastAyah, text }, the text as published with its bold and
// italic markup, [] when it has none; "credit" is the edition's credit line.
// Urdu is answered exactly as English. Read through the Tafsir module, cached
// under the Surah's tag, which a Tafsir load refreshes, and by the CDN for a
// minute. A path that is no Surah number from 1 to 114 answers 404, a lang
// that is neither "en" nor "ur" 400, and a database that cannot be read 503,
// each with { error }: never an empty list it did not read (ADR 0028).

import type { Language } from "@saaliheen/passages";
import { isLanguage } from "@/dataset/reader";
import { cachedTafsir, TafsirUnread } from "@/tafsir/cached";
import { TAFSIR_CREDITS } from "@/tafsir/tafsir";
import { apiError, apiJson, cachedAtEdge } from "../../respond";
import { NOT_A_SURAH, surahOf } from "../../surah-number";

const NOT_A_LANGUAGE = 'name the Language as lang: "en" or "ur"';
const UNREAD = "the Tafsir cannot be read just now: try again later";

/** Surah `surah`'s answer in `language`; 503 when its Tafsir cannot be read. */
async function answerFor(surah: number, language: Language): Promise<Response> {
  try {
    const entries = await cachedTafsir(surah, language);
    return apiJson({ surah, language, credit: TAFSIR_CREDITS[language], entries });
  } catch (error) {
    if (!(error instanceof TafsirUnread)) throw error;
    console.error(`Tafsir of Surah ${surah} in ${language} unread: ${error.message}`);
    return apiError(503, UNREAD);
  }
}

export async function GET(request: Request, { params }: RouteContext<"/api/v1/tafsir/[surah]">) {
  const surah = surahOf((await params).surah);
  if (surah === undefined) return apiError(404, NOT_A_SURAH);
  const language = new URL(request.url).searchParams.get("lang");
  if (!language || !isLanguage(language)) return apiError(400, NOT_A_LANGUAGE);
  return cachedAtEdge(await answerFor(surah, language), 60);
}
