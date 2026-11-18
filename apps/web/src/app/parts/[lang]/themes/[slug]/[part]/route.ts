// Each Theme part but the first, of each Theme page in each Language, as its
// own static JSON file at /parts/<lang>/themes/<slug>/<part>.json
// (themePartsAddress and partUrl in @saaliheen/dataset/parts), as the Surah
// parts are beside it (ADR 0005, 0014). Its Theme is read from Neon (#170,
// src/themes/), its Ayahs from Neon's Quran (#172, src/quran/); each file is made on its
// first request, not at build, then served from the cache (ADR 0020). A Theme
// page opened from inside the app arrives with its first part and fills in
// from these files, part 2 onwards (#131), so part 1 has no file; a direct
// load of the Theme page never uses them.

import { laterPartFromFileName } from "@saaliheen/dataset/parts";
import { isLanguage } from "@/dataset/reader";
import { readThemePage, themePartOf } from "@/themes/on-pages";

export const dynamic = "force-static";

// None at build, which runs without Neon (ADR 0020); any params reach GET, which answers all but a Theme part from the second on not found.
export const generateStaticParams = (): { lang: string; slug: string; part: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/parts/[lang]/themes/[slug]/[part]">) {
  const { lang, slug, part } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const page = await readThemePage(slug);
  const number = laterPartFromFileName(part);
  const groups = page && number && (await themePartOf(page, lang, number));
  if (!groups) return new Response(null, { status: 404 });
  return Response.json(groups);
}
