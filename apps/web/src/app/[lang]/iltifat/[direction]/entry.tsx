// One entry of a direction page (#138): the Iltifat sharing one run. Its
// heading names the Surah and run and opens the Surah at the cited Ayah as a
// look-up, which leaves the Reading place where it was; then the direction
// badge, the run's Ayahs Ayah by Ayah, and each Iltifat's reason in English,
// with a Disputed tag where it applies. The entry carries its first Iltifat's
// fragment; each further Iltifat of the run carries its own on its reason.
// A marked Iltifat's Marked Words (#143) are tinted in the Ayahs, with a key
// below them naming each side beside a swatch of its tint.

import Link from "next/link";
import { written } from "@saaliheen/passages";
import type { Language } from "@/dataset/reader";
import type { RunText } from "@/iltifat/cached";
import type { Iltifat, IltifatDirection } from "@/iltifat/iltifat";
import { SIDES } from "@/iltifat/marked-words";
import { AyahList } from "../../ayah-list";
import { ayahId, locationPath } from "../../reading-place";
import { STRINGS } from "../../strings";
import { DIRECTION_WORDS, sideLabel } from "../directions";
import type { Entry } from "../entries";
import { iltifatFragment } from "../iltifat-path";
import { marksOf } from "../marks";
import styles from "../iltifat.module.css";

/** An Iltifat's reason, after a Disputed tag when it is Disputed. */
function Reason({ iltifat, own }: { iltifat: Iltifat; own: boolean }) {
  return (
    <div className={styles.reason} id={own ? iltifatFragment(iltifat.id) : undefined}>
      {iltifat.disputed && <span className={styles.disputed}>{STRINGS.disputed}</span>}
      <p lang="en" dir="ltr">
        {iltifat.reason}
      </p>
    </div>
  );
}

/** The direction badge: its arrow name shown, and the turn said to a screen reader. */
function Badge({ iltifat }: { iltifat: Iltifat }) {
  const words = DIRECTION_WORDS[iltifat.direction];
  return (
    <p className={styles.badge}>
      <span aria-hidden="true">{words.name}</span>
      <span className={styles.said}>{words.said}</span>
    </p>
  );
}

/** The key to an entry's Marked Words: each side's name ("From He") beside a swatch of its tint. */
function MarkedKey({ direction }: { direction: IltifatDirection }) {
  return (
    <ul className={styles.key} aria-label="Marked Words">
      {SIDES.map((side) => (
        <li key={side} className={styles.keySide}>
          <span className={`${styles.swatch} ${styles[side]}`} aria-hidden="true" />
          <span>{sideLabel(direction, side)}</span>
        </li>
      ))}
    </ul>
  );
}

export function IltifatEntry({ lang, entry, run }: { lang: Language; entry: Entry; run: RunText }) {
  const first = entry[0];
  const { surah, ayahFrom, ayahTo } = first;
  const texts = run.ayahs.map(({ translation, ...ayah }) => ({ ...ayah, translation: translation[lang] }));
  const marks = marksOf(entry);
  return (
    <article className={styles.entry} id={iltifatFragment(first.id)}>
      <header className={styles.entryHeader}>
        <h2 className={styles.entryHeading}>
          <Link href={locationPath(lang, ayahId({ surah, ayah: first.citedAyah }))}>
            {`${run.nameLatin} ${surah}:${written({ from: ayahFrom, till: ayahTo })}`}
          </Link>
        </h2>
        <Badge iltifat={first} />
      </header>
      <AyahList lang={lang} surah={surah} ayahs={texts} marks={marks} />
      {marks.size > 0 && <MarkedKey direction={first.direction} />}
      {entry.map((iltifat, i) => (
        <Reason key={iltifat.id} iltifat={iltifat} own={i > 0} />
      ))}
    </article>
  );
}
