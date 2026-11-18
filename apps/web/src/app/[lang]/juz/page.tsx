// Read, the Surah index of one Language, on its Juz tab (#193): see ../read-page.tsx.

import type { Metadata } from "next";
import { ReadPage } from "../read-page";
import { STRINGS } from "../strings";

// None at build, which runs without Neon (ADR 0020); any Language reaches the
// page, which leaves all but the site's not found (ADR 0024).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string }[] => [];

export const metadata: Metadata = { title: `${STRINGS.juzTab} · ${STRINGS.indexTitle} · ${STRINGS.brand}` };

export default async function JuzIndexPage({ params }: PageProps<"/[lang]/juz">) {
  return <ReadPage lang={(await params).lang} tab="juz" />;
}
