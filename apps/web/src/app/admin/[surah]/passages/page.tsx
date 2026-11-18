// A Surah's Passage revisions (#174, ADR 0049), reached from its Passage
// editor. Only an Admin reaches it; any address but /admin/1/passages …
// /admin/114/passages is not found. The revisions are read from Neon on each
// request, newest first; every Admin's revision whose changed rows were
// recorded offers Undo, made against the version read here.

import Link from "next/link";
import { notFound } from "next/navigation";
import { listPassageRevisions, type SurahPassageRevisions } from "@/passages/revisions";
import { adminOnly, surahAt } from "../../admin-gate";
import styles from "../../admin.module.css";
import { PassageRevisionsList } from "./revisions-list";

/** Surah `surah`'s Passage revisions; null when they can't be read. */
async function revisionsNow(surah: number): Promise<SurahPassageRevisions | null> {
  try {
    return await listPassageRevisions(surah);
  } catch (e) {
    console.error(`Passage revisions of Surah ${surah} unread: ${(e as Error).message}`);
    return null;
  }
}

export default async function PassageRevisionsPage({ params }: PageProps<"/admin/[surah]/passages">) {
  const { surah: address } = await params;
  return adminOnly(`/admin/${address}/passages`, async () => {
    const surah = await surahAt(address);
    if (!surah) notFound();
    const listed = await revisionsNow(surah.number);
    return (
      <>
        <h1 className={styles.title}>
          {surah.number}. {surah.nameLatin}
        </h1>
        <p className={styles.lead}>
          Passage revisions · <Link href={`/admin/${surah.number}`} prefetch={false}>Passage editor</Link> ·{" "}
          <Link href="/admin" prefetch={false}>All Surahs</Link>
        </p>
        {listed ? (
          <PassageRevisionsList surah={surah.number} listed={listed} />
        ) : (
          <p role="alert" className={styles.error}>
            The Passage revisions couldn’t be read from the database. Reload to try again.
          </p>
        )}
      </>
    );
  });
}
