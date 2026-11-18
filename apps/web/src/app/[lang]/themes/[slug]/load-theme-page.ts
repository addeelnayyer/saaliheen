// A Theme page's params as the whole Theme page and the one opened in parts
// read them (ADR 0024): anything but a Language and a Theme's slug is not
// found, and the Theme page is UNAVAILABLE when Neon cannot answer (ADR 0020).

import { notFound } from "next/navigation";
import { isLanguage } from "@/dataset/reader";
import { readThemePage } from "@/themes/on-pages";
import { orUnavailable } from "@/themes/unavailable";

export async function loadThemePage(params: Promise<{ lang: string; slug: string }>) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();
  const page = await orUnavailable(() => readThemePage(slug));
  if (!page) notFound();
  return { lang, slug, page } as const;
}
