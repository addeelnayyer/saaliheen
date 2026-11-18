// The credits, in English whatever the Language: where the Quran text, Word
// meanings, Ayah translations, Word grammar and typefaces come from. Every
// source is taken from Tarteel's Quranic Universal Library (ADR 0001), except
// the Word grammar, the Urdu Tafsir and the Urdu typeface, Dubai (#339), the
// Dubai Executive Council's. The Word grammar is the Quranic Arabic
// Corpus's, as its terms of use ask: named, with its copyright notice and a
// link to corpus.quran.com (#274, ADR 0064). With the Tafsir switch on (#234),
// al-Mukhtasar is named in full: its authors and both its editions (ADR 0053).

import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Language } from "@/dataset/reader";
import { SiteBar } from "../site-bar";
import { STRINGS, TRANSLATOR } from "../strings";
import { TAFSIR } from "../release";
import indexStyles from "../index.module.css";
import styles from "./credits.module.css";
import { languageParams } from "../language-params";

/** The Word grammar's credit (#274): the Corpus, the corrected copy used, the licence, and the Corpus's copyright notice. */
const WORD_GRAMMAR_CREDIT = {
  what: "Word grammar",
  who: (
    <>
      the Quranic Arabic Corpus (version 0.4, <a href="https://corpus.quran.com">https://corpus.quran.com</a>), as corrected in mustafa0x/quran-morphology (
      <a href="https://github.com/mustafa0x/quran-morphology">https://github.com/mustafa0x/quran-morphology</a>), used under the GNU General Public License.
      <small>Quranic Arabic Corpus (morphology, version 0.4). Copyright (C) 2011 Kais Dukes. License: GNU General Public License.</small>
    </>
  ),
};

const CREDITS: { what: string; who: ReactNode }[] = [
  { what: "Word meanings, Roots, Lemmas and Surah details", who: "QUL by Tarteel" },
  { what: "Uthmani Script text and typeface (QPC Hafs)", who: "King Fahd Glorious Quran Printing Complex (KFGQPC)" },
  { what: "Indo-Pak Script text and typeface", who: "Digital Khatt Indopak" },
  { what: "Urdu typeface (Dubai)", who: "Dubai Executive Council" },
  { what: "Urdu Ayah translation", who: TRANSLATOR.ur },
  { what: "English Ayah translation", who: TRANSLATOR.en },
  WORD_GRAMMAR_CREDIT,
];

/** Al-Mukhtasar (#234), named once the Tafsir is shown to readers. */
const TAFSIR_CREDIT = {
  what: "Tafsir: al-Mukhtasar fi Tafsir al-Quran al-Karim",
  who: "Written and reviewed by a committee at the Tafsir Center for Quranic Studies; English edition from QUL by Tarteel, Urdu edition from mokhtasr.com",
};

const SHOWN = TAFSIR ? [...CREDITS, TAFSIR_CREDIT] : CREDITS;

/** Where the site's Quran data comes from, as the page opens. */
const INTRO = TAFSIR
  ? "All Quran data on this site comes from Tarteel's Quranic Universal Library (QUL), except the Word grammar and the Urdu Tafsir."
  : "All Quran data on this site comes from Tarteel's Quranic Universal Library (QUL), except the Word grammar.";

// Prerendered in each Language; any other is a 404.
export const dynamicParams = false;
export const generateStaticParams = languageParams;

export const metadata: Metadata = { title: `${STRINGS.credits} · ${STRINGS.brand}` };

export default async function CreditsPage({ params }: PageProps<"/[lang]/credits">) {
  const lang = (await params).lang as Language;

  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/credits" />
      <main className={indexStyles.stack}>
        <h1 className={indexStyles.title}>{STRINGS.credits}</h1>
        <p className={styles.intro}>{INTRO}</p>
        <dl className={styles.list}>
          {SHOWN.map((item) => (
            <div key={item.what} className={styles.item}>
              <dt>{item.what}</dt>
              <dd>{item.who}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.intro}>We are grateful to all of them.</p>
      </main>
    </div>
  );
}
