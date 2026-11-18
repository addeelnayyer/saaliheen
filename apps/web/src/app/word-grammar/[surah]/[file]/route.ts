// Each Ayah's Word grammar as its own JSON file, /word-grammar/<surah>/<ayah>.json,
// read from Neon (#277): each Word's Segments, and the Root or particle Study
// gives it, by Word location. A Grammar page holds only its Grammar lines and
// fetches an Ayah's file when the Word grammar dialog first opens on one of its
// Words. None is built ahead (ADR 0020), when the build may have no database:
// each is made on its first request from the data cache (src/quran/cached.ts)
// and then served as a static file. Any other address under /word-grammar is
// not found.

import { getAyahGrammar } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";

export const dynamic = "force-static";

// None at build, when the database may not hold the Word grammar yet; any names reach GET, which answers all but an Ayah's not found.
export const generateStaticParams = (): { surah: string; file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/word-grammar/[surah]/[file]">) {
  const { surah, file } = await params;
  const [surahNumber, ayah] = [Number(surah), numberFromFileName(file)];
  // Only an Ayah's own names: `2/8.json`, never `02/8.json` or `2/08.json`.
  const grammar = String(surahNumber) === surah && numberedFileName(ayah) === file ? await getAyahGrammar(surahNumber, ayah) : undefined;
  if (!grammar) return new Response(null, { status: 404 });
  return Response.json(grammar);
}
