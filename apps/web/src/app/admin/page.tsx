// The admin area's home (#42): a signed-in Admin's Surah picker, and the way
// to the Iltifat editor (#142) and the Supplication editor (#201).

import Link from "next/link";
import { listSurahNamesNow } from "@/dataset/reader";
import { adminOnly } from "./admin-gate";
import { SurahPicker } from "./surah-picker";
import styles from "./admin.module.css";

export default function AdminHome() {
  return adminOnly("/admin", async () => (
    <>
      <h1 className={styles.title}>Surahs</h1>
      <p className={styles.lead}>
        Choose a Surah to edit its Passages, or edit the{" "}
        <Link href="/admin/iltifat" prefetch={false}>
          Iltifat
        </Link>{" "}
        or the{" "}
        <Link href="/admin/supplications" prefetch={false}>
          Supplications
        </Link>
        .
      </p>
      <SurahPicker surahs={await listSurahNamesNow()} />
    </>
  ));
}
