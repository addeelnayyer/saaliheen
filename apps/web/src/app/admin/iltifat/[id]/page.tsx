// An Iltifat's editor (#142): headed with its Iltifat direction and run, its
// run's Word cards in the Script this browser chose, on which its Marked Words
// are marked (#143), then its reason, run and Disputed tag to edit and save, and the Iltifat before and after it in the
// list. Read from Neon on each request; any address but an Iltifat's id is
// not found.

import Link from "next/link";
import { notFound } from "next/navigation";
import { rowIdOf } from "@/admin/row-id";
import { listSurahNamesNow } from "@/dataset/reader";
import { everyIltifat, type Iltifat } from "@/iltifat/iltifat";
import { DIRECTION_WORDS } from "../../../[lang]/iltifat/directions";
import { adminOnly } from "../../admin-gate";
import styles from "../../admin.module.css";
import { editorPath, iltifatName, listOrder, neighbours } from "../editor-order";
import { IltifatEditing } from "./iltifat-editing";
import { IltifatForm } from "./iltifat-form";
import { RunWords } from "./run-words";
import { SideChoice } from "./word-marking";

/** The Iltifat `address` names, with the list around it, or undefined. */
async function opened(address: string) {
  const id = rowIdOf(address);
  if (id === undefined) return undefined;
  const list = listOrder(await everyIltifat());
  const iltifat = list.find((i) => i.id === id);
  return iltifat && { iltifat, ...neighbours(list, iltifat.id) };
}

/** Where the editor's Previous or Next leads, if anywhere. */
const pathOf = (iltifat: Iltifat | undefined) => iltifat && editorPath(iltifat.id);

export default async function IltifatEditor({ params }: PageProps<"/admin/iltifat/[id]">) {
  const { id: address } = await params;
  return adminOnly(`/admin/iltifat/${address}`, async () => {
    const [found, surahs] = await Promise.all([opened(address), listSurahNamesNow()]);
    if (!found) notFound();
    const { iltifat, previous, next } = found;
    return (
      <>
        <h1 className={styles.title}>
          {DIRECTION_WORDS[iltifat.direction].name} · {iltifatName(iltifat, surahs)}
        </h1>
        <p className={styles.lead}>
          Cited at {iltifat.surah}:{iltifat.citedAyah} · {iltifat.section} · <Link href="/admin/iltifat" prefetch={false}>All Iltifat</Link>
        </p>
        <IltifatEditing key={iltifat.id} iltifat={iltifat}>
          <SideChoice />
          <RunWords surah={iltifat.surah} from={iltifat.ayahFrom} to={iltifat.ayahTo} />
          <IltifatForm iltifat={iltifat} ayahCount={surahs[iltifat.surah - 1].ayahCount} previous={pathOf(previous)} next={pathOf(next)} />
        </IltifatEditing>
      </>
    );
  });
}
