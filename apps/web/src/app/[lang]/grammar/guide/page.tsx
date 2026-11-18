// The Grammar guide (#280): how to read a Grammar page, for a reader who does
// not know Arabic grammar yet. The three Part of speech colours, the three
// Cases, the Aspects, the Verb forms with their patterns, and every kind of
// Ism and Harf a Grammar line names, each label in English with its Arabic
// term beside it and drawn in its Part of speech colour, as on a Grammar
// line, then what it means (src/grammar/guide.ts, from the same grammar terms
// as the Grammar line and the Word grammar dialog). English in either
// Language, as a Grammar page's labels are. Every Grammar page links here, as
// does Quran Grammar's Explore card; it leads back to Explore. Prerendered in
// each Language, with the site's default Link preview; any other is a 404.

import type { Metadata } from "next";
import type { Language } from "@/dataset/reader";
import { GRAMMAR_GUIDE } from "@/grammar/guide";
import { BackToExplore } from "../../explore/back-to-explore";
import { languageParams } from "../../language-params";
import { SiteBar } from "../../site-bar";
import { STRINGS } from "../../strings";
import indexStyles from "../../index.module.css";
import styles from "./guide.module.css";

export const dynamicParams = false;
export const generateStaticParams = languageParams;

export const metadata: Metadata = { title: `${STRINGS.grammarGuide} · ${STRINGS.brand}` };

export default async function GrammarGuidePage({ params }: PageProps<"/[lang]/grammar/guide">) {
  const lang = (await params).lang as Language;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/grammar/guide" />
      <main className={styles.page}>
        <BackToExplore lang={lang} />
        <h1 className={indexStyles.title}>{STRINGS.grammarGuide}</h1>
        <p className={styles.intro}>
          A Grammar page sets out a Surah Word by Word. Under each Word&apos;s Arabic and its meaning is its Grammar line: one short label saying what
          kind of Word it is, in English with the Arabic grammarians&apos; term beside it, as Genitive · <span lang="ar">مَجْرُور</span>. Tap a Word
          for its Word grammar: every piece it is built from, with all its features. A Word whose grammar is not known yet shows{" "}
          {STRINGS.noWordGrammar} instead.
        </p>
        {GRAMMAR_GUIDE.map((section) => (
          <section key={section.id} className={styles.section} aria-labelledby={section.id}>
            <h2 id={section.id} className={styles.heading}>
              {section.title}
            </h2>
            <p className={styles.intro}>{section.intro}</p>
            <dl className={styles.entries} data-section={section.id}>
              {section.entries.map((entry) => (
                <div key={entry.en} className={styles.entry} data-part-of-speech={entry.partOfSpeech}>
                  <dt className={styles.label}>
                    {entry.en}
                    {" · "}
                    <span lang="ar">{entry.ar}</span>
                  </dt>
                  <dd className={styles.meaning}>
                    {entry.say && <span className={styles.say}>{entry.say}: </span>}
                    {entry.meaning}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </main>
    </div>
  );
}
