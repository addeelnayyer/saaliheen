// The Supplications page (#199, #195, ADR 0027): every Supplication in Quran
// order, each with its Speaker, its Ayahs and a link into its Surah
// (./entry.tsx). A reader narrows them by Opening and to the Prophet's
// supplications, and can add the Other words to Allah, in the browser
// (./filters.tsx, #200); the server renders every entry. Its Supplications come
// from Neon through the Supplications module, cached under the Supplications
// tag (ADR 0016), so it renders on request rather than at build, when the
// database may not have them yet. Its Ayahs and Ayah translations come from
// the Quran dataset, joined in each entry. It has the site's own Link preview.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LANGUAGES, type Language } from "@/dataset/reader";
import { cachedEverySupplication } from "@/supplications/cached";
import { isSupplication, type Supplications } from "@/supplications/supplications";
import { BackToExplore } from "../explore/back-to-explore";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import indexStyles from "../index.module.css";
import { SupplicationEntry } from "./entry";
import { FilteredSupplications, type FilteredEntry } from "./filters";
import { SUPPLICATIONS_ADDRESS, supplicationsPath } from "./supplications-path";
import styles from "./supplications.module.css";

export const metadata: Metadata = { title: `${STRINGS.supplications} · ${STRINGS.brand}` };

/** The page's Language, read on request rather than at build (its Supplications come from Neon). */
async function load(params: PageProps<"/[lang]/supplications">["params"]) {
  const { lang } = await params;
  if (!(LANGUAGES as readonly string[]).includes(lang)) notFound();
  await connection();
  return lang as Language;
}

/** Every entry, Supplications and Other words to Allah alike, rendered in `lang`, in the order given (Quran order). */
function entriesIn(lang: Language, { supplications, speakers }: Supplications): FilteredEntry[] {
  const byId = new Map(speakers.map((s) => [s.id, s]));
  return supplications.map((supplication) => {
    const speaker = byId.get(supplication.speakerId)!;
    return {
      id: supplication.id,
      openings: supplication.openings,
      includesProphet: speaker.includesProphet,
      otherWords: !isSupplication(supplication),
      entry: <SupplicationEntry lang={lang} supplication={supplication} speaker={speaker} />,
    };
  });
}

export default async function SupplicationsPage({ params }: PageProps<"/[lang]/supplications">) {
  const lang = await load(params);
  const entries = entriesIn(lang, await cachedEverySupplication());
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={SUPPLICATIONS_ADDRESS} />
      <main className={styles.page}>
        <BackToExplore lang={lang} />
        <div className={indexStyles.hero}>
          <h1 className={indexStyles.title}>{STRINGS.supplications}</h1>
          <p className={indexStyles.sub}>{STRINGS.supplicationsCount(entries.filter((e) => !e.otherWords).length)}</p>
        </div>
        <FilteredSupplications entries={entries} path={supplicationsPath(lang)} lang={lang} />
      </main>
    </div>
  );
}
