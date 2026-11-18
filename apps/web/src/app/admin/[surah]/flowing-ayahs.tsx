"use client";

// One Passage's Ayahs Flowing in the Passage editor (#86), as the Share page's
// Flowing sets out a run of Ayahs (share-page-body.tsx): the Arabic running
// on, each Ayah ending as a printed mushaf ends it, then, when an Ayah
// translation is shown, the Ayah translations as one paragraph with each
// Ayah's number as a small superscript. Only the active Script's Arabic is
// drawn, as the Share page draws one Script; the editor reads which it is.

import { Fragment } from "react";
import type { AyahText, Language, Script } from "@/dataset/reader";
import { drawnAyahEnd } from "../../[lang]/[surah]/ayah-end";
import scriptStyles from "../../[lang]/[surah]/script-text.module.css";
import { inLanguage } from "../../[lang]/strings";
import type { ShownTranslation } from "./editor-choices";
import styles from "./editor.module.css";

/** An Ayah translation paragraph's look and direction in `lang`. */
export const translationLook = (lang: Language) => ({ className: lang === "ur" ? styles.urdu : styles.english, ...inLanguage(lang) });

/** One Ayah's Arabic in `script`, its last Word held on one line with its end. */
function Arabic({ ayah, script }: { ayah: AyahText; script: Script }) {
  const words = ayah[script];
  const cut = words.lastIndexOf(" ") + 1;
  return (
    <>
      {words.slice(0, cut)}
      <span className={styles.ending}>
        {words.slice(cut)} {drawnAyahEnd(ayah, script)}
      </span>
    </>
  );
}

export function FlowingAyahs({ ayahs, translation, script }: { ayahs: AyahText[]; translation: ShownTranslation; script: Script }) {
  return (
    <div className={styles.flowing}>
      <p className={`${styles.arabic} ${scriptStyles[script]}`} lang="ar" dir="rtl">
        {ayahs.map((a) => (
          <Fragment key={a.number}>
            <Arabic ayah={a} script={script} />{" "}
          </Fragment>
        ))}
      </p>
      {translation !== "off" && (
        <p {...translationLook(translation)}>
          {ayahs.map((a) => (
            <Fragment key={a.number}>
              <sup className={styles.ayahNumber}>{a.number}</sup> {a.translation[translation]}{" "}
            </Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
