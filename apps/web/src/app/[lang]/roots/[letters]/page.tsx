// A Root page (#287, CONTEXT.md's Root page): one Root, addressed by its
// letters without their spaces (ADR 0065). Its header gives the Root's
// letters, transliteration, counts and Memorized? choice, then a row of its
// Lemmas, each leading to its section. One section per Lemma follows, in the
// Root dialog's order, the Words with no Lemma in a section of their own where
// the dialog puts them; in each, one part per Spelling with its meaning and
// count, and under it every Ayah it occurs in, in Quran order, through the
// shared Ayah list: each whole, in the reader's Script, with its Ayah
// translation while that is on, the Spelling's Words tinted, and a link to its
// first such Word in its Surah. On a Root of fifty occurrences or fewer every
// Spelling starts open, its Ayahs in the page; on a larger one each starts
// closed, and its Ayahs are fetched fifty at a time as it is opened (#288,
// ./spelling-section.tsx).
// It is a look-up: no Word cards, Recitation, Phrase colours or Known words
// colour, and it leaves the Reading places where they were. Read from Neon on
// its first request, never at build, then served from the cache (ADR 0020);
// when Neon cannot answer it is the error page instead (ADR 0040). Letters
// naming no Root are not found. It carries the site's default Link preview.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { spellingParts, spellingPartsAddress, spellingsStartOpen } from "@saaliheen/dataset/parts";
import { getRootByLetters, isLanguage, type Language, type Root, type Spelling } from "@/dataset/reader";
import { spellingPartOf, type SpellingPartAyah } from "@/roots/parts";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { InReadersScript } from "../../as-the-reader-sets";
import { BackToExplore } from "../../explore/back-to-explore";
import { Memorized } from "../../memorized";
import { SiteBar } from "../../site-bar";
import { inLanguage, STRINGS } from "../../strings";
import { UNAVAILABLE_METADATA, UnavailablePage } from "../../unavailable-page";
import indexStyles from "../../index.module.css";
import scriptStyles from "../../[surah]/script-text.module.css";
import { rootAddress } from "../root-path";
import styles from "./root-page.module.css";
import { SpellingSection } from "./spelling-section";

// Any params reach the page, and load leaves any but a Language and a Root's
// letters not found (ADR 0024); none is rendered at build, which runs without
// Neon (ADR 0020).
export const dynamicParams = true;
export const generateStaticParams = (): { lang: string; letters: string }[] => [];

/** The letters as the address writes them, percent-encoded as Next.js passes them on; undefined when that is not a whole encoding. */
function decodedLetters(written: string): string | undefined {
  try {
    return decodeURIComponent(written);
  } catch {
    return undefined;
  }
}

/**
 * Every Spelling's one part of `root`'s Ayahs in `lang`, Lemma by Lemma, when
 * its Spellings start open (spellingsStartOpen); none when they start closed.
 */
async function arrivingWith(root: Root, lang: Language): Promise<SpellingPartAyah[][][] | undefined> {
  if (!spellingsStartOpen(root.occurrences)) return undefined;
  return Promise.all(root.lemmas.map((lemma, l) => Promise.all(lemma.spellings.map(async (_, s) => (await spellingPartOf(root, lang, l + 1, s + 1, 1))!))));
}

/** The page's Language and Root, or UNAVAILABLE in place of the Root when Neon cannot answer. */
async function load(params: PageProps<"/[lang]/roots/[letters]">["params"]) {
  const { lang, letters: written } = await params;
  if (!isLanguage(lang)) notFound();
  const letters = decodedLetters(written);
  if (letters === undefined) notFound();
  const root = await orUnavailable(() => getRootByLetters(letters));
  if (!root) notFound();
  return { lang, letters, root } as const;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/roots/[letters]">): Promise<Metadata> {
  const { root } = await load(params);
  if (root === UNAVAILABLE) return UNAVAILABLE_METADATA;
  return { title: `${root.letters} · ${STRINGS.rootLabel} · ${STRINGS.brand}` };
}

/** The id of the section of the Root's Lemma at index `l`, to which the Lemma row leads; it counts from 1. */
const lemmaId = (l: number) => `lemma-${l + 1}`;

export default async function RootPage({ params }: PageProps<"/[lang]/roots/[letters]">) {
  const { lang, letters, root } = await load(params);
  const shown = root === UNAVAILABLE ? UNAVAILABLE : await orUnavailable(() => arrivingWith(root, lang));
  if (root === UNAVAILABLE || shown === UNAVAILABLE) return <UnavailablePage lang={lang} path={rootAddress(letters)} />;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={rootAddress(root.letters)} />
      <main className={styles.page}>
        <RootHeader lang={lang} root={root} />
        {root.lemmas.map((lemma, l) => (
          <section key={l} id={lemmaId(l)} className={styles.lemma} aria-labelledby={`${lemmaId(l)}-heading`}>
            <h2 id={`${lemmaId(l)}-heading`} className={styles.lemmaHeading}>
              <LemmaName text={lemma.text} />
              <span className={styles.count}>{STRINGS.times(lemma.occurrences)}</span>
              <span className={styles.meaning} {...inLanguage(lang)}>
                {lemma.meaning[lang] || STRINGS.noMeaning}
              </span>
            </h2>
            {lemma.spellings.map((spelling, s) => (
              <SpellingSection
                key={spelling.locations[0]}
                lang={lang}
                section={lemmaId(l)}
                address={spellingPartsAddress(lang, root.id, l + 1, s + 1)}
                partCount={spellingParts(spelling.locations).length}
                arrivedWith={shown?.[l][s]}
                heading={<SpellingHeading lang={lang} spelling={spelling} />}
              />
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

/** A Lemma, or the words for the section of the Words with none. */
function LemmaName({ text }: { text: string | null }) {
  return text === null ? (
    <span className={styles.noLemma}>{STRINGS.withoutLemma}</span>
  ) : (
    <span className={styles.lemmaText} lang="ar" dir="rtl">
      {text}
    </span>
  );
}

/** The Root's letters, transliteration, counts and Memorized? choice, and the row of its Lemmas. */
function RootHeader({ lang, root }: { lang: Language; root: Root }) {
  return (
    <header className={styles.header}>
      <BackToExplore lang={lang} />
      <div className={styles.lab}>{STRINGS.rootLabel}</div>
      <div className={styles.headRow}>
        <h1 className={styles.letters} lang="ar">
          {root.letters}
        </h1>
        <Memorized entry={{ kind: "root", text: root.letters }} />
      </div>
      <p className={styles.translit} dir="ltr" lang="ar-Latn">
        {root.transliteration}
      </p>
      <p className={styles.stat}>{STRINGS.rootCounts(root.occurrences, root.uniqueWords)}</p>
      <nav aria-label={STRINGS.lemmasTitle}>
        <ul className={styles.lemmaRow}>
          {root.lemmas.map((lemma, l) => (
            <li key={l}>
              <a className={styles.lemmaLink} href={`#${lemmaId(l)}`}>
                <LemmaName text={lemma.text} />
                <span className={styles.count}>{STRINGS.times(lemma.occurrences)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/** A Spelling in the reader's Script, its meaning and its count. */
function SpellingHeading({ lang, spelling }: { lang: Language; spelling: Spelling }) {
  const text = (script: "uthmani" | "indopak") => (
    <span className={`${styles.spellingText} ${scriptStyles[script]}`} lang="ar" dir="rtl">
      {spelling[script]}
    </span>
  );
  return (
    <>
      <InReadersScript uthmani={text("uthmani")} indopak={text("indopak")} />
      <span className={styles.meaning} {...inLanguage(lang)}>
        {spelling.meaning[lang] || STRINGS.noMeaning}
      </span>
      <span className={styles.count}>{STRINGS.times(spelling.locations.length)}</span>
    </>
  );
}
