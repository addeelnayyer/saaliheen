// Explore (#192): every way to look into the Quran other than reading it in
// order, one card each in a fixed order, Themes, Roots (#290), Iltifat,
// Supplications (#199), Quran Chat (#78), then Quran Grammar (#279), which
// opens at Al-Fatihah's Grammar page, with the Grammar guide (#280) linked
// under it. A card has its name, one line in the reader's Language saying
// what it is for, and, but for Quran Chat and Quran Grammar, a live count:
// the Theme categories, read from Neon (#170, src/themes/), the Roots, read
// from Neon with the Quran (#173), the Iltifat directions, and the
// Supplications, read from Neon under the Supplications tag (#199,
// src/supplications/). Rendered on its first request in each Language, not at
// build, then served from the cache (ADR 0020), or the error page when Neon
// cannot answer.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage, listRootRows, type Language } from "@/dataset/reader";
import { cachedEverySupplication } from "@/supplications/cached";
import { isSupplication } from "@/supplications/supplications";
import { cachedThemeIndex } from "@/themes/cached";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { ILTIFAT_DIRECTIONS } from "@/iltifat/iltifat";
import { grammarGuidePath, grammarPath } from "../grammar/grammar-path";
import { iltifatPath } from "../iltifat/iltifat-path";
import { quranChatPath } from "../quran-chat/quran-chat-path";
import { rootsListPath } from "../roots/root-path";
import { SiteBar } from "../site-bar";
import { EXPLORE_LINES, inLanguage, STRINGS } from "../strings";
import { supplicationsPath } from "../supplications/supplications-path";
import { themesListPath } from "../themes/theme-path";
import { UnavailablePage } from "../unavailable-page";
import indexStyles from "../index.module.css";
import styles from "./explore.module.css";

// None at build, which runs without Neon (ADR 0020); any Language reaches the
// page, which leaves all but the site's not found (ADR 0024).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string }[] => [];

export const metadata: Metadata = { title: `${STRINGS.explore} · ${STRINGS.brand}` };

interface Card {
  name: string;
  line: Record<Language, string>;
  /** Quran Chat has none: it answers, it does not list; nor has Quran Grammar, which is every Surah. */
  count?: string;
  href: (lang: Language) => string;
  /** A link of its own under the card: Quran Grammar's to the Grammar guide (#280). */
  more?: { name: string; href: (lang: Language) => string };
  /** Not prefetched: the Roots list, the Iltifat overview, the Supplications page and the Grammar pages are rendered on request, from the database. */
  prefetch?: false;
}

/** The cards' three counts read from Neon, all or none: the Supplications counted as their page lists them, Other words to Allah left out. */
const readCounts = async () => {
  const [index, roots, { supplications }] = await Promise.all([cachedThemeIndex(), listRootRows(), cachedEverySupplication()]);
  return { categories: index.categories.length, roots: roots.length, supplications: supplications.filter(isSupplication).length };
};

const CARDS = ({ categories, roots, supplications }: Awaited<ReturnType<typeof readCounts>>): Card[] => [
  { name: STRINGS.themes, line: EXPLORE_LINES.themes, count: STRINGS.categoriesCount(categories), href: themesListPath },
  { name: STRINGS.roots, line: EXPLORE_LINES.roots, count: STRINGS.rootsCount(roots), href: rootsListPath, prefetch: false },
  { name: STRINGS.iltifat, line: EXPLORE_LINES.iltifat, count: STRINGS.directionsCount(ILTIFAT_DIRECTIONS.length), href: iltifatPath, prefetch: false },
  { name: STRINGS.supplications, line: EXPLORE_LINES.supplications, count: STRINGS.supplicationsCount(supplications), href: supplicationsPath, prefetch: false },
  { name: STRINGS.quranChat, line: EXPLORE_LINES.quranChat, href: quranChatPath },
  { name: STRINGS.quranGrammar, line: EXPLORE_LINES.quranGrammar, href: (lang) => grammarPath(lang, 1), prefetch: false, more: { name: STRINGS.grammarGuide, href: grammarGuidePath } },
];

export default async function ExplorePage({ params }: PageProps<"/[lang]/explore">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const counts = await orUnavailable(readCounts);
  if (counts === UNAVAILABLE) return <UnavailablePage lang={lang} path="/explore" />;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/explore" />
      <main className={styles.page}>
        <h1 className={indexStyles.title}>{STRINGS.explore}</h1>
        <ul className={styles.cards}>
          {CARDS(counts).map((card) => (
            <li key={card.name} className={card.more && styles.withMore}>
              <Link className={styles.card} href={card.href(lang)} prefetch={card.prefetch}>
                <span className={styles.name}>{card.name}</span>
                <span className={styles.line} {...inLanguage(lang)}>
                  {card.line[lang]}
                </span>
                {card.count && <span className={styles.count}>{card.count}</span>}
              </Link>
              {card.more && (
                <Link className={styles.more} href={card.more.href(lang)}>
                  {card.more.name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
