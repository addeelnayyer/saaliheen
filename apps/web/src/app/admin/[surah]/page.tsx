// A Surah's Passage editor (#44). Only an Admin reaches it; any address but
// /admin/1 … /admin/114 is not found. It edits the Surah as Neon holds it now
// (#171, ADR 0011): its Passage version, Passages and Phrases, and its Allah
// references and their version (#152), read on each request, uncached, as a
// Publish reads them, never the possibly older copies readers see now, so
// changes the Admin made on an older version are never applied to a newer one.
// Beside them, the Surah's Tafsir entry ranges in each Language, read the same
// way, which the editor marks and checks the Passages against (#235).

import Link from "next/link";
import { notFound } from "next/navigation";
import type { TafsirRanges } from "@saaliheen/passages";
import { database } from "@/database";
import { latestSurah, type PublishedSurah } from "@/passages/publish";
import { readTafsirRanges } from "@/tafsir/tafsir";
import { adminOnly, surahAt } from "../admin-gate";
import styles from "../admin.module.css";
import { PassageEditor } from "./passage-editor";

/** Surah `surah` as Neon holds it now, or why it couldn't be read. */
async function latestOf(surah: number): Promise<PublishedSurah | { error: string }> {
  try {
    return await latestSurah(surah);
  } catch (e) {
    console.error(`Surah ${surah} unread for the Passage editor: ${(e as Error).message}`);
    return { error: (e as Error).message };
  }
}

/** Surah `surah`'s Tafsir entry ranges as Neon holds them now; null when they couldn't be read. */
async function tafsirOf(surah: number): Promise<TafsirRanges | null> {
  try {
    return await readTafsirRanges(database(), surah);
  } catch (e) {
    console.error(`Surah ${surah}'s Tafsir unread for the Passage editor: ${(e as Error).message}`);
    return null;
  }
}

export default async function PassageEditorPage({ params }: PageProps<"/admin/[surah]">) {
  const { surah: address } = await params;
  return adminOnly(`/admin/${address}`, async () => {
    const surah = await surahAt(address);
    if (!surah) notFound();
    const [latest, tafsir] = await Promise.all([latestOf(surah.number), tafsirOf(surah.number)]);
    return (
      <>
        <h1 className={styles.title}>
          {surah.number}. {surah.nameLatin}
        </h1>
        <p className={styles.lead}>
          Passage editor · <Link href="/admin" prefetch={false}>All Surahs</Link> ·{" "}
          <Link href={`/admin/${surah.number}/passages`} prefetch={false}>
            Passage revisions
          </Link>{" "}
          ·{" "}
          <Link href={`/admin/${surah.number}/allah-references`} prefetch={false}>
            Allah reference revisions
          </Link>
        </p>
        {"error" in latest ? (
          <p role="alert" className={styles.error}>
            The latest Passages and Phrases couldn’t be read from the database. Reload to try again.
          </p>
        ) : (
          <PassageEditor key={surah.number} surah={surah.number} ayahCount={surah.ayahCount} opened={latest} tafsir={tafsir ?? {}} tafsirUnread={!tafsir} />
        )}
      </>
    );
  });
}
