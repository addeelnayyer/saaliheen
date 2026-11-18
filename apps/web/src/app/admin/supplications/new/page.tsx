// Where an Admin adds a Supplication (#202): its Surah, then its Speaker,
// Openings, kind and run, as a Supplication's editor has them. Splitting a
// Supplication is trimming its run there and adding the rest here.

import Link from "next/link";
import { listSurahNamesNow } from "@/dataset/reader";
import { everySpeaker } from "@/supplications/supplications";
import { adminOnly } from "../../admin-gate";
import styles from "../../admin.module.css";
import { NEW_SUPPLICATION, SUPPLICATIONS_EDITOR } from "../editor-path";
import { NewSupplicationForm } from "./new-supplication-form";

export default function NewSupplication() {
  return adminOnly(NEW_SUPPLICATION, async () => {
    const [speakers, surahs] = await Promise.all([everySpeaker(), listSurahNamesNow()]);
    return (
      <>
        <h1 className={styles.title}>Add a Supplication</h1>
        <p className={styles.lead}>
          <Link href={SUPPLICATIONS_EDITOR} prefetch={false}>
            All Supplications
          </Link>
        </p>
        <NewSupplicationForm speakers={speakers} surahs={surahs} />
      </>
    );
  });
}
