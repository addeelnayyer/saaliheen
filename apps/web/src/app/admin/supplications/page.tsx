// The Supplication editor's list (#201, #202): every Supplication, read from
// Neon on each request, in Quran order, each a link to its editor, narrowed by
// the Supplications page's filters (../../[lang]/supplications/filters.tsx):
// Opening, "Prophets only" and "Show other words to Allah". An entry says
// "Marked" once its Supplication has a span, and "Not yet marked" leaves those
// out (#271), as the Iltifat editor's list does. It leads to adding a
// Supplication and to the Speakers; a Supplication is deleted in its editor.

import Link from "next/link";
import { listSurahNamesNow, type SurahName } from "@/dataset/reader";
import { everySupplication, isSupplication, type Speaker, type Supplication } from "@/supplications/supplications";
import { FilteredSupplications, type FilteredEntry } from "../../[lang]/supplications/filters";
import entryStyles from "../../[lang]/supplications/supplications.module.css";
import { adminOnly } from "../admin-gate";
import styles from "../admin.module.css";
import { MarkedFilter } from "../iltifat/marked-filter";
import { MarkedTag } from "../marked-tag";
import { kindLabel } from "./[id]/supplication-state";
import { editorPath, NEW_SUPPLICATION, SPEAKERS_EDITOR, SUPPLICATIONS_EDITOR, supplicationName } from "./editor-path";
import own from "./supplication-editor.module.css";

function Entry({ supplication, speaker, surahs }: { supplication: Supplication; speaker: Speaker; surahs: SurahName[] }) {
  const marked = supplication.spans.length > 0;
  return (
    <article className={`${entryStyles.entry} ${marked ? own.isMarked : ""}`.trim()}>
      <header className={entryStyles.entryHeader}>
        <h2 className={entryStyles.entryHeading}>
          <Link href={editorPath(supplication.id)} prefetch={false}>
            {supplicationName(supplication, surahs)}
          </Link>
        </h2>
        <p className={entryStyles.speaker}>{speaker.nameEn}</p>
        {!isSupplication(supplication) && <p className={entryStyles.kind}>{kindLabel(supplication.kind)}</p>}
        {marked && <MarkedTag />}
      </header>
    </article>
  );
}

export default function SupplicationEditorList() {
  return adminOnly(SUPPLICATIONS_EDITOR, async () => {
    const [{ supplications, speakers }, surahs] = await Promise.all([everySupplication(), listSurahNamesNow()]);
    const byId = new Map(speakers.map((s) => [s.id, s]));
    const entries: FilteredEntry[] = supplications.map((supplication) => {
      const speaker = byId.get(supplication.speakerId)!;
      return {
        id: supplication.id,
        openings: supplication.openings,
        includesProphet: speaker.includesProphet,
        otherWords: !isSupplication(supplication),
        entry: <Entry supplication={supplication} speaker={speaker} surahs={surahs} />,
      };
    });
    return (
      <>
        <h1 className={styles.title}>Supplications</h1>
        <p className={styles.lead}>
          Choose a Supplication to edit its Speaker, Openings, kind, run and spans ·{" "}
          <Link href={NEW_SUPPLICATION} prefetch={false}>
            Add a Supplication
          </Link>{" "}
          ·{" "}
          <Link href={SPEAKERS_EDITOR} prefetch={false}>
            Speakers
          </Link>{" "}
          · <Link href="/admin" prefetch={false}>All Surahs</Link>
        </p>
        <MarkedFilter>
          <div className={own.list}>
            <FilteredSupplications entries={entries} path={SUPPLICATIONS_EDITOR} />
          </div>
        </MarkedFilter>
      </>
    );
  });
}
