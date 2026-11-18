// A Supplication's run as Word cards (#271), Ayah by Ayah, each card's Arabic
// in the Script this browser chose and its English Word meaning, its id its
// Word location, as the Iltifat editor draws them; under each Ayah's cards, its
// English Ayah translation. A tap marks its spans (./span-marking.tsx).

import type { AyahText } from "@/dataset/reader";
import { WordFace } from "../../iltifat/[id]/run-words";
import own from "../supplication-editor.module.css";
import { SpanCard } from "./span-marking";

export function SpanWords({ surah, ayahs }: { surah: number; ayahs: AyahText[] }) {
  return (
    <div className={own.run}>
      {ayahs.map((ayah) => (
        <div key={ayah.number} className={own.ayah} data-ayah={`${surah}:${ayah.number}`}>
          <span className={own.number}>
            {surah}:{ayah.number}
          </span>
          <div className={own.words} dir="rtl">
            {ayah.words.map((word) => (
              <SpanCard key={word.location} location={word.location}>
                <WordFace word={word} />
              </SpanCard>
            ))}
          </div>
          <p className={own.translation} lang="en" dir="ltr">
            {ayah.translation.en}
          </p>
        </div>
      ))}
    </div>
  );
}
