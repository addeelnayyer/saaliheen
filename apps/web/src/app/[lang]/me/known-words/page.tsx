// The Known words page on Me (#248, #251): every Root, in Arabic letter order,
// on its Roots tab, and every particle, most frequent first, on its Particles
// tab, each with its meanings in the page's Language and the reader's
// Memorized? choice, searchable by its Arabic letters or those meanings, under
// the count of the reader's Known Roots and Known particles. Both come from
// Neon, so it is rendered on its first request in each Language, then served
// from the cache (ADR 0020), or the error page when Neon cannot answer: the
// marks, which only the browser knows, fill in once it runs.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compareRootLetters } from "@saaliheen/known-words";
import { isLanguage, listParticles, listRoots } from "@/dataset/reader";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { SiteBar } from "../../site-bar";
import { STRINGS } from "../../strings";
import { UnavailablePage } from "../../unavailable-page";
import { KnownWordsTabs } from "./known-words-tabs";
import indexStyles from "../../index.module.css";
import styles from "./known-words.module.css";

// None at build, which runs without Neon (ADR 0020); any Language reaches the
// page, which leaves all but the site's not found (ADR 0024).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string }[] => [];

export const metadata: Metadata = { title: `${STRINGS.knownWords} · ${STRINGS.brand}` };

export default async function KnownWordsPage({ params }: PageProps<"/[lang]/me/known-words">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const listed = await orUnavailable(() => Promise.all([listRoots(), listParticles()]));
  if (listed === UNAVAILABLE) return <UnavailablePage lang={lang} path="/me/known-words" />;
  const [listedRoots, listedParticles] = listed;
  const roots = listedRoots
    .map(({ letters, meanings }) => ({ letters, meanings: meanings[lang] }))
    .sort((a, b) => compareRootLetters(a.letters, b.letters));
  const particles = listedParticles.map(({ kind, text, indopak, meanings }) => ({ kind, text, indopak, meanings: meanings[lang] }));
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/me/known-words" />
      <main className={styles.page}>
        <h1 className={indexStyles.title}>{STRINGS.knownWords}</h1>
        <KnownWordsTabs lang={lang} roots={roots} particles={particles} />
      </main>
    </div>
  );
}
