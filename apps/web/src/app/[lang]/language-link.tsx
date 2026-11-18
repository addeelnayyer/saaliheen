"use client";

// One link of the Translation language switch. It carries the URL's fragment
// (a look-up's `#s:a:w` Word location or shared Ayah's `#s:a`) to the other
// Language, so a look-up stays a look-up there and lands on the same Ayah: a
// look-up never moves the Reading place, so without it the page would land on
// wherever the Reading place last was, or its first Ayah.

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps } from "react";
import { LANGUAGES, type Language } from "@saaliheen/dataset/types";
import { LANGUAGE_NAME, STRINGS } from "./strings";
import { saveToAccount } from "./synced-settings";
import barStyles from "./site-bar.module.css";

// The site's own links change the fragment only through plain <a>s (a Root
// dialog's Word locations in the Surah being read), which fire hashchange,
// as Back and Forward between fragments do.
const onHashChange = (change: () => void) => {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
};

/**
 * `href` is `lang`'s path; the fragment is added once the page runs, as only the
 * browser knows it. Following it saves `lang` to a signed-in Account (#70).
 */
export function LanguageLink({ href, lang, ...props }: ComponentProps<typeof Link> & { href: string; lang: Language }) {
  const hash = useSyncExternalStore(
    onHashChange,
    () => window.location.hash,
    () => "",
  );
  return <Link href={href + hash} lang={lang} onClick={() => saveToAccount({ language: lang })} {...props} />;
}

/**
 * The Translation language switch: a link to each Language, `hrefs[l]` being
 * the page's path in `l`, the current Language marked.
 */
export function LanguageSwitch({ lang, hrefs }: { lang: Language; hrefs: Record<Language, string> }) {
  return (
    <div className={barStyles.seg} role="group" aria-label={STRINGS.translationLanguageLabel}>
      {LANGUAGES.map((l) => (
        <LanguageLink
          key={l}
          href={hrefs[l]}
          lang={l}
          className={l === "ur" ? barStyles.urFace : barStyles.enFace}
          aria-current={l === lang ? "page" : undefined}
          prefetch={false}
        >
          {LANGUAGE_NAME[l]}
        </LanguageLink>
      ))}
    </div>
  );
}
