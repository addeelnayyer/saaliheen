"use client";

// The Surahs and Juz tabs (#193), shared by the Surah index and the Surah bar's
// quick picker: a tablist of two tabs, one search box for both, and the two
// single-column lists side by side on a track that scrolls sideways and snaps
// to one list, so a swipe moves the list with the finger and the tab underline
// slides with it; a swipe from the screen's edge is the browser's own. Tapping a
// tab or the arrow keys move the track; the track's place selects the tab. Each
// list scrolls on its own, so each tab keeps its scroll. The tab is the
// caller's (`tab`, `onTab`), which hears every change, by tap, key or swipe.
// The tabs and the search are shadcn/ui's Tabs and Input (#304), both lists
// kept mounted for the track; the Makki/Madani filter is its ToggleGroup (#307).
// The Juz follow the reader's Script; prerendered, before the Script is known,
// both Scripts' lists are there for CSS to show the right one. The Juz holding
// the latest Reading place is marked with a dot and, for a screen reader, in
// its row's name. Opening a Juz is reading, not a look-up (CONTEXT.md, Reading
// place): its first Ayah becomes its Surah's Reading place, where the Surah
// page lands and goes on moving it as the reader reads; the mobile app does the
// same.

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Juz, JuzLists, Language } from "@/dataset/reader";
import { InReadersScript } from "./as-the-reader-sets";
import { useContinuable } from "./continue-reading";
import { INDEX_TABS, type IndexTab } from "./index-tab";
import { findJuz, findSurahs, foldNames, juzHolds, juzRuns, type IndexSurah } from "./index-search";
import { landOn } from "./[surah]/ayah-at-top";
import { parseReadingPlace, type ReadingPlace } from "./reading-place";
import { leftToBrowser } from "./share/in-app";
import { recordReading } from "./synced-reading-places";
import { STRINGS } from "./strings";
import styles from "./index.module.css";

type Place = IndexSurah["revelationPlace"];

interface ListsProps {
  lang: Language;
  surahs: IndexSurah[];
  juz: JuzLists;
  tab: IndexTab;
  onTab: (tab: IndexTab) => void;
  /** Whether the Surahs tab offers the Makki/Madani filter. */
  filter?: boolean;
  /** Hears a row followed (the picker closes). */
  onFollow?: () => void;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const indexOf = (tab: IndexTab) => INDEX_TABS.indexOf(tab);

/** Where the track is, in lists: 0 at the first list, 1 at the second, between them mid-swipe. */
const placeOf = (track: HTMLElement) => track.scrollLeft / Math.max(1, track.clientWidth);

/** Puts the tab underline under the list the track is at, `at` (placeOf). */
const underline = (ink: HTMLElement | null, at: number) => ink?.style.setProperty("translate", `${at * 100}% 0`);

/**
 * The track's sideways scroll and the selected tab, kept together: a tab
 * chosen by a tap or a key moves the track to its list (at once the first
 * time, or with reduced motion); the track coming to a list by a swipe chooses
 * that list's tab, and is left to the finger and the snap; the underline
 * follows the track as it moves. The underline is also put in place whenever
 * the track is, and when the page starts listening to the track, so a move
 * made before that (a direct load of /{lang}/juz) never leaves it behind.
 */
function useTrack(tab: IndexTab, onTab: (tab: IndexTab) => void) {
  const track = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  // The list a tap or a key is moving the track to, until it is there.
  const aim = useRef<number | null>(null);
  // The tab the track itself chose, which needs no move.
  const swiped = useRef<IndexTab | null>(null);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const el = track.current!;
    const i = indexOf(tab);
    const smooth = placed.current && !reducedMotion();
    placed.current = true;
    const there = swiped.current === tab || el.scrollLeft === i * el.clientWidth;
    swiped.current = null;
    if (!there) {
      aim.current = smooth ? i : null;
      el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
    }
    underline(ink.current, placeOf(el));
  }, [tab]);

  const chosen = useEffectEvent((shown: IndexTab) => {
    if (shown === tab) return;
    swiped.current = shown;
    onTab(shown);
  });
  useEffect(() => {
    const el = track.current!;
    const follow = () => underline(ink.current, placeOf(el));
    const onScroll = () => {
      follow();
      const at = placeOf(el);
      if (aim.current === null) chosen(INDEX_TABS[Math.round(at)] ?? INDEX_TABS[0]);
      else if (Math.abs(at - aim.current) < 0.01) aim.current = null;
    };
    const onScrollEnd = () => (aim.current = null);
    follow();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", follow);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", follow);
    };
  }, []);
  return { track, ink };
}

/** A tab: the page's own type, in its weight, muted until chosen or hovered; its outline in the site's 6px corners. */
const TAB_CLASS =
  "block h-auto flex-none rounded-[6px] border-0 px-0 pt-2.5 pb-3 text-center text-[length:inherit] font-semibold whitespace-normal text-muted-foreground transition-[color] duration-200 after:hidden hover:text-foreground data-[state=active]:text-foreground motion-reduce:transition-none";

/**
 * The two tabs, over a line, with the underline the track moves (`ink`).
 * Radix's arrow, Home and End keys move between them; only the selected tab
 * is a tab stop, whatever the track chose.
 */
function Tablist({ tab, counts, ink }: { tab: IndexTab; counts: Record<IndexTab, number>; ink: React.Ref<HTMLSpanElement> }) {
  return (
    <TabsList
      variant="line"
      aria-label={STRINGS.findBy}
      className="relative grid w-auto shrink-0 grid-cols-2 items-stretch gap-0 border-b border-border p-0 group-data-[orientation=horizontal]/tabs:h-auto"
    >
      {INDEX_TABS.map((t) => (
        <TabsTrigger key={t} value={t} tabIndex={t === tab ? 0 : -1} className={TAB_CLASS}>
          {t === "juz" ? STRINGS.juzTab : STRINGS.surahsTab} <small className="ms-1.5 text-[length:smaller] font-normal text-muted-foreground">{counts[t]}</small>
        </TabsTrigger>
      ))}
      <span ref={ink} className={styles.ink} aria-hidden="true" />
    </TabsList>
  );
}

/** The search box; `label` names what it searches, the Surahs and Juz unless said. */
export function Search({ query, onQuery, label = STRINGS.searchBoth }: { query: string; onQuery: (q: string) => void; label?: string }) {
  return (
    <label className={styles.search}>
      {/* The tinted pill, bordered and on the paper while focused, in place of the site's outline. */}
      <Input
        type="search"
        autoComplete="off"
        className="rounded-full border-transparent bg-secondary py-[7px] ps-[42px] pe-4 text-[14.5px] transition-[border-color,background-color] duration-150 placeholder:opacity-85 focus:border-primary focus:bg-background focus:outline-none! motion-reduce:transition-none"
        placeholder={STRINGS.search}
        aria-label={label}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    </label>
  );
}

/** The filter's choices, by their ToggleGroup value: "all", or a Place. */
const FILTERS: [Place | "all", string][] = [
  ["all", STRINGS.all],
  ["makki", STRINGS.makki],
  ["madani", STRINGS.madani],
];

/**
 * The Makki/Madani filter, at the head of the Surahs list; out of sight (and of a screen reader's reach) on the Juz tab.
 * A ToggleGroup (#307) of a button per choice, the chosen one pressed; choosing the pressed one again keeps it.
 */
function Filter({ place, onPlace, hidden }: { place: Place | null; onPlace: (p: Place | null) => void; hidden: boolean }) {
  return (
    <ToggleGroup
      type="single"
      value={place ?? "all"}
      onValueChange={(chosen) => chosen && onPlace(chosen === "all" ? null : (chosen as Place))}
      rovingFocus={false}
      variant="segment"
      size="segment"
      className={cn("mt-2 mb-1 gap-0.5 rounded-full bg-secondary p-[3px]", hidden && "invisible")}
      aria-label={STRINGS.filterLabel}
    >
      {FILTERS.map(([value, label]) => (
        <ToggleGroupItem
          key={value}
          value={value}
          className="px-4 py-0.5 text-[13px] transition-none data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-primary data-[state=on]:shadow-[0_1px_2px_var(--shadow)]"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** A Surah's row, leading to its Surah page, or to `href` (a Grammar page's Surah picker, #279: not prefetched). */
export function SurahRow({ lang, surah, href, onFollow }: { lang: Language; surah: IndexSurah; href?: string; onFollow?: () => void }) {
  return (
    <li>
      <Link className={styles.row} href={href ?? `/${lang}/${surah.number}`} prefetch={href ? false : undefined} onClick={onFollow}>
        <span className={styles.no}>{surah.number}</span>
        <span className={styles.info}>
          <span className={styles.latin}>{surah.nameLatin}</span>
          <span className={styles.meta}>
            <span className={surah.revelationPlace === "madani" ? `${styles.tag} ${styles.madani}` : styles.tag}>{STRINGS[surah.revelationPlace]}</span>
            <span className={styles.ayat}>{STRINGS.ayahCount(surah.ayahCount)}</span>
          </span>
        </span>
        <span className={styles.ar} lang="ar" dir="rtl">
          {surah.nameArabic}
        </span>
      </Link>
    </li>
  );
}

/** The Surah a Juz starts in. */
const surahOf = (juz: Juz) => parseReadingPlace(juz.firstAyah)!.surah;

/**
 * Reads from a Juz's first Ayah (`surah:ayah`): records reading there, so its
 * Surah page opens at it. Already on that Surah's page (the Surah bar's
 * picker), the Ayah is brought to the top in place; answers whether it was.
 */
function readFromJuz(firstAyah: string, here: boolean): boolean {
  const place = parseReadingPlace(firstAyah);
  if (place) recordReading(place);
  const ayah = here ? document.getElementById(firstAyah) : null;
  if (ayah) landOn(ayah, true);
  return ayah !== null;
}

function JuzRow({ lang, juz, runs, latest, onFollow }: { lang: Language; juz: Juz; runs: string; latest: boolean; onFollow?: () => void }) {
  const follow = (e: MouseEvent) => {
    onFollow?.();
    if (readFromJuz(juz.firstAyah, !leftToBrowser(e))) e.preventDefault();
  };
  return (
    <li>
      <Link className={latest ? `${styles.row} ${styles.here}` : styles.row} href={`/${lang}/${surahOf(juz)}`} onClick={follow}>
        <span className={styles.no}>{juz.number}</span>
        <span className={styles.info}>
          <span className={styles.latin}>{STRINGS.juz(juz.number)}</span>
          <span className={styles.ayat}>{runs}</span>
          {latest && <span className={styles.said}>, {STRINGS.latestReadingPlace}</span>}
        </span>
        <span className={styles.ar} lang="ar" dir="rtl">
          {juz.name}
        </span>
      </Link>
    </li>
  );
}

/** The list a tab shows, or what to search by when the search leaves it empty. */
export function ListOr({ empty, children }: { empty: string; children: ReactNode[] }) {
  return children.length > 0 ? <ul className={styles.list}>{children}</ul> : <p className={styles.empty}>{empty}</p>;
}

interface JuzListProps {
  lang: Language;
  surahs: IndexSurah[];
  query: string;
  found: Juz[];
  latest: ReadingPlace | null;
  onFollow?: () => void;
}

function JuzList({ lang, surahs, query, found, latest, onFollow }: JuzListProps) {
  return (
    <ListOr empty={STRINGS.noJuz(query.trim())}>
      {found.map((j) => (
        <JuzRow key={j.number} lang={lang} juz={j} runs={juzRuns(j, surahs)} latest={!!latest && juzHolds(j, latest.surah, latest.ayah)} onFollow={onFollow} />
      ))}
    </ListOr>
  );
}

/** The latest Reading place, or null: none before the page runs. */
function useLatestPlace(surahs: IndexSurah[]): ReadingPlace | null {
  const [latest] = useContinuable(surahs);
  return latest ? { surah: latest.surah.number, ayah: latest.ayah } : null;
}

/** A tab's list, on the track beside the other: always there, and no tab stop of its own, as its rows are. */
function Panel({ tab, children }: { tab: IndexTab; children: ReactNode }) {
  return (
    <TabsContent value={tab} forceMount className={styles.panel} tabIndex={undefined}>
      {children}
    </TabsContent>
  );
}

export function IndexLists({ lang, surahs, juz, tab, onTab, filter = false, onFollow }: ListsProps) {
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const names = useMemo(() => foldNames(surahs), [surahs]);
  const latest = useLatestPlace(surahs);
  const { track, ink } = useTrack(tab, onTab);
  const shown = findSurahs(query, surahs, names).filter((s) => !place || s.revelationPlace === place);
  const juzIn = (list: Juz[]) => <JuzList lang={lang} surahs={surahs} query={query} found={findJuz(query, list, surahs, names)} latest={latest} onFollow={onFollow} />;

  return (
    <Tabs value={tab} onValueChange={(t) => onTab(t as IndexTab)} className={styles.lists}>
      <Tablist tab={tab} counts={{ surahs: surahs.length, juz: juz.uthmani.length }} ink={ink} />
      <Search query={query} onQuery={setQuery} />
      <div ref={track} className={styles.track}>
        <Panel tab="surahs">
          {filter && <Filter place={place} onPlace={setPlace} hidden={tab !== "surahs"} />}
          <ListOr empty={STRINGS.noSurah(query.trim())}>
            {shown.map((s) => (
              <SurahRow key={s.number} lang={lang} surah={s} onFollow={onFollow} />
            ))}
          </ListOr>
        </Panel>
        <Panel tab="juz">
          <InReadersScript uthmani={<div className={styles.forUthmani}>{juzIn(juz.uthmani)}</div>} indopak={<div className={styles.forIndopak}>{juzIn(juz.indopak)}</div>} />
        </Panel>
      </div>
    </Tabs>
  );
}
