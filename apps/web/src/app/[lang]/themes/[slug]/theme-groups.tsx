// A Theme page's Passage groups (#129), each a heading linking to the Passage in
// its Surah and its Ayahs (../../ayah-list.tsx): each Ayah's Arabic in the
// reader's Script, its Ayah translation when that is on, and a link to the Ayah
// in its Surah. The same for a Theme page loaded whole (./page.tsx) and one
// opened in parts (#131, ../../opening/themes/[slug]/theme-in-parts.tsx), whose
// Theme parts carry the groups in this shape (PartThemeGroup).

import Link from "next/link";
import { written } from "@saaliheen/passages";
import type { Language, PartThemeGroup } from "@/dataset/reader";
import { PASSAGE_HEADINGS } from "../../release";
import { ayahId, locationPath } from "../../reading-place";
import { inLanguage } from "../../strings";
import { AyahList } from "../../ayah-list";
import styles from "./theme-page.module.css";

/** A Passage group: its heading, linking to the Passage in its Surah, and its Ayahs. */
function Group({ lang, group }: { lang: Language; group: PartThemeGroup }) {
  const { surah, passage } = group;
  return (
    <section className={styles.group}>
      <h2 className={styles.groupHeading}>
        <Link href={locationPath(lang, ayahId({ surah, ayah: passage.from }))}>
          {PASSAGE_HEADINGS && (
            <span className={styles.passageTitle} {...inLanguage(lang)}>
              {passage.title}
            </span>
          )}
          <span className={styles.groupPlace} dir="ltr" lang="en">
            {`${group.surahName} · ${surah}:${written(passage)}`}
          </span>
        </Link>
      </h2>
      <AyahList lang={lang} surah={surah} ayahs={group.ayahs} linked />
    </section>
  );
}

/** `groups`, in order. */
export function ThemeGroups({ lang, groups }: { lang: Language; groups: PartThemeGroup[] }) {
  return groups.map((group) => <Group key={`${group.surah}:${group.passage.from}`} lang={lang} group={group} />);
}
