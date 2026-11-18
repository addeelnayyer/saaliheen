// A Grammar page (#275): a Surah's Ayahs, each Word whole in the reader's
// Script with its Word meaning in the Language and its Grammar line beneath:
// an Ism's Case, a Fi'l's Aspect and Verb form, a Harf's kind, read from its
// Segments (@saaliheen/dataset/grammar), read as one line per Word. The Grammar line and an underline
// beneath the Word are drawn in its Part of speech colour; the Arabic letters
// stay the ink. It reads like a Surah page (#278): Ayahs under their Passage
// headings, each followed by its Ayah translation (./grammar-ayahs.tsx). It
// arrives with its first Grammar part and fills in the rest behind a skeleton
// (./grammar-in-parts.tsx, ADR 0066). The Quran, its Passages and its Word
// grammar are read from Neon (#172, ADR 0064); when Neon cannot answer the page
// is the error page. Rendered on its first request, not at build; any other
// address is a 404. Each Word is a button: it opens its Word grammar dialog
// (#277), which leads on to its Root dialog or Particle dialog.
//
// Getting around (#279): its head leads back to Explore, has the Surah picker,
// the link to the Grammar guide (#280) and the Language switch, which keeps
// the Surah (and a Word location); its foot names the previous and next
// Surahs, leading to their Grammar pages. A link to a Word location
// (`#s:a:w`, each Word's id) lands on that Word, marked, once its Grammar
// part has arrived (./word-target.tsx). It is studying, not reading: nothing
// here notes a Reading place or finishes a Surah, and there is no Recitation.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listSurahs } from "@/dataset/reader";
import { readGrammarOpening } from "@/grammar/parts";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { pageSurahAddress } from "../../[surah]/surah-address";
import { SurahFoot, surahMetadata } from "../../[surah]/surah-screen";
import { ParticleDialog } from "../../[surah]/particle-dialog";
import { RootDialog } from "../../[surah]/root-dialog";
import { BackToExplore } from "../../explore/back-to-explore";
import { LanguageSwitch } from "../../language-link";
import { SiteBar } from "../../site-bar";
import { STRINGS } from "../../strings";
import { UnavailablePage } from "../../unavailable-page";
import { grammarGuidePath, grammarPath } from "../grammar-path";
import indexStyles from "../../index.module.css";
import { GrammarAyahs } from "./grammar-ayahs";
import { GrammarInParts } from "./grammar-in-parts";
import { GrammarPicker } from "./grammar-picker";
import styles from "./grammar.module.css";
import { WordGrammarDialog } from "./word-grammar-dialog";

// Any params reach the page, and pageSurahAddress() leaves any but a Language and a Surah not found (ADR 0024).
export const dynamicParams = true;

// None at build, which runs without Neon (ADR 0020); each is rendered on its first request.
export const generateStaticParams = (): { lang: string; surah: string }[] => [];

export async function generateMetadata({ params }: PageProps<"/[lang]/grammar/[surah]">): Promise<Metadata> {
  const { surah } = await pageSurahAddress(params);
  return surahMetadata(surah, {}, STRINGS.grammar);
}

export default async function GrammarPage({ params }: PageProps<"/[lang]/grammar/[surah]">) {
  const { lang, surah: number } = await pageSurahAddress(params);
  const path = `/grammar/${number}`;
  const read = await orUnavailable(() => Promise.all([readGrammarOpening(number, lang), listSurahs()]));
  if (read === UNAVAILABLE) return <UnavailablePage lang={lang} path={path} />;
  const [opening, surahs] = read;
  if (!opening) notFound();
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={path} />
      {/* Outside <main>, as a Surah page's name is: <main> holds the Ayahs and their headings alone. */}
      <header className={styles.head}>
        <BackToExplore lang={lang} />
        <h1 className={indexStyles.title}>{STRINGS.grammarOf(`${opening.number}. ${opening.nameLatin}`)}</h1>
        <div className={styles.tools}>
          <GrammarPicker lang={lang} />
          <Link className={styles.guideLink} href={grammarGuidePath(lang)}>
            {STRINGS.grammarGuide}
          </Link>
          <LanguageSwitch lang={lang} hrefs={{ ur: grammarPath("ur", opening.number), en: grammarPath("en", opening.number) }} />
        </div>
      </header>
      <GrammarInParts lang={lang} surah={opening.number} partCount={opening.partCount} laterWordCounts={opening.laterWordCounts}>
        <GrammarAyahs surah={opening.number} ayahs={opening.first} lang={lang} />
      </GrammarInParts>
      <SurahFoot lang={lang} previous={surahs[number - 2]} next={surahs[number]} pathOf={grammarPath} />
      <WordGrammarDialog />
      <RootDialog lang={lang} />
      <ParticleDialog lang={lang} />
    </div>
  );
}
