// Read, the Surah index of one Language (#193), at /{lang} on its Surahs tab and
// at /{lang}/juz on its Juz tab: the Reading places, then the Surahs and Juz
// tabs (surah-index.tsx). Its Surahs and Juz come from Neon (#172, #173, ADR 0049), so it is
// rendered on its first request in each Language, not at build, then served
// from the cache (ADR 0020), or the error page when Neon cannot answer; the
// search, the filter and the tabs run in the browser over the lists. Themes
// and Iltifat are reached from Explore (#192).

import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage, listJuz, listSurahs } from "@/dataset/reader";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import type { IndexTab } from "./index-tab";
import { SiteBar } from "./site-bar";
import { STRINGS } from "./strings";
import { SurahIndex } from "./surah-index";
import { UnavailablePage } from "./unavailable-page";
import styles from "./index.module.css";

export async function ReadPage({ lang, tab }: { lang: string; tab: IndexTab }) {
  if (!isLanguage(lang)) notFound();
  const lists = await orUnavailable(() => Promise.all([listSurahs(), listJuz()]));
  if (lists === UNAVAILABLE) return <UnavailablePage lang={lang} path={tab === "juz" ? "/juz" : ""} />;
  const [surahs, juz] = lists;
  return (
    <div className={styles.read}>
      <SiteBar lang={lang} path="" />
      <main className={styles.readStack}>
        <h1 className={styles.readTitle}>{STRINGS.indexTitle}</h1>
        <SurahIndex lang={lang} surahs={surahs} juz={juz} tab={tab} />
      </main>
      {/* The site documents in the page's Language, so following them keeps it (#192). */}
      <footer className={styles.footer}>
        <Link href={`/${lang}/privacy`}>{STRINGS.privacy}</Link>
        <span aria-hidden="true">·</span>
        <Link href={`/${lang}/terms`}>{STRINGS.terms}</Link>
      </footer>
    </div>
  );
}
