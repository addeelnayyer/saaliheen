// The Surah index's tabs (#193), Surahs and Juz: the address of each, and the
// tab the reader last chose, remembered in this browser (storage.ts). The
// remembered tab is applied only on an arrival at Read from inside the app,
// never to a link opened directly: an arrival is in-app when the history entry
// the page is on is not the one the document was loaded at, by the Navigation
// API's entry keys (as in-parts/visits.ts reads them). A browser without the
// Navigation API never applies it, so a shared link always shows what it says.

import { readStored, store } from "./storage";

export const INDEX_TABS = ["surahs", "juz"] as const;
export type IndexTab = (typeof INDEX_TABS)[number];

/** The browser storage name of the last tab chosen. */
export const TAB_STORED_AS = "qwt-index-tab";

/** The address of tab `tab` in Language `lang`: `/{lang}` or `/{lang}/juz`. */
export const tabPath = (lang: string, tab: IndexTab) => (tab === "juz" ? `/${lang}/juz` : `/${lang}`);

/** The tab an index address names. */
export const tabAt = (pathname: string): IndexTab => (/\/juz\/?$/.test(pathname) ? "juz" : "surahs");

/** Notes `tab` as the last tab the reader chose. */
export const rememberTab = (tab: IndexTab) => store(TAB_STORED_AS, tab);

const rememberedTab = (): IndexTab => (readStored(TAB_STORED_AS) === "juz" ? "juz" : "surahs");

interface Entries {
  currentEntry: { key: string } | null;
  activation: { entry: { key: string } } | null;
}

/** Whether the page was arrived at from inside the app: its history entry is not the one the document loaded at. */
function arrivedInApp(): boolean {
  const { navigation } = window as { navigation?: Entries };
  const loadedAt = navigation?.activation?.entry.key;
  return loadedAt !== undefined && loadedAt !== navigation?.currentEntry?.key;
}

/** The tab the index opens on at `pathname`: the address's, unless an in-app arrival at Surahs finds Juz remembered. */
export function openingTab(pathname: string): IndexTab {
  const named = tabAt(pathname);
  return named === "surahs" && arrivedInApp() ? rememberedTab() : named;
}
