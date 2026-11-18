// The Roots list (#290): every Root under its first letter, in Arabic
// alphabetical order, each with its transliteration, count of occurrences and
// a tick when it is a Known Root, leading to its Root page; a search narrows
// it by letters or transliteration (../../../roots/list.ts). Particles are not
// Roots, so it lists none, and it has no Memorized?: marking is left to the
// Root page, the Root dialog and the Known words page. The Roots are read from
// Neon, so the page is rendered on its first request in each Language, not at
// build, then served from the cache (ADR 0020), or is the error page when Neon
// cannot answer (ADR 0040): the ticks, which only the browser knows, fill in
// once it runs.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLanguage, listRootRows } from "@/dataset/reader";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { BackToExplore } from "../explore/back-to-explore";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import { UnavailablePage } from "../unavailable-page";
import indexStyles from "../index.module.css";
import { ROOTS_ADDRESS } from "./root-path";
import { RootsList } from "./roots-list";
import styles from "./roots-list.module.css";

// None at build, which runs without Neon (ADR 0020); any Language reaches the
// page, which leaves all but the site's not found (ADR 0024).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string }[] => [];

export const metadata: Metadata = { title: `${STRINGS.roots} · ${STRINGS.brand}` };

export default async function RootsListPage({ params }: PageProps<"/[lang]/roots">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const roots = await orUnavailable(listRootRows);
  if (roots === UNAVAILABLE) return <UnavailablePage lang={lang} path={ROOTS_ADDRESS} />;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={ROOTS_ADDRESS} />
      <main className={styles.page}>
        <BackToExplore lang={lang} />
        <div className={indexStyles.hero}>
          <h1 className={indexStyles.title}>{STRINGS.roots}</h1>
          <p className={indexStyles.sub}>{STRINGS.rootsCount(roots.length)}</p>
        </div>
        <RootsList lang={lang} roots={roots} />
      </main>
    </div>
  );
}
