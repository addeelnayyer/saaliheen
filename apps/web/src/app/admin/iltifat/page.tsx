// The Iltifat editor's list (#142): every Iltifat, read from Neon on each
// request, by Iltifat direction in the overview's order, each in Quran order,
// a link to its editor. Iltifat are never added or deleted here. A link says
// "Marked" once both sides of its Iltifat hold a Word, and "Not yet marked"
// leaves those out (#143).

import Link from "next/link";
import { listSurahNamesNow, type SurahName } from "@/dataset/reader";
import { everyIltifat, isMarkedIltifat } from "@/iltifat/iltifat";
import { DIRECTION_WORDS } from "../../[lang]/iltifat/directions";
import { adminOnly } from "../admin-gate";
import styles from "../admin.module.css";
import { byDirection, editorPath, iltifatName, type DirectionGroup } from "./editor-order";
import own from "./iltifat-editor.module.css";
import { MarkedFilter } from "./marked-filter";
import { DisputedTag, MarkedTag } from "../marked-tag";

function Direction({ group, surahs }: { group: DirectionGroup; surahs: SurahName[] }) {
  return (
    <section className={own.group}>
      <h2 className={own.groupHeading}>{DIRECTION_WORDS[group.direction].name}</h2>
      <ul className={own.list}>
        {group.iltifat.map((iltifat) => (
          <li key={iltifat.id} className={isMarkedIltifat(iltifat) ? own.isMarked : undefined}>
            <Link className={own.listed} href={editorPath(iltifat.id)} prefetch={false}>
              <span>{iltifatName(iltifat, surahs)}</span>
              {iltifat.disputed && <DisputedTag />}
              {isMarkedIltifat(iltifat) && (
                <>
                  {" "}
                  <MarkedTag />
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function IltifatEditorList() {
  return adminOnly("/admin/iltifat", async () => {
    const [groups, surahs] = await Promise.all([everyIltifat().then(byDirection), listSurahNamesNow()]);
    return (
      <>
        <h1 className={styles.title}>Iltifat</h1>
        <p className={styles.lead}>
          Choose an Iltifat to edit its reason, its run, its Disputed tag and its Marked Words · <Link href="/admin" prefetch={false}>All Surahs</Link>
        </p>
        <MarkedFilter>
          {groups.map((group) => (
            <Direction key={group.direction} group={group} surahs={surahs} />
          ))}
        </MarkedFilter>
      </>
    );
  });
}
