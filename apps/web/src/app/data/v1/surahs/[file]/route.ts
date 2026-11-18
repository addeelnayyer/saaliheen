// Each Surah of the published dataset (#65, ADR 0008) as its own file,
// /data/v1/surahs/<n>.json: its Words in both Scripts, its Word meanings, Ayah
// translations and Passages in both Languages, as the dataset builder gives
// it, and each Ayah's Themes, all read from Neon (#170, #172), so the file
// keeps its shape and bytes. None is built ahead (ADR 0020): each is
// made on its first request and then served as a static file. The manifest
// names each file's hash. Any other address under /data/v1/surahs is not found.

import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";
import { publishedSurah } from "@/themes/published";
import { publishedResponse } from "../../respond";

export const dynamic = "force-static";

// None at build, when the database may not hold the Themes yet; any name reaches GET, which answers all but a Surah's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/data/v1/surahs/[file]">) {
  const { file } = await params;
  const number = numberFromFileName(file);
  // Only the name the manifest lists: `1.json`, never `01.json`.
  const surah = numberedFileName(number) === file ? await publishedSurah(number) : undefined;
  if (!surah) return new Response(null, { status: 404 });
  return publishedResponse(surah);
}
