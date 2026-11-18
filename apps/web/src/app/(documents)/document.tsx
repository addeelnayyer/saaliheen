// The frame of a site document: the brand, home to the Surah index, then the
// document's title, the date it last changed and its text. In a Language
// (/ur/privacy, #192) the document sits under the reading pages' bars instead
// of the brand alone ([lang]/privacy, [lang]/terms).

import Link from "next/link";
import type { Language } from "@/dataset/reader";
import { STRINGS } from "../[lang]/strings";
import barStyles from "../[lang]/site-bar.module.css";
import styles from "./document.module.css";

/** The address and owner every document names. */
export const OWNER = "Adeel Nayyer Sheikh";
export const CONTACT = "contact@saaliheen.com";

export function Contact() {
  return <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;
}

/**
 * Where a document's link to `path` (`/terms`) leads: in `lang` when the
 * document is read in one, so following it keeps the reader's Language; else
 * the document's address without a Language. Credits has none without a
 * Language, so it is the site's first Language's.
 */
export const documentHref = (lang: Language | undefined, path: string) =>
  lang ? `/${lang}${path}` : path === "/credits" ? "/ur/credits" : path;

/** The document itself: its title, `updated` written out (e.g. "3 October 2026"), the date it last changed and its text. */
export function DocumentText({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className={styles.doc}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.updated}>Last updated {updated}</p>
      {children}
    </main>
  );
}

/** A document without a Language, `children` its DocumentText, under the brand alone. */
export function Document({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.bar}>
        {/* "/" goes on to the Urdu Surah index, the site's first Language. */}
        <Link className={barStyles.brand} href="/">
          <span className={barStyles.mark} aria-hidden="true">
            ص
          </span>
          <span className={barStyles.name}>{STRINGS.brand}</span>
        </Link>
      </header>
      {children}
    </div>
  );
}
