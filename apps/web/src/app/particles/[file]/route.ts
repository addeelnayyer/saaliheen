// Each particle's dialog data as its own JSON file, /particles/<number>.json,
// read from Neon (#249). A Surah page holds only its Words' Particle tags and
// fetches a particle's file when its Particle dialog opens. None is built
// ahead (ADR 0020), when the build may have no database: each is made on its
// first request from the data cache (src/quran/cached.ts) and then served as a
// static file. Any other address under /particles is not found.

import { getParticle } from "@/dataset/reader";
import { numberFromFileName, numberedFileName } from "@saaliheen/dataset/published";

export const dynamic = "force-static";

// None at build, when the database may not hold the particles yet; any name reaches GET, which answers all but a particle's not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/particles/[file]">) {
  const { file } = await params;
  const id = numberFromFileName(file);
  // Only a particle's own name: `1.json`, never `01.json`.
  const particle = numberedFileName(id) === file ? await getParticle(id) : undefined;
  if (!particle) return new Response(null, { status: 404 });
  return Response.json(particle);
}
