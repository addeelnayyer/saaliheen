// Each Surah's Ayahs as the Passage editor shows them (#44), as its own JSON
// file, /ayahs/<Surah>.json, read from Neon (#172): the editor fetches its
// Surah's Ayahs from the site's own files. None is built ahead (ADR 0020),
// when the build may have no database: each is made on its first request and
// then served as a static file. Any other address under /ayahs is not found.

import { isSurahNumber, surahAyahTexts } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";

export const dynamic = "force-static";

// None at build; any name reaches GET, which answers all but a Surah's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/ayahs/[file]">) {
  const { file } = await params;
  const number = numberFromFileName(file);
  // Only `1.json`, never `01.json`.
  if (numberedFileName(number) !== file || !isSurahNumber(number)) return new Response(null, { status: 404 });
  return Response.json(await surahAyahTexts(number));
}
