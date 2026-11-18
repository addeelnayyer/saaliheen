"use client";

// The Known words page's tabs (#248, #251): Roots, then Particles. Above them
// the count of the reader's Known Roots and Known particles, and a search by
// Arabic letters (رحم, ر ح م or رَحِمَ all find ر ح م; من finds مِن) or by
// meaning in the page's Language; the chosen tab lists every Root or particle
// the search finds, in the order given, each with its first meanings and its
// Memorized? choice. A Root's letters lead to its Root page (#289).

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { memo, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { hasLetters, knownLookup, type KnownWordKey } from "@saaliheen/known-words";
import type { Language, ParticleKind } from "@/dataset/reader";
import { ScriptText } from "../../[surah]/script-text";
import { useKnownWords } from "../../known-words";
import { MemorizedSwitch } from "../../memorized";
import { rootPageHref } from "../../roots/root-path";
import { SEARCH_FIELD } from "../../search-field";
import { inLanguage, STRINGS } from "../../strings";
import styles from "./known-words.module.css";

/** A Root as the page lists it: its letters and its Lemmas' meanings in the page's Language, most frequent Lemma first. */
export interface RootRow {
  letters: string;
  meanings: string[];
}

/** A particle as the page lists it: its kind, its text in each Script and its Spellings' meanings in the page's Language. */
export interface ParticleRow {
  kind: ParticleKind;
  text: string;
  indopak: string;
  meanings: string[];
}

/** One row of either tab: what Memorized? marks, how its Arabic is drawn, where it leads (a Root, to its Root page), and its meanings. */
interface Row {
  entry: KnownWordKey;
  arabic: ReactNode;
  href?: string;
  meanings: string[];
}

/** A row with its meanings lowercased once, for searching. */
type Searchable = Row & { lowered: string[] };

/** How many of a row's meanings it shows; a search reads them all. */
const SHOWN_MEANINGS = 3;

const TABS = ["roots", "particles"] as const;
type Tab = (typeof TABS)[number];

/** Each tab's name and what its list says when the search finds nothing. */
const TAB_PARTS: Record<Tab, { label: string; none: string }> = {
  roots: { label: STRINGS.roots, none: STRINGS.noRootsMatch },
  particles: { label: STRINGS.particles, none: STRINGS.noParticlesMatch },
};

/** A tab: a tinted pill, the accent's while chosen. */
const TAB =
  "h-auto flex-none cursor-pointer rounded-full border-0 bg-secondary px-4 py-1.5 text-[14.5px] leading-[inherit] text-muted-foreground transition-none hover:text-muted-foreground " +
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none";

/** Whether `row` is found by `search`: by its Arabic letters, or by any of its meanings, ignoring case (`lower`). */
const finds = (row: Searchable, search: string, lower: string) => hasLetters(row.entry.text, search) || row.lowered.some((m) => m.includes(lower));

const searchable = (rows: Row[]): Searchable[] => rows.map((row) => ({ ...row, lowered: row.meanings.map((m) => m.toLocaleLowerCase()) }));

/** One row: drawn again only when its Root or particle is marked or unmarked. */
const ListRow = memo(function ListRow({ lang, row, known }: { lang: Language; row: Row; known: boolean }) {
  // A Root's leads to its Root page, not prefetched: the tab holds every Root.
  const arabic = { className: styles.letters, lang: "ar", dir: "rtl", children: row.arabic } as const;
  return (
    <li className={styles.row}>
      {row.href ? <Link href={row.href} prefetch={false} {...arabic} /> : <span {...arabic} />}
      <span className={styles.meanings} {...inLanguage(lang)}>
        {row.meanings.slice(0, SHOWN_MEANINGS).join(" · ")}
      </span>
      <MemorizedSwitch entry={row.entry} known={known} name={`${STRINGS.memorized} ${row.entry.text}`} />
    </li>
  );
});

export function KnownWordsTabs({ lang, roots, particles }: { lang: Language; roots: RootRow[]; particles: ParticleRow[] }) {
  const entries = useKnownWords();
  const known = useMemo(() => knownLookup(entries), [entries]);
  const rows = useMemo<Record<Tab, Searchable[]>>(
    () => ({
      roots: searchable(
        roots.map(({ letters, meanings }) => ({
          entry: { kind: "root", text: letters },
          arabic: letters,
          href: rootPageHref(lang, letters),
          meanings,
        })),
      ),
      particles: searchable(
        particles.map(({ kind, text, indopak, meanings }) => ({
          entry: { kind, text },
          arabic: <ScriptText uthmani={text} indopak={indopak}>{(shown, script) => <span className={script || undefined}>{shown}</span>}</ScriptText>,
          meanings,
        })),
      ),
    }),
    [lang, roots, particles],
  );
  const [tab, setTab] = useState<Tab>("roots");
  const [search, setSearch] = useState("");
  // The list follows the search once typing pauses, so the box never waits for it.
  const query = useDeferredValue(search).trim();
  const shown = useMemo(() => {
    const lower = query.toLocaleLowerCase();
    return query ? rows[tab].filter((row) => finds(row, query, lower)) : rows[tab];
  }, [rows, tab, query]);
  const counts = useMemo(() => {
    const knownOf = (list: Searchable[]) => list.filter((row) => known(row.entry)).length;
    return { roots: knownOf(rows.roots), particles: knownOf(rows.particles) };
  }, [rows, known]);

  const parts = TAB_PARTS[tab];

  // Laid out in the page's own grid, as the tablist and its panel always were.
  return (
    <Tabs value={tab} onValueChange={(t) => setTab(t as Tab)} className="contents">
      <TabsList aria-label={STRINGS.knownWords} className="flex w-auto justify-start gap-1 rounded-none bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto">
        {TABS.map((t) => (
          <TabsTrigger key={t} value={t} className={TAB}>
            {TAB_PARTS[t].label}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* The tab's panel, the same count and search over either list; not a tab stop of its own, as before Radix (#306). */}
      <TabsContent value={tab} className={styles.panel} tabIndex={-1}>
        <div className={styles.head}>
          <p className={styles.count}>{STRINGS.knownWordsCount(counts.roots, roots.length, counts.particles, particles.length)}</p>
          <Input
            type="search"
            className={SEARCH_FIELD}
            aria-label={STRINGS.searchKnownWords}
            placeholder={STRINGS.searchKnownWords}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {shown.length ? (
          <ul className={styles.list} aria-label={parts.label}>
            {shown.map((row) => (
              <ListRow key={`${row.entry.kind} ${row.entry.text}`} lang={lang} row={row} known={known(row.entry)} />
            ))}
          </ul>
        ) : (
          <p className={styles.none}>{parts.none}</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
