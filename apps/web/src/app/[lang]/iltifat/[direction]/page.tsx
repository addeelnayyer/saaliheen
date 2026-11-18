// An Iltifat direction page (#138): that direction's Iltifat in Quran order,
// Iltifat sharing a run in one entry (./entry.tsx). Its Iltifat come from Neon
// through the Iltifat module, cached under the direction's tag (ADR 0016), with
// each entry's Ayahs and Ayah translations as Neon holds them (#172). Rendered on
// its first request, not at build, and kept until a save refreshes its tag.
// Any address but the four directions' is a 404.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LANGUAGES, type Language } from "@/dataset/reader";
import { cachedIltifatOfDirection, cachedRunsOfDirection, runOf } from "@/iltifat/cached";
import { isIltifatDirection, type IltifatDirection } from "@/iltifat/iltifat";
import { BackToExplore } from "../../explore/back-to-explore";
import { SiteBar } from "../../site-bar";
import { STRINGS } from "../../strings";
import indexStyles from "../../index.module.css";
import { DIRECTION_WORDS } from "../directions";
import { entriesOf } from "../entries";
import { directionAddress, directionPath, iltifatPath } from "../iltifat-path";
import { readDirectionPreview } from "../link-preview";
import styles from "../iltifat.module.css";
import { IltifatEntry } from "./entry";

// None at build, when the database may not hold the Iltifat yet; each is rendered on its first request.
export const generateStaticParams = (): { direction: string }[] => [];

async function load(params: PageProps<"/[lang]/iltifat/[direction]">["params"]) {
  const { lang, direction } = await params;
  if (!(LANGUAGES as readonly string[]).includes(lang) || !isIltifatDirection(direction)) notFound();
  return { lang: lang as Language, direction: direction as IltifatDirection };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/iltifat/[direction]">): Promise<Metadata> {
  const { lang, direction } = await load(params);
  const { title, description } = await readDirectionPreview(direction);
  return {
    title: `${DIRECTION_WORDS[direction].name} · ${STRINGS.iltifat} · ${STRINGS.brand}`,
    description,
    openGraph: { type: "article", siteName: STRINGS.brand, title, description, url: directionPath(lang, direction) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DirectionPage({ params }: PageProps<"/[lang]/iltifat/[direction]">) {
  const { lang, direction } = await load(params);
  const [list, runs] = await Promise.all([cachedIltifatOfDirection(direction), cachedRunsOfDirection(direction)]);
  const disputed = list.filter((i) => i.disputed).length;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={directionAddress(direction)} />
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <BackToExplore lang={lang} />
          <Link className={styles.back} href={iltifatPath(lang)}>
            {STRINGS.allIltifat}
          </Link>
          <h1 className={indexStyles.title}>{DIRECTION_WORDS[direction].name}</h1>
          <p className={styles.facts}>
            <span>{DIRECTION_WORDS[direction].description}</span>
            <span>{STRINGS.iltifatStats(list.length - disputed, disputed)}</span>
          </p>
        </header>
        {entriesOf(list).map((entry) => (
          <IltifatEntry key={entry[0].id} lang={lang} entry={entry} run={runs[runOf(entry[0])]} />
        ))}
      </main>
    </div>
  );
}
