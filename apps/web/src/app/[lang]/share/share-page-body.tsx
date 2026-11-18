"use client";

// The Shared Ayahs inside frame B, and below the frame the visitor's Share
// layout toggle (none for a single Ayah) and "Share your own" (#55). The
// toggle changes only what this visitor sees: neither the address nor
// browser storage, so a reload shows the address's layout again.
//
// Someone who arrived from inside the app (#56) gets the edit strip above the
// frame instead of the toggle; it sets the layout in the address, so the page
// shows the address's layout. `sharerActions` sit in the strip.

import { Fragment, useState, type ReactNode } from "react";
import { inLanguage } from "../strings";
import { EditStrip, type EditStripProps } from "./edit-strip";
import { InApp, StartSharingLink } from "./in-app";
import { LayoutToggle } from "./layout-toggle";
import type { ShareLayout } from "@saaliheen/share";
import { Ornament } from "./ornaments";
import s from "./share.module.css";

/** One Word of a Shared Ayah: its Word location (`s:a:w`), its text in the address's Script, and whether it is an Allah reference (#149). */
interface ShownWord {
  location: string;
  text: string;
  allahReference?: boolean;
}

/** One Shared Ayah as the page draws it. */
interface ShownAyah {
  number: number;
  /** Its Words in the address's Script, in order. */
  words: ShownWord[];
  /** Its end as a printed mushaf ends it, in the address's Script. */
  end: string;
  translation: string;
}

interface Props {
  ayahs: ShownAyah[];
  /** The address: its Language, Script, Surah, Ayahs and Share layout (null for a single Ayah), and what the edit strip offers; its labels name the Share layouts too. */
  strip: EditStripProps;
  /** The frame's headpiece, and its tailpiece and colophon. */
  head: ReactNode;
  foot: ReactNode;
  /** The sharer's own actions, shown in the edit strip. */
  sharerActions?: ReactNode;
  shareYourOwn: string;
}

type Shown = Pick<EditStripProps, "lang" | "script"> & { ayahs: ShownAyah[] };

/** One Word, marked with its Word location (and as an Allah reference, which share.module.css draws in gold); otherwise unstyled. */
const Word = ({ word }: { word: ShownWord }) => (
  <span data-location={word.location} data-allah-reference={word.allahReference ? "" : undefined}>
    {word.text}
  </span>
);

/**
 * One Ayah's Arabic, Word by Word with a space between Words, ending as a
 * printed mushaf ends it: the end kept on the line of the last Word, never
 * wrapped onto a line of its own. The text is unchanged, only held together.
 */
function Arabic({ ayah }: { ayah: ShownAyah }) {
  const last = ayah.words.at(-1);
  return (
    <>
      {ayah.words.slice(0, -1).map((w) => (
        <Fragment key={w.location}>
          <Word word={w} />{" "}
        </Fragment>
      ))}
      <span className={s.ending}>
        {last && <Word word={last} />} {ayah.end}
      </span>
    </>
  );
}

/** Each Ayah's Arabic, then its Ayah translation, a small ornament between Ayahs. */
function AyahByAyah({ ayahs, lang, script }: Shown) {
  return ayahs.map((a, i) => (
    <section key={a.number} className={s.ayah}>
      {i > 0 && <Ornament className={s.between} />}
      <p className={`${s.arabic} ${s[script]}`} lang="ar" dir="rtl">
        <Arabic ayah={a} />
      </p>
      <p className={s.translation} {...inLanguage(lang)}>
        {a.translation}
      </p>
    </section>
  ));
}

/** All the Arabic running on, then one translation paragraph with each Ayah's number as a small superscript before its Ayah translation. */
function Flowing({ ayahs, lang, script }: Shown) {
  return (
    <>
      <p className={`${s.arabic} ${s[script]}`} lang="ar" dir="rtl">
        {ayahs.map((a) => (
          <Fragment key={a.number}>
            <Arabic ayah={a} />{" "}
          </Fragment>
        ))}
      </p>
      <p className={s.translation} {...inLanguage(lang)}>
        {ayahs.map((a) => (
          <Fragment key={a.number}>
            <sup className={s.number}>{a.number}</sup> <span>{a.translation}</span>{" "}
          </Fragment>
        ))}
      </p>
    </>
  );
}

/** The Shared Ayahs in `layout`, inside frame B. */
function Frame({ layout, head, foot, ...shown }: Shown & { layout: ShareLayout; head: ReactNode; foot: ReactNode }) {
  const Layout = layout === "flowing" ? Flowing : AyahByAyah;
  return (
    <main className={s.band}>
      <div className={s.sheet}>
        {head}
        <div className={s.ayahs}>
          <Layout {...shown} />
        </div>
        {foot}
      </div>
    </main>
  );
}

export function SharePageBody({ ayahs, strip, head, foot, sharerActions, shareYourOwn }: Props) {
  const { lang, script, layout } = strip;
  const [chosen, choose] = useState<ShareLayout>(layout ?? "ayah-by-ayah");
  const frame = (shown: ShareLayout) => <Frame lang={lang} script={script} ayahs={ayahs} layout={shown} head={head} foot={foot} />;
  const below = (toggle: ReactNode) => (
    <nav className={s.visitor}>
      {toggle}
      <StartSharingLink lang={lang}>{shareYourOwn}</StartSharingLink>
    </nav>
  );
  const visitor = (
    <>
      {frame(chosen)}
      {below(layout && <LayoutToggle shown={chosen} choose={choose} labels={strip.labels} />)}
    </>
  );
  return (
    <div className={s.page}>
      <InApp otherwise={visitor}>
        <EditStrip {...strip}>{sharerActions}</EditStrip>
        {frame(layout ?? "ayah-by-ayah")}
        {below(null)}
      </InApp>
    </div>
  );
}
