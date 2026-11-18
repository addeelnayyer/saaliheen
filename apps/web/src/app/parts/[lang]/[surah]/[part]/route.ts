// Each part of each Surah in each Language as its own static JSON file at
// /parts/<lang>/<Surah>/<part>.json (partUrl in @saaliheen/dataset/parts, which
// the browser fetches by), made from the Quran in Neon (#172) on its first
// request, not at build, and then served from the cache (#170, ADR 0020). A Surah opened from inside the app shows at once and
// fills in from these files, one part after another (#24); a direct load of
// the Surah page never uses them. Any other address under /parts is not found.
// Each part's Words carry their Allah references (#147), read through the data
// module under the Surah's cache tag, as the Surah page reads them. Each Ayah
// carries its Iltifat chips (#140), read under the Iltifat overview's tag, and
// its Themes, read from Neon under the Themes' tag (#170), and its Passages and
// Phrase colours, read from Neon under the Surah's Passage tag (#171). When Neon
// cannot answer, the part fails and the page's own Retry asks again (ADR 0040).
// With the Tafsir switch on, the last Ayah of each Passage carries the
// Passage's Tafsir in the Language (#234), read under the Surah's Tafsir tag;
// a part whose Tafsir Neon cannot give is made without it.

import { withAllahReferences } from "@/allah-references/mark";
import { withIltifatChips } from "@/iltifat/mark";
import { partFromFileName } from "@saaliheen/dataset/parts";
import { passagesInLanguage, surahPartWithPassages } from "@/passages/on-pages";
import { withTafsir } from "@/tafsir/mark";
import { withThemes } from "@/themes/on-pages";
import { TAFSIR } from "../../../../[lang]/release";
import { surahAddress } from "../../../../[lang]/[surah]/surah-address";

export const dynamic = "force-static";
// Any params reach GET, which answers any but a Surah's part not found: with
// dynamicParams false, a part whose cache tag a save refreshed would be not
// found until the next deploy (ADR 0024).
export const dynamicParams = true;

// None at build, which runs without Neon (ADR 0020); each is made on its first request.
export const generateStaticParams = (): { lang: string; surah: string; part: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/parts/[lang]/[surah]/[part]">) {
  const { lang, surah, part } = await params;
  const address = surahAddress(lang, surah);
  const ayahs = address && (await surahPartWithPassages(address.lang, address.surah, partFromFileName(part)));
  if (!address || !ayahs) return new Response(null, { status: 404 });
  const themed = await withThemes(address.surah, ayahs);
  const marked = await withIltifatChips(address.surah, await withAllahReferences(address.surah, themed));
  if (!TAFSIR) return Response.json(marked);
  const passages = await passagesInLanguage(address.surah, address.lang);
  return Response.json(await withTafsir(address.surah, address.lang, marked, passages));
}
