// Each Root's dialog data as its own JSON file, /roots/<QUL Root id>.json, read
// from Neon (#173). A Surah page holds only its Words' Root tags and fetches a
// Root's file when that Root's dialog opens. None is built ahead (ADR 0020),
// when the build may have no database: each is made on its first request from
// the data cache (src/quran/cached.ts) and then served as a static file. Any
// other address under /roots is not found.

import { getRoot } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";

export const dynamic = "force-static";

// None at build, when the database may not hold the Roots yet; any name reaches GET, which answers all but a Root's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/roots/[file]">) {
  const { file } = await params;
  const id = numberFromFileName(file);
  // Only a Root's own name: `1.json`, never `01.json`.
  const root = numberedFileName(id) === file ? await getRoot(id) : undefined;
  if (!root) return new Response(null, { status: 404 });
  return Response.json(root);
}
