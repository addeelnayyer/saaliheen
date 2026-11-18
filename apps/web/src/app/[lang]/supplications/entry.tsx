// One entry of the Supplications page (#199): a Supplication, or one of the
// Other words to Allah (#200), which carries its kind's label beside its
// Speaker so that it is never mistaken for a Supplication. Its heading names
// its Surah and run and opens the Surah at its first Ayah as a look-up, which
// leaves the Reading place where it was; then its Speaker in the reader's
// Language, and its Ayahs Ayah by Ayah through the Ayah list the Iltifat pages
// use, each of its spans (#270) tinted. The Surah is named as a reader of the Language reads it: in Latin
// letters in English and in Arabic in Urdu, so that neither page carries the
// other Language's name of a Speaker such as Ibrahim or Nuh. The Arabic name
// is isolated right to left, as the Surah index sets it, so that the run after
// it still reads left to right on the English interface.

import Link from "next/link";
import { written } from "@saaliheen/passages";
import { ayahTextsOf, getSurah, listSurahs, type Language } from "@/dataset/reader";
import type { Speaker, Supplication } from "@/supplications/supplications";
import { AyahList } from "../ayah-list";
import { ayahId, locationPath } from "../reading-place";
import { inLanguage, OTHER_WORDS_LABEL } from "../strings";
import styles from "./supplications.module.css";

/** The Surah's name as a reader of `lang` reads it. */
async function SurahName({ lang, surah }: { lang: Language; surah: number }) {
  const { nameLatin, nameArabic } = (await listSurahs())[surah - 1];
  return lang === "ur" ? (
    <span lang="ar" dir="rtl">
      {nameArabic}
    </span>
  ) : (
    nameLatin
  );
}

/** The Supplication's Ayahs, each with its Ayah translation in `lang`. */
async function ayahsOf(lang: Language, { surah, ayahFrom, ayahTo }: Supplication) {
  const quran = (await getSurah(surah))!;
  return ayahTextsOf({ ...quran, ayahs: quran.ayahs.slice(ayahFrom - 1, ayahTo) }).map(({ translation, ...ayah }) => ({ ...ayah, translation: translation[lang] }));
}

export async function SupplicationEntry({ lang, supplication, speaker }: { lang: Language; supplication: Supplication; speaker: Speaker }) {
  const { surah, ayahFrom, ayahTo } = supplication;
  return (
    <article className={styles.entry}>
      <header className={styles.entryHeader}>
        <h2 className={styles.entryHeading}>
          <Link href={locationPath(lang, ayahId({ surah, ayah: ayahFrom }))}>
            <SurahName lang={lang} surah={surah} />
            {` ${surah}:${written({ from: ayahFrom, till: ayahTo })}`}
          </Link>
        </h2>
        <p className={styles.speaker} {...inLanguage(lang)}>
          {lang === "ur" ? speaker.nameUr : speaker.nameEn}
        </p>
        {supplication.kind !== "supplication" && <p className={styles.kind}>{OTHER_WORDS_LABEL[supplication.kind]}</p>}
      </header>
      <AyahList lang={lang} surah={surah} ayahs={await ayahsOf(lang, supplication)} spans={supplication.spans} />
    </article>
  );
}
