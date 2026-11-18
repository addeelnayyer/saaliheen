// Read, Explore and Me (#192): the destinations on every reading page. From
// 900px wide they sit on the top bar after the brand, with Sign in while
// signed out; below it the top bar keeps the brand and Sign in, and the
// destinations are a tab bar along the foot of the screen. The destination a
// page belongs to is marked. The top bar and the tab bar are two landmarks of
// the same name, of which CSS shows one (site-bar.module.css). On a Surah page
// the Surah bar holds the top bar, and the tab bar leaves while reading down
// and while the Recitation bar is on screen ([surah]/surah-screen.tsx).

import Link from "next/link";
import type { Language } from "@/dataset/reader";
import { explorePath } from "./explore/back-to-explore";
import { KeepStoredSettings } from "./settings-drawer";
import { SignInLink } from "./sign-in-link";
import { STRINGS } from "./strings";
import styles from "./site-bar.module.css";

export const DESTINATIONS = ["read", "explore", "me"] as const;
export type Destination = (typeof DESTINATIONS)[number];

/** Where each destination leads in `lang`. */
const addressOf = (destination: Destination, lang: Language) =>
  ({ read: `/${lang}`, explore: explorePath(lang), me: `/${lang}/me` })[destination];

/** The pages under each destination other than Read, by their path after the Language. */
const UNDER: Record<Exclude<Destination, "read">, RegExp> = {
  explore: /^\/(explore|themes|roots|iltifat|supplications|grammar)(\/|$)/,
  me: /^\/(me|sign-in|credits|privacy|terms)(\/|$)/,
};

/** The destination the page at `path` (after the Language) belongs to: Read for the Surah index and Surahs. */
export const destinationOf = (path: string): Destination =>
  (["explore", "me"] as const).find((d) => UNDER[d].test(path)) ?? "read";

/** Read, Explore and Me as links, the current one marked. */
function DestinationLinks({ lang, current, icons }: { lang: Language; current: Destination; icons?: boolean }) {
  return DESTINATIONS.map((d) => (
    <Link key={d} className={styles.destination} href={addressOf(d, lang)} aria-current={d === current ? "page" : undefined}>
      {icons && <Icon destination={d} />}
      <span>{STRINGS[d]}</span>
    </Link>
  ));
}

const ICON_PATHS: Record<Destination, string> = {
  read: "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5",
  explore: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5",
};

function Icon({ destination }: { destination: Destination }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON_PATHS[destination]} />
    </svg>
  );
}

/** The brand, leading to the Surah index in `lang`. */
export function Brand({ lang }: { lang: Language }) {
  return (
    // Named by its visible brand, so it is not a second "index" link beside a page's own.
    <Link className={styles.brand} href={`/${lang}`} aria-label={STRINGS.brand}>
      <span className={styles.mark} aria-hidden="true">
        ص
      </span>
      <span className={styles.name}>{STRINGS.brand}</span>
    </Link>
  );
}

/** The top bar: the brand, the destinations from 900px wide, and Sign in while signed out. */
export function TopBar({ lang, path }: { lang: Language; path: string }) {
  return (
    <header className={styles.bar}>
      <Brand lang={lang} />
      <nav className={styles.top} aria-label={STRINGS.destinations}>
        <DestinationLinks lang={lang} current={destinationOf(path)} />
      </nav>
      <SignInLink lang={lang} />
      <KeepStoredSettings />
    </header>
  );
}

/** The tab bar along the foot of the screen, below 900px wide. */
export function TabBar({ lang, path }: { lang: Language; path: string }) {
  return (
    <nav className={styles.tabs} aria-label={STRINGS.destinations}>
      <DestinationLinks lang={lang} current={destinationOf(path)} icons />
    </nav>
  );
}

/**
 * The bars of a reading page. `path` is the page's path after the Language
 * (`""` for the index, `/themes` for the Themes list): it says which
 * destination the page belongs to.
 */
export function SiteBar({ lang, path }: { lang: Language; path: string }) {
  return (
    <>
      <TopBar lang={lang} path={path} />
      <TabBar lang={lang} path={path} />
    </>
  );
}
