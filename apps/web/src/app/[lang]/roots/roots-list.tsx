"use client";

// The Roots list's search and Roots (#290): one search box, then every Root
// it finds under its first letter (../../../roots/list.ts), each a link to its
// Root page with its letters, transliteration, count of occurrences and, when
// the reader knows it, a tick. The ticks follow the reader's Known words in
// this browser, so a Root marked on its Root page, the Root dialog or the
// Known words page, here or in another tab, is ticked here.

import Link from "next/link";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { knownLookup } from "@saaliheen/known-words";
import type { Language } from "@/dataset/reader";
import type { ListedRootRow } from "@saaliheen/dataset/types";
import { findRoots, rootsByLetter } from "@/roots/list";
import { useKnownWords } from "../known-words";
import { STRINGS } from "../strings";
import indexStyles from "../index.module.css";
import { rootPageHref } from "./root-path";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SEARCH_FIELD } from "../search-field";
import styles from "./roots-list.module.css";

/** One Root's link: drawn again only when the Root is marked or unmarked. */
const RootLink = memo(function RootLink({ lang, root, known }: { lang: Language; root: ListedRootRow; known: boolean }) {
  return (
    <li>
      {/* Some 1,650 links, so not prefetched. */}
      <Link className={styles.root} href={rootPageHref(lang, root.letters)} prefetch={false}>
        <span className={styles.letters} lang="ar" dir="rtl">
          {root.letters}
        </span>
        <span className={styles.meta}>
          <span lang="ar-Latn" dir="ltr">
            {root.transliteration}
          </span>{" "}
          · <span className={styles.count}>{STRINGS.times(root.occurrences)}</span>
        </span>
        {known && (
          <span className={styles.tick} data-known-root>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={indexStyles.said}>{STRINGS.knownRoot}</span>
          </span>
        )}
      </Link>
    </li>
  );
});

export function RootsList({ lang, roots }: { lang: Language; roots: ListedRootRow[] }) {
  const entries = useKnownWords();
  const known = useMemo(() => knownLookup(entries), [entries]);
  const [search, setSearch] = useState("");
  // The list follows the search once typing pauses, so the box never waits for it.
  const query = useDeferredValue(search);
  // Sorted once; a search only narrows each letter's Roots, which keeps their order.
  const byLetter = useMemo(() => rootsByLetter(roots), [roots]);
  const groups = useMemo(
    () => byLetter.map((group) => ({ ...group, roots: findRoots(query, group.roots) })).filter((group) => group.roots.length),
    [byLetter, query],
  );

  return (
    <>
      <Input
        type="search"
        className={cn(SEARCH_FIELD, "max-w-[480px]")}
        aria-label={STRINGS.searchRoots}
        placeholder={STRINGS.searchRoots}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {groups.length ? (
        groups.map(({ letter, roots: rootsOfLetter }) => (
          <section key={letter} className={styles.group} aria-labelledby={`letter-${letter}`}>
            <h2 id={`letter-${letter}`} className={styles.heading} lang="ar" dir="rtl">
              {letter}
            </h2>
            <ul className={styles.roots}>
              {rootsOfLetter.map((root) => (
                <RootLink key={root.letters} lang={lang} root={root} known={known({ kind: "root", text: root.letters })} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className={styles.none}>{STRINGS.noRootMatches(query.trim())}</p>
      )}
    </>
  );
}
