// The Sign-in page (#66): a reader signs in to an Account with Google or Apple,
// sees that they are signed in, and signs out. Reading never needs an Account,
// so the page is prerendered like every reading page and sets no cookie: only
// in the browser does it ask the site whether it is signed in (AccountPanel).
// Its Admin entry (#67) is the same page with `?admin=<admin page>`, which the
// panel reads in the browser, so it sits in a Suspense boundary.

import type { Metadata } from "next";
import { Suspense } from "react";
import type { Language } from "@/dataset/reader";
import { SiteBar } from "../site-bar";
import { STRINGS } from "../strings";
import { AccountPanel } from "./account-panel";
import indexStyles from "../index.module.css";
import styles from "./sign-in.module.css";
import { languageParams } from "../language-params";

// Prerendered in each Language; any other is a 404.
export const dynamicParams = false;
export const generateStaticParams = languageParams;

export const metadata: Metadata = { title: `${STRINGS.signIn} · ${STRINGS.brand}` };

export default async function SignInPage({ params }: PageProps<"/[lang]/sign-in">) {
  const lang = (await params).lang as Language;
  return (
    <div className={indexStyles.app}>
      <SiteBar lang={lang} path="/sign-in" />
      <main className={styles.page}>
        <h1 className={styles.title}>{STRINGS.signIn}</h1>
        <Suspense fallback={<p className={styles.lead}>{STRINGS.signingIn}</p>}>
          <AccountPanel />
        </Suspense>
      </main>
    </div>
  );
}
