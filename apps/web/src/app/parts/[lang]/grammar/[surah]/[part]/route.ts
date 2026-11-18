// Each Grammar part but the first, of each Grammar page in each Language, as
// its own static JSON file at /parts/<lang>/grammar/<Surah>/<part>.json
// (grammarPartsAddress and partUrl in @saaliheen/dataset/parts), beside the
// Surah and Theme parts (ADR 0005, 0014). A Grammar page arrives with its first
// part and fills in from these files, part 2 onwards (#278, ADR 0066), so part
// 1 has no file. Its Ayahs, Passages and Word grammar are read from Neon
// (src/grammar/parts.ts); each file is made on its first request, not at build,
// then served from the cache (ADR 0020). When Neon cannot answer, the part
// fails and the page's own Retry asks again (ADR 0040).

import { laterPartFromFileName } from "@saaliheen/dataset/parts";
import { grammarPartOf } from "@/grammar/parts";
import { surahAddress } from "../../../../../[lang]/[surah]/surah-address";

export const dynamic = "force-static";
// Any params reach GET, which answers any but a Grammar part from the second on not found (ADR 0024).
export const dynamicParams = true;

// None at build, which runs without Neon (ADR 0020); each is made on its first request.
export const generateStaticParams = (): { lang: string; surah: string; part: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/parts/[lang]/grammar/[surah]/[part]">) {
  const { lang, surah, part } = await params;
  const address = surahAddress(lang, surah);
  const number = laterPartFromFileName(part);
  const ayahs = address && number && (await grammarPartOf(address.surah, address.lang, number));
  if (!ayahs) return new Response(null, { status: 404 });
  return Response.json(ayahs);
}
