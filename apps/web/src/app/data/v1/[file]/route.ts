// The files directly under /data/v1 (#65, ADR 0008): the Surah index,
// /data/v1/surahs.json, every Surah without its Ayahs, read from Neon (#172);
// each Script's Juz list, /data/v1/juz.json (#193, ADR 0021):
// `{ uthmani: Juz[], indopak: Juz[] }`, 30 Juz each with its number, its name
// in that Script and its first and last Ayah, read from Neon (#173); every
// Root, /data/v1/roots.json (#253): each Root's letters and its Lemmas'
// meanings in each Language, by ascending QUL id, as the website's Known words
// page lists them (#248), for the app's Known words page; every particle,
// /data/v1/particles.json (#255): each particle's number, kind, text, Indo-Pak
// text and its Spellings' meanings in each Language, by number, as the
// website's Known words page lists them (#251), for the app's Particles tab;
// and the manifest, /data/v1/manifest.json: every Surah file with the hash of
// its bytes, the dataset's version and the minimum app version still
// supported, so an installed app can tell which of its offline Surahs a deploy
// has made stale. None is built ahead (ADR 0020, ADR 0040), when the build
// may have no database: the route takes its name as a param, which the build
// lists none of, so each is made on its first request from the data cache
// (src/quran/cached.ts, src/themes/published.ts) and then served as a static
// file, the manifest until the Themes' tag or a Surah's Passage tag is
// refreshed. Any other name directly under /data/v1 is not found.

import { listJuz, listParticles, listRoots, listSurahs } from "@/dataset/reader";
import { publishedManifest } from "@/themes/published";
import { publishedResponse } from "../respond";

export const dynamic = "force-static";

/** What each name this route answers serves. */
const FILES: Record<string, () => Promise<unknown>> = {
  "surahs.json": listSurahs,
  "juz.json": listJuz,
  "roots.json": listRoots,
  "particles.json": listParticles,
  "manifest.json": publishedManifest,
};

// None at build, when the database may not hold the Quran yet; any name reaches GET, which answers all but these not found.
export const generateStaticParams = (): { file: string }[] => [];

export async function GET(_request: Request, { params }: RouteContext<"/data/v1/[file]">) {
  const { file } = await params;
  if (!Object.hasOwn(FILES, file)) return new Response(null, { status: 404 });
  return publishedResponse(await FILES[file]());
}
