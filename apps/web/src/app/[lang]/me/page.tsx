// Me (#192): what belongs to the reader rather than the Quran, in order: Sign
// in (or the Account, and the admin area for an Admin), their Reading places,
// a link to their Known words (#248), their Language, every reader setting the
// Reading settings sheet holds, then Credits, Privacy and Terms. Its Surah
// names come from Neon (#172), so it is rendered on its first request in each
// Language, then served from the cache (ADR 0020), or the error page when Neon
// cannot answer: what only the browser knows (the session, the Reading places)
// fills in once it runs.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLanguage, listSurahs } from "@/dataset/reader";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { LanguageSwitch } from "../language-link";
import { ReaderSettingsControls } from "../settings-drawer";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import { UnavailablePage } from "../unavailable-page";
import { MeAccount } from "./me-account";
import { MeReadingPlaces } from "./me-reading-places";
import indexStyles from "../index.module.css";
import styles from "./me.module.css";

// None at build, which runs without Neon (ADR 0020); any Language reaches the
// page, which leaves all but the site's not found (ADR 0024).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string }[] => [];

export const metadata: Metadata = { title: `${STRINGS.me} · ${STRINGS.brand}` };

/** Me's site documents, in order. */
const DOCUMENTS = ["credits", "privacy", "terms"] as const;

export default async function MePage({ params }: PageProps<"/[lang]/me">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const listed = await orUnavailable(listSurahs);
  if (listed === UNAVAILABLE) return <UnavailablePage lang={lang} path="/me" />;
  const surahs = listed.map(({ number, nameLatin, ayahCount }) => ({ number, nameLatin, ayahCount }));
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/me" />
      <main className={styles.page}>
        <h1 className={indexStyles.title}>{STRINGS.me}</h1>
        <section className={styles.section}>
          <MeAccount lang={lang} />
        </section>
        <section className={styles.section}>
          <h2 className={styles.heading}>{STRINGS.readingPlaces}</h2>
          <MeReadingPlaces lang={lang} surahs={surahs} />
        </section>
        <section className={styles.section} aria-label={STRINGS.knownWords}>
          <ul className={styles.list}>
            <li>
              <Link className={styles.entry} href={`/${lang}/me/known-words`}>
                {STRINGS.knownWords}
              </Link>
            </li>
          </ul>
        </section>
        <section className={styles.section}>
          <LanguageSwitch lang={lang} hrefs={{ ur: "/ur/me", en: "/en/me" }} />
        </section>
        <section className={styles.section} aria-label={STRINGS.settings}>
          <ReaderSettingsControls className={styles.settings} />
        </section>
        <section className={styles.section} aria-label={STRINGS.about}>
          <ul className={styles.list}>
            {/* Privacy and Terms are in English in both Languages; their addresses keep the reader's. */}
            {DOCUMENTS.map((document) => (
              <li key={document}>
                <Link className={styles.entry} href={`/${lang}/${document}`}>
                  {STRINGS[document]}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
