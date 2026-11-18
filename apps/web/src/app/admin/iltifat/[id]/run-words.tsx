// An Iltifat's run as Word cards (#142), Ayah by Ayah, each card's Arabic in
// the Script this browser chose (data-script on <html>) and its English Word
// meaning, its id its Word location, as on a Surah page. A tap marks or
// unmarks its Word (#143, ./word-marking.tsx).

import { surahAyahTextsNow, type AyahWord } from "@/dataset/reader";
import { ScriptText } from "../../../[lang]/[surah]/script-text";
import own from "../iltifat-editor.module.css";
import { MarkableCard } from "./word-marking";

/** A Word card's face: its Arabic in the Script this browser chose, and its English Word meaning; the Supplication editor's too (#271). */
export function WordFace({ word }: { word: AyahWord }) {
  return (
    <>
      <ScriptText uthmani={word.uthmani} indopak={word.indopak}>
        {(text, scriptClass) => (
          <span className={`${own.wordArabic} ${scriptClass}`.trim()} lang="ar">
            {text}
          </span>
        )}
      </ScriptText>
      <span className={own.wordMeaning} lang="en" dir="ltr">
        {word.meaning.en}
      </span>
    </>
  );
}

function Card({ word }: { word: AyahWord }) {
  return (
    <MarkableCard location={word.location}>
      <WordFace word={word} />
    </MarkableCard>
  );
}

export async function RunWords({ surah, from, to }: { surah: number; from: number; to: number }) {
  const ayahs = (await surahAyahTextsNow(surah)).slice(from - 1, to);
  return (
    <div className={own.run}>
      {ayahs.map((ayah) => (
        <div key={ayah.number} className={own.ayah}>
          <span className={own.number}>
            {surah}:{ayah.number}
          </span>
          <div className={own.words} dir="rtl">
            {ayah.words.map((word) => (
              <Card key={word.location} word={word} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
