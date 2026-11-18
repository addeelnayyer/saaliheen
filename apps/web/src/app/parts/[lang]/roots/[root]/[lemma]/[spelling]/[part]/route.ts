// Each part of each Spelling's Ayahs on a Root page (#288), in each Language,
// as its own static JSON file at
// /parts/<lang>/roots/<Root id>/<Lemma>/<Spelling>/<part>.json
// (spellingPartsAddress and partUrl in @saaliheen/dataset/parts), beside the
// Surah, Theme and Grammar parts (ADR 0005, 0014, 0066). A large Root's page
// arrives with every Spelling closed and fetches a Spelling's parts, from the
// first, as it is opened and as "Show more" asks; a small Root's page arrives
// with them all and never uses these. Lemma and Spelling count from 1 in the
// Root's order. The Root and its Ayahs are read from Neon (src/roots/parts.ts);
// each file is made on its first request, not at build, then served from the
// cache (ADR 0020). When Neon cannot answer, the part fails and the Spelling's
// own Retry asks again (ADR 0040).

import { canonicalPartFromFileName } from "@saaliheen/dataset/parts";
import { getRoot, isLanguage } from "@/dataset/reader";
import { spellingPartOf } from "@/roots/parts";

export const dynamic = "force-static";
// Any params reach GET, which answers any but a Spelling part not found (ADR 0024).
export const dynamicParams = true;

// None at build, which runs without Neon (ADR 0020); each is made on its first request.
export const generateStaticParams = (): { lang: string; root: string; lemma: string; spelling: string; part: string }[] => [];

/** A count from 1 as an address writes it, `3` and never `03`; undefined for any other text. */
const counted = (text: string) => (/^[1-9]\d{0,5}$/.test(text) ? Number(text) : undefined);

export async function GET(_request: Request, { params }: RouteContext<"/parts/[lang]/roots/[root]/[lemma]/[spelling]/[part]">) {
  const { lang, root: id, lemma, spelling, part } = await params;
  const [rootId, l, s] = [counted(id), counted(lemma), counted(spelling)];
  const number = canonicalPartFromFileName(part);
  if (!isLanguage(lang) || !rootId || !l || !s || !number) return new Response(null, { status: 404 });
  const root = await getRoot(rootId);
  const ayahs = root && (await spellingPartOf(root, lang, l, s, number));
  if (!ayahs) return new Response(null, { status: 404 });
  return Response.json(ayahs);
}
