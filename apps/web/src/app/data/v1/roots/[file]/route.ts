// Each Root of the published dataset (#65, ADR 0008) as its own file,
// /data/v1/roots/<QUL Root id>.json: its letters, Lemmas and Spellings, read
// from Neon (#173), so the file keeps its shape and bytes. None is built ahead
// (ADR 0020): each is made on its first request and then served as a static
// file. The manifest names each file's hash. Any other address under
// /data/v1/roots is not found.

import { getRoot } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";
import { publishedResponse } from "../../respond";

export const dynamic = "force-static";

// None at build, when the database may not hold the Roots yet; any name reaches GET, which answers all but a Root's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/data/v1/roots/[file]">) {
  const { file } = await params;
  const id = numberFromFileName(file);
  // Only the name the manifest lists: `1.json`, never `01.json`.
  const root = numberedFileName(id) === file ? await getRoot(id) : undefined;
  if (!root) return new Response(null, { status: 404 });
  return publishedResponse(root);
}
