// Each Surah's Recitation in the published dataset (#115, ADR 0010) as its own
// file, /data/v1/recitations/<n>.json: the address of the Surah's audio and
// its Word timings, Ayah by Ayah, read from Neon (#172) key for key as the
// dataset builder gives them, so the file keeps its bytes. None is built ahead
// (ADR 0020): each is made on its first request and then served as a static
// file. The manifest names each file's hash. Any other address under
// /data/v1/recitations is not found.

import { getRecitation } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";
import { publishedResponse } from "../../respond";

export const dynamic = "force-static";

// None at build, when the database may not hold the Quran yet; any name reaches GET, which answers all but a Recitation's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/data/v1/recitations/[file]">) {
  const { file } = await params;
  const number = numberFromFileName(file);
  // Only the name the manifest lists: `1.json`, never `01.json`.
  const recitation = numberedFileName(number) === file ? await getRecitation(number) : undefined;
  if (!recitation) return new Response(null, { status: 404 });
  return publishedResponse(recitation);
}
