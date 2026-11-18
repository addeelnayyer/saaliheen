"use client";

// Whether this tab arrived at the Share page from inside the app (#56): the
// one place that decides it. Everything the app opens a Share page with (an
// Ayah's or a Passage heading's share button, the site bar's "Share Ayahs",
// "Share your own", the edit strip itself, and the Share page's Language
// switch once the tab has it) adds `?edit` to the Share page's path. The
// address a sharer sends is the path alone, so whoever opens it, the sharer
// included, gets no edit strip. The server never reads the query:
// every Share page stays one cached page, and the sharer's controls appear
// only once the page runs in the browser.

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, type MouseEvent, type ReactNode } from "react";
import type { Language } from "@/dataset/reader";
import { LanguageSwitch } from "../language-link";
import { currentScript } from "../settings";
import { sharePath, type ShareTarget } from "@saaliheen/share";

/** The query that marks an arrival from inside the app. */
const IN_APP = "edit";

/** A Share page's address as the app opens it, with the edit strip. */
export const inAppHref = (target: ShareTarget) => `${sharePath(target)}?${IN_APP}`;

function Switch({ inApp, otherwise }: { inApp: ReactNode; otherwise: ReactNode }) {
  return useSearchParams().has(IN_APP) ? inApp : otherwise;
}

/**
 * `inApp` for someone who arrived from inside the app, `otherwise` for
 * everyone else. The page as served holds only `otherwise`: the query is read
 * in the browser alone.
 */
export function InApp({ children, otherwise = null }: { children: ReactNode; otherwise?: ReactNode }) {
  return (
    <Suspense fallback={otherwise}>
      <Switch inApp={children} otherwise={otherwise} />
    </Suspense>
  );
}

/**
 * The Share page's Language switch (#192): `hrefs[l]` is the page's path in
 * `l`. Someone who arrived from inside the app keeps the edit strip in the
 * other Language, so their links carry the query too; everyone else's do not.
 */
export function ShareLanguageSwitch({ lang, hrefs }: { lang: Language; hrefs: Record<Language, string> }) {
  const inApp = { ur: `${hrefs.ur}?${IN_APP}`, en: `${hrefs.en}?${IN_APP}` };
  return (
    <InApp otherwise={<LanguageSwitch lang={lang} hrefs={hrefs} />}>
      <LanguageSwitch lang={lang} hrefs={inApp} />
    </InApp>
  );
}

/** A click the browser should handle itself: another tab or window, a download. */
export const leftToBrowser = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/**
 * A link that opens the Share page of 1:1–7 in `lang` with the edit strip, in
 * the reader's current Script: the site bar's "Share Ayahs" and a Share
 * page's "Share your own". Its address names Uthmani until it is followed,
 * when the Script is read from the page.
 */
export function StartSharingLink({ lang, className, children }: { lang: Language; className?: string; children: ReactNode }) {
  const router = useRouter();
  const target = { lang, surah: 1, from: 1, to: 7 } as const;
  const follow = (e: MouseEvent) => {
    if (leftToBrowser(e)) return;
    e.preventDefault();
    router.push(inAppHref({ ...target, script: currentScript() }));
  };
  return (
    <Link className={className} href={inAppHref({ ...target, script: "uthmani" })} prefetch={false} onClick={follow}>
      {children}
    </Link>
  );
}
