// A Surah's Allah reference revisions (#154, ADR 0044), reached from its
// Passage editor. Only an Admin reaches it; any address but
// /admin/1/allah-references … /admin/114/allah-references is not found. The
// revisions are read from Neon on each request, newest first, each Word shown
// as its Uthmani Arabic beside its Word location; every Admin's revision
// offers Undo, made against the version read here.

import Link from "next/link";
import { notFound } from "next/navigation";
import { listRevisions, type SurahRevisions } from "@/allah-references/revisions";
import { surahAyahTextsNow } from "@/dataset/reader";
import { adminOnly, surahAt } from "../../admin-gate";
import styles from "../../admin.module.css";
import { RevisionsList } from "./revisions-list";

/** Surah `surah`'s Allah reference revisions; null when they can't be read. */
async function revisionsNow(surah: number): Promise<SurahRevisions | null> {
  try {
    return await listRevisions(surah);
  } catch (e) {
    console.error(`Allah reference revisions of Surah ${surah} unread: ${(e as Error).message}`);
    return null;
  }
}

/** The Uthmani Arabic of every Word the revisions of Surah `surah` list, by Word location. */
async function wordsOf(surah: number, { revisions }: SurahRevisions): Promise<Record<string, string>> {
  const listed = new Set(revisions.flatMap((r) => [...r.added, ...r.removed]));
  const words = (await surahAyahTextsNow(surah)).flatMap((ayah) => ayah.words);
  return Object.fromEntries(words.filter((w) => listed.has(w.location)).map((w) => [w.location, w.uthmani]));
}

export default async function AllahReferenceRevisionsPage({ params }: PageProps<"/admin/[surah]/allah-references">) {
  const { surah: address } = await params;
  return adminOnly(`/admin/${address}/allah-references`, async () => {
    const surah = await surahAt(address);
    if (!surah) notFound();
    const listed = await revisionsNow(surah.number);
    return (
      <>
        <h1 className={styles.title}>
          {surah.number}. {surah.nameLatin}
        </h1>
        <p className={styles.lead}>
          Allah reference revisions · <Link href={`/admin/${surah.number}`} prefetch={false}>Passage editor</Link> ·{" "}
          <Link href="/admin" prefetch={false}>All Surahs</Link>
        </p>
        {listed ? (
          <RevisionsList surah={surah.number} listed={listed} words={await wordsOf(surah.number, listed)} />
        ) : (
          <p role="alert" className={styles.error}>
            The Allah reference revisions couldn’t be read from the database. Reload to try again.
          </p>
        )}
      </>
    );
  });
}
