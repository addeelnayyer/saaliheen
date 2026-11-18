// Each particle of the published dataset (#249, ADR 0008) as its own file,
// /data/v1/particles/<number>.json, beside the Root files: its kind, text and
// Spellings, read from Neon, so the file keeps its shape and bytes. None is
// built ahead (ADR 0020): each is made on its first request and then served as
// a static file. The manifest's dataset version covers each file's hash. Any
// other address under /data/v1/particles is not found.

import { getParticle } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";
import { publishedResponse } from "../../respond";

export const dynamic = "force-static";

// None at build, when the database may not hold the particles yet; any name reaches GET, which answers all but a particle's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/data/v1/particles/[file]">) {
  const { file } = await params;
  const id = numberFromFileName(file);
  // Only the name a particle tag numbers: `1.json`, never `01.json`.
  const particle = numberedFileName(id) === file ? await getParticle(id) : undefined;
  if (!particle) return new Response(null, { status: 404 });
  return publishedResponse(particle);
}
