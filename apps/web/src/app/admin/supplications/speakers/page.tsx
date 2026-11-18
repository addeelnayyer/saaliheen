// The Supplication editor's Speakers (#202): every Speaker, by English name,
// with how many Supplications each says, its names and Prophet mark to edit
// and save, a Delete for a Speaker who says none, and the add of a new one.
// Read from Neon on each request.

import Link from "next/link";
import { everySupplication } from "@/supplications/supplications";
import { adminOnly } from "../../admin-gate";
import styles from "../../admin.module.css";
import { SPEAKERS_EDITOR, SUPPLICATIONS_EDITOR } from "../editor-path";
import { SpeakersEditor } from "./speakers-editor";

export default function SpeakersPage() {
  return adminOnly(SPEAKERS_EDITOR, async () => {
    const { supplications, speakers } = await everySupplication();
    const says = new Map<string, number>();
    for (const { speakerId } of supplications) says.set(speakerId, (says.get(speakerId) ?? 0) + 1);
    const listed = speakers.toSorted((a, b) => a.nameEn.localeCompare(b.nameEn)).map((speaker) => ({ speaker, says: says.get(speaker.id) ?? 0 }));
    return (
      <>
        <h1 className={styles.title}>Speakers</h1>
        <p className={styles.lead}>
          Each Speaker&rsquo;s names and Prophet mark show on every Supplication they say ·{" "}
          <Link href={SUPPLICATIONS_EDITOR} prefetch={false}>
            All Supplications
          </Link>
        </p>
        <SpeakersEditor listed={listed} />
      </>
    );
  });
}
