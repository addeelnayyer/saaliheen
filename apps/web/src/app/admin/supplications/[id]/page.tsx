// A Supplication's editor (#201): headed with its Surah and run, its Ayahs as
// Word cards in the Script this browser chose, on which its spans are marked
// (#271), each Ayah with its English Ayah translation, then its Speaker,
// Openings, kind and run to edit and save. Read from Neon on each
// request; any address but a Supplication's id is not found.

import Link from "next/link";
import { notFound } from "next/navigation";
import { rowIdOf } from "@/admin/row-id";
import { listSurahNamesNow, surahAyahTextsNow } from "@/dataset/reader";
import { everySupplication, type Supplication } from "@/supplications/supplications";
import { adminOnly } from "../../admin-gate";
import styles from "../../admin.module.css";
import { SUPPLICATIONS_EDITOR, supplicationName } from "../editor-path";
import { SpanHint } from "./span-marking";
import { SpanWords } from "./span-words";
import { SupplicationEditing } from "./supplication-editing";
import { SupplicationForm } from "./supplication-form";
import { kindLabel } from "./supplication-state";

/** The Supplication `address` names, with every Speaker by name, or undefined. */
async function opened(address: string) {
  const id = rowIdOf(address);
  if (id === undefined) return undefined;
  const { supplications, speakers } = await everySupplication();
  const supplication = supplications.find((s) => s.id === id);
  return supplication && { supplication, speakers: speakers.toSorted((a, b) => a.nameEn.localeCompare(b.nameEn)) };
}

/** Its Ayahs. */
const ayahsOf = async ({ surah, ayahFrom, ayahTo }: Supplication) => (await surahAyahTextsNow(surah)).slice(ayahFrom - 1, ayahTo);

export default async function SupplicationEditor({ params }: PageProps<"/admin/supplications/[id]">) {
  const { id: address } = await params;
  return adminOnly(`${SUPPLICATIONS_EDITOR}/${address}`, async () => {
    const [found, surahs] = await Promise.all([opened(address), listSurahNamesNow()]);
    if (!found) notFound();
    const { supplication, speakers } = found;
    const speaker = speakers.find((s) => s.id === supplication.speakerId);
    const { nameLatin, ayahCount } = surahs[supplication.surah - 1];
    return (
      <>
        <h1 className={styles.title}>
          {kindLabel(supplication.kind)} · {supplicationName(supplication, surahs)}
        </h1>
        <p className={styles.lead}>
          {speaker?.nameEn} · <Link href={SUPPLICATIONS_EDITOR} prefetch={false}>All Supplications</Link>
        </p>
        <SupplicationEditing key={supplication.id} supplication={supplication}>
          <SpanHint />
          <SpanWords surah={supplication.surah} ayahs={await ayahsOf(supplication)} />
          <SupplicationForm supplication={supplication} speakers={speakers} surahName={nameLatin} ayahCount={ayahCount} />
        </SupplicationEditing>
      </>
    );
  });
}
