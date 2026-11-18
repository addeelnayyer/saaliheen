// A Tafsir load's refresh (#233, ADR 0054), POST /api/v1/tafsir/reloads:
// `pnpm db:load-tafsir` runs outside the site, so it cannot refresh the cache
// itself; it asks here, with the JSON body { surahs }, the Surahs to refresh
// (every Surah when none are named), and the deployment's
// TAFSIR_RELOAD_SECRET as a bearer token. Each Surah's Tafsir tag is
// refreshed, so its Tafsir is read from Neon again on its next request, and
// it answers 200 { surahs }. It writes nothing. A request without the secret,
// or to a deployment with none set, answers 401, and a body that is not
// { surahs } 400, both with { error }.

import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { tafsirTag } from "@/tafsir/cached";
import { apiError, apiJson } from "../../respond";
import { isSurahNumber } from "@/dataset/reader";

const NOT_ALLOWED = "send the deployment's Tafsir reload secret as a bearer token";
const NOT_A_RELOAD = "send a JSON object: surahs, a list of Surah numbers from 1 to 114, or none for every Surah";
const EVERY_SURAH = Array.from({ length: 114 }, (_, i) => i + 1);

/** Whether `authorization` carries the deployment's secret; never when it has none. */
function allowed(authorization: string | null): boolean {
  const secret = process.env.TAFSIR_RELOAD_SECRET;
  const token = /^bearer (.+)$/i.exec(authorization ?? "")?.[1];
  if (!secret || !token) return false;
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(token), digest(secret));
}

/** The Surahs `body` names; every Surah when it names none; undefined when it is not { surahs }. */
function surahsOf(body: unknown): number[] | undefined {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return undefined;
  const { surahs } = body as { surahs?: unknown };
  if (surahs === undefined) return EVERY_SURAH;
  if (!Array.isArray(surahs)) return undefined;
  return surahs.every((surah) => typeof surah === "number" && isSurahNumber(surah)) ? [...new Set<number>(surahs)] : undefined;
}

export async function POST(request: Request) {
  if (!allowed(request.headers.get("authorization"))) return apiError(401, NOT_ALLOWED);
  const surahs = surahsOf(await request.json().catch(() => undefined));
  if (!surahs) return apiError(400, NOT_A_RELOAD);
  for (const surah of surahs) revalidateTag(tafsirTag(surah), { expire: 0 });
  return apiJson({ surahs });
}
