// Quran Chat (#78, ADR 0057): a signed-in reader asks about the Quran and reads
// the answer as it is written, in the page's Language, from the Ayah
// translations and the Tafsir. Asking needs an Account, so the page is
// prerendered like the Sign-in page and asks, in the browser, whether the
// reader is signed in (QuranChat); one who is not is asked to sign in.

import type { Metadata } from "next";
import type { Language } from "@/dataset/reader";
import { BackToExplore } from "../explore/back-to-explore";
import { languageParams } from "../language-params";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import { QuranChat } from "./quran-chat";
import { QURAN_CHAT_ADDRESS } from "./quran-chat-path";
import indexStyles from "../index.module.css";
import styles from "./quran-chat.module.css";

// Prerendered in each Language; any other is a 404.
export const dynamicParams = false;
export const generateStaticParams = languageParams;

export const metadata: Metadata = { title: `${STRINGS.quranChat} · ${STRINGS.brand}` };

export default async function QuranChatPage({ params }: PageProps<"/[lang]/quran-chat">) {
  const lang = (await params).lang as Language;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path={QURAN_CHAT_ADDRESS} />
      <main className={styles.page}>
        <BackToExplore lang={lang} />
        <h1 className={indexStyles.title}>{STRINGS.quranChat}</h1>
        <p className={styles.lead}>{STRINGS.quranChatLead}</p>
        <QuranChat lang={lang} />
      </main>
    </div>
  );
}
