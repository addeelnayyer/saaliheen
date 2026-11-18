// The Iltifat overview (#138): what an Iltifat is, the four Iltifat directions
// with their counts (Disputed Iltifat left out) linking to their pages, the
// 36:22 sentence and the source note. Its counts come from Neon through the
// Iltifat module, cached under the overview's tag (ADR 0016), so it renders on
// request rather than at build, when the database may not have them yet.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LANGUAGES, type Language } from "@/dataset/reader";
import { cachedIltifatCounts } from "@/iltifat/cached";
import type { IltifatCount } from "@/iltifat/iltifat";
import { PICTURE_SIZE } from "../link-preview-frame";
import { locationPath } from "../reading-place";
import { BackToExplore } from "../explore/back-to-explore";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import indexStyles from "../index.module.css";
import { DIRECTION_WORDS } from "./directions";
import { directionPath, ILTIFAT_ADDRESS, iltifatPath, overviewPicturePath } from "./iltifat-path";
import { readOverviewPreview, total } from "./link-preview";
import styles from "./iltifat.module.css";

/** The overview's Language, read on request rather than at build (its counts come from Neon). */
async function load(params: PageProps<"/[lang]/iltifat">["params"]) {
  const { lang } = await params;
  if (!(LANGUAGES as readonly string[]).includes(lang)) notFound();
  await connection();
  return lang as Language;
}

/** The overview's tags, with its Link preview (#144); its picture is ./link-preview-picture/route.tsx. */
export async function generateMetadata({ params }: PageProps<"/[lang]/iltifat">): Promise<Metadata> {
  const lang = await load(params);
  const { title, description, alt } = await readOverviewPreview();
  const images = [{ url: overviewPicturePath(lang), alt, ...PICTURE_SIZE, type: "image/png" }];
  return {
    title: `${STRINGS.iltifat} · ${STRINGS.brand}`,
    description,
    openGraph: { type: "article", siteName: STRINGS.brand, title, description, url: iltifatPath(lang), images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

function Direction({ lang, count }: { lang: Language; count: IltifatCount }) {
  const words = DIRECTION_WORDS[count.direction];
  return (
    <li>
      <Link className={styles.direction} href={directionPath(lang, count.direction)}>
        <span className={styles.directionName}>{words.name}</span>
        <span className={styles.description}>{words.description}</span>
        <span className={styles.count}>{STRINGS.iltifatCount(count.counted)}</span>
      </Link>
    </li>
  );
}

export default async function IltifatOverview({ params }: PageProps<"/[lang]/iltifat">) {
  const lang = await load(params);
  const counts = await cachedIltifatCounts();
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={ILTIFAT_ADDRESS} />
      <main className={styles.page}>
        <BackToExplore lang={lang} />
        <div className={indexStyles.hero}>
          <h1 className={indexStyles.title}>{STRINGS.iltifat}</h1>
          <p className={indexStyles.sub}>{STRINGS.iltifatStats(total(counts, "counted"), total(counts, "disputed"))}</p>
        </div>
        <div className={styles.prose}>
          <p>
            An Iltifat is a sudden turn between the one speaking (I, We), the one spoken to (you) and the one spoken about
            (he, they), while still meaning the same person. In Al-Fatihah, praise of Allah as He turns into &ldquo;You alone
            we worship&rdquo; (1:2–5). To a reader who does not know the rhetoric such a turn can look like a slip in the
            grammar; it is one of the most deliberate moments in the text.
          </p>
          <p>Each Iltifat turns one of four ways. Disputed Iltifat are shown on their pages but not counted here.</p>
        </div>
        <ul className={styles.directions}>
          {counts.map((count) => (
            <Direction key={count.direction} lang={lang} count={count} />
          ))}
        </ul>
        <p className={styles.aside}>
          There is no page for I → You: the one classical example of it, at{" "}
          <Link href={locationPath(lang, "36:22")}>36:22</Link>, is one Abdel Haleem rejects.
        </p>
        <footer className={styles.sourceNote}>
          <p>
            The list follows M. A. S. Abdel Haleem, &ldquo;Grammatical Shift for Rhetorical Purposes&rdquo; (BSOAS 55/3,
            1992). His lists are not final. The reasons are Saaliheen&rsquo;s short summaries, guided by his account of each
            kind of turn, not quotations of his.
          </p>
        </footer>
      </main>
    </div>
  );
}
