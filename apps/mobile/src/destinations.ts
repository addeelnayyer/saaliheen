// Read, Explore and Me (#192): the app's three tabs, what Explore and Me hold,
// and when a Surah screen's tab bar gets out of the way. The same entries and
// words as the website's (apps/web), in the same order. Entries the app has no
// screen of its own for open the website's page in the reader's Language.
// This module imports nothing from React Native or Expo, so the app's
// scenarios (features/read-explore-and-me.feature) run it in Node.

import type { AppAccount, SignInMethod, SignedInAs } from "./account";
import { keepLanguage, LANGUAGES, storedLanguage } from "./language";
import type { DeviceStorage, Language } from "./quran-analysis";
import type { DeviceReadingPlaces } from "./reading-places";
import { INDEX_TABS, type IndexTab } from "./surah-index";

export type Destination = "read" | "explore" | "me";

/** The icon over a tab's word: an open book for Read, a compass for Explore, a person for Me. */
export type TabIcon = "open-book" | "compass" | "person";

/** One tab of the tab bar: its destination, the word it shows and the icon over it. */
export interface Tab {
  destination: Destination;
  label: string;
  icon: TabIcon;
}

/** A screen of the app's own an Explore card opens, by its route. */
export type AppScreen = "/explore/quran-chat";

/** One way of exploring on Explore: its name, one line in the reader's Language, and what it opens. */
export interface ExploreCard {
  name: string;
  line: string;
  /** The website address it opens, on the app's origin, or the app's own screen for it (Quran Chat's, #81). */
  opens: { website: string } | { screen: AppScreen };
}

export interface ExploreScreen {
  title: string;
  cards: ExploreCard[];
}

/** One Reading place in Me: the Surah it opens and the Ayah it opens at, as the reader sees it. */
export interface MeReadingPlace {
  surah: number;
  ayah: number;
  label: string;
}

/** One way of signing in Me offers, inside the app: the method, and its button's words. */
export interface MeSignInMethod {
  method: SignInMethod;
  label: string;
}

/** What Me offers to do with the Account signed in to. */
export type MeAccountAction = "Sign out" | "Delete Account";

/** One entry of Me, in order. `opens` is set for an entry that opens a website page. */
export type MeEntry =
  | { kind: "sign-in"; label: string; methods: MeSignInMethod[] }
  | { kind: "account"; label: string; signedInAs: string; actions: MeAccountAction[] }
  | { kind: "reading-places"; label: string; places: MeReadingPlace[] }
  | { kind: "known-words"; label: string }
  | { kind: "language"; label: string; choices: [Language, string][]; chosen: Language; choose(language: Language): Promise<void> }
  | { kind: "setting"; setting: MeSetting; label: string }
  | { kind: "document"; label: string; opens: string };

export interface MeScreen {
  title: string;
  entries: MeEntry[];
}

/** Whether a Surah screen's tab bar shows, as the reader scrolls and the Recitation bar comes and goes. */
export interface TabBarFollower {
  readonly shown: boolean;
  /** The Surah screen's list scrolled to `y` points from its top. */
  scrolledTo(y: number): void;
  /** The Recitation bar came on screen (true) or left it (false). */
  recitationBar(onScreen: boolean): void;
}

const TABS: Tab[] = [
  { destination: "read", label: "Read", icon: "open-book" },
  { destination: "explore", label: "Explore", icon: "compass" },
  { destination: "me", label: "Me", icon: "person" },
];

/**
 * Each tab icon's path on a 24-point grid, stroked, not filled. Copied from
 * the website's site bar (apps/web/src/app/[lang]/site-bar.tsx, ICON_PATHS),
 * so both apps draw the same icons; the app's scenarios check they agree.
 */
const TAB_ICON_PATHS: Record<TabIcon, string> = {
  "open-book": "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5",
};

/** The path a tab icon is drawn with, on a 24-point grid. */
export const tabIconPath = (icon: TabIcon): string => TAB_ICON_PATHS[icon];

/** The tab bar's tabs, in order. */
export const tabs = (): Tab[] => TABS.map((tab) => ({ ...tab }));

/** The Read screen's index tabs, in order (#193): Surahs, then Juz. */
export const indexTabs = (): IndexTab[] => [...INDEX_TABS];

/** The tab the app opens on. */
export const opensOn = (): Destination => "read";

/** Each way of exploring: its name, the website page or the app's own screen it opens, and its line in each Language (drafted Urdu, DELIVERY/drafted-urdu.md). */
const WAYS_OF_EXPLORING: ({ name: string; line: Record<Language, string> } & ({ page: string } | { screen: AppScreen }))[] = [
  {
    name: "Themes",
    page: "themes",
    line: {
      en: "What the Quran speaks of, by subject, with every Ayah on each.",
      ur: "قرآن کن موضوعات پر بات کرتا ہے، ہر موضوع کی تمام آیات کے ساتھ۔",
    },
  },
  {
    name: "Iltifat",
    page: "iltifat",
    line: {
      en: "Sudden turns between I, We, You and He that still mean the same person.",
      ur: "میں، ہم، تم اور وہ کے درمیان اچانک موڑ، جن سے مراد وہی ہستی رہتی ہے۔",
    },
  },
  // #199: the website's Supplications card; like every entry here, without a count (ADR 0029).
  {
    name: "Supplications",
    page: "supplications",
    line: {
      en: "What people in the Quran ask of Allah, in order, with who says each.",
      ur: "قرآن میں لوگ اللہ سے کیا مانگتے ہیں، ترتیب سے، اور ہر دعا کون کرتا ہے۔",
    },
  },
  // #81: Quran Chat, last as on the website's Explore, opening the app's own screen; its line the website's (EXPLORE_LINES).
  {
    name: "Quran Chat",
    screen: "/explore/quran-chat",
    line: {
      en: "Ask about the Quran, answered from its translations and Tafsir.",
      ur: "قرآن کے بارے میں پوچھیے، جواب اس کے تراجم اور تفسیر سے۔",
    },
  },
];

/** The website's page `page` in `language`, on `origin`. */
const websitePage = (origin: string, language: Language, page: string) => `${origin}/${language}/${page}`;

/** Explore in `language`, its entries opening pages of the website at `origin`. */
export const explore = (origin: string, language: Language): ExploreScreen => ({
  title: "Explore",
  cards: WAYS_OF_EXPLORING.map((way) => ({
    name: way.name,
    line: way.line[language],
    opens: "page" in way ? { website: websitePage(origin, language, way.page) } : { screen: way.screen },
  })),
});

/** A reader setting Me holds below the Language. */
export type MeSetting = "script" | "translation" | "allahReferenceColour" | "knownWordsColour" | "hideWordMeanings" | "arabicSize" | "meaningSize" | "sectionMarks";

/** Me's settings, below the Language, by the names the settings sheet gives them. */
const SETTINGS: [setting: MeSetting, label: string][] = [
  ["script", "Arabic script"],
  ["translation", "Ayah translation"],
  ["allahReferenceColour", "Allah reference colour"],
  ["knownWordsColour", "Known words colour"],
  ["hideWordMeanings", "Hide Word meanings"],
  ["arabicSize", "Arabic size"],
  ["meaningSize", "Meaning size"],
  ["sectionMarks", "Section marks"],
];

/** Me's documents, last, each a website page. */
const DOCUMENTS: [label: string, page: string][] = [
  ["Credits", "credits"],
  ["Privacy", "privacy"],
  ["Terms", "terms"],
];

/** Me's ways of signing in (#75), Google then Apple, as on the website's Sign-in page. */
const SIGN_IN_METHODS: MeSignInMethod[] = [
  { method: "google", label: "Sign in with Google" },
  { method: "apple", label: "Sign in with Apple" },
];

/** Me's first entry: signed out, Sign in inside the app; signed in, the Account and what to do with it. */
const accountEntry = (signedIn: SignedInAs | null): MeEntry =>
  signedIn
    ? { kind: "account", label: "Account", signedInAs: signedIn.email, actions: ["Sign out", "Delete Account"] }
    : { kind: "sign-in", label: "Sign in", methods: SIGN_IN_METHODS.map((m) => ({ ...m })) };

/**
 * What Me says about the Account, in the website's words where it has them
 * (apps/web/src/app/[lang]/strings.ts): its email, and the confirmation before
 * deleting it; and what it says when signing in or deleting ends otherwise
 * than asked (a cancelled sheet says nothing).
 */
export const ACCOUNT_WORDS = {
  signedInAs: "Signed in as",
  deleteAccountTitle: "Delete your Account?",
  deleteAccountWarning:
    "Your Account and all its data are deleted at once, with no grace period, and you are signed out on every device. This cannot be undone. Reading never needs an Account.",
  cancel: "Cancel",
  signIn: {
    "no connection": "Signing in needs a connection. Please try again when you're online.",
    refused: "Sign-in didn't work. Please try again later.",
  },
  deleteAccount: {
    "no connection": "Deleting your Account needs a connection. Please try again when you're online.",
    refused: "Your Account wasn't deleted. Sign out, sign in again, and try once more.",
  },
} as const;

/** What Me says once signing in or deleting the Account has ended as `outcome`, or null when it says nothing. */
export const accountMessage = (action: "signIn" | "deleteAccount", outcome: string): string | null =>
  (ACCOUNT_WORDS[action] as Record<string, string>)[outcome] ?? null;

/** A Reading place as Me lists it: "2. Al-Baqarah · Ayah 255". */
const readingPlaceLabel = (surah: number, name: string, ayah: number) => `${surah}. ${name} · Ayah ${ayah}`;

/**
 * Me on this device: its Language is the one kept on `device` (as the settings
 * sheet kept it, under the website's key), and choosing one keeps it there; its
 * website entries open on `origin` in that Language. Its first entry is the
 * Account's (#75): Sign in while `account` is signed in to none (or there is no
 * `account`), else who it is signed in as.
 */
export async function me(options: {
  origin: string;
  device: DeviceStorage;
  readingPlaces: DeviceReadingPlaces;
  surahName: (surah: number) => string;
  account?: Pick<AppAccount, "signedInAs">;
}): Promise<MeScreen> {
  const { origin, device, readingPlaces, surahName, account } = options;
  const [chosen, places, signedIn] = await Promise.all([storedLanguage(device), readingPlaces.list(), account?.signedInAs() ?? null]);
  const page = (name: string) => websitePage(origin, chosen, name);
  return {
    title: "Me",
    entries: [
      accountEntry(signedIn),
      {
        kind: "reading-places",
        label: "Reading places",
        places: places.map(({ surah, ayah }) => ({ surah, ayah, label: readingPlaceLabel(surah, surahName(surah), ayah) })),
      },
      // The Known words page (#253), in the app.
      { kind: "known-words", label: "Known words" },
      { kind: "language", label: "Language", choices: LANGUAGES, chosen, choose: (language) => keepLanguage(device, language) },
      ...SETTINGS.map(([setting, label]) => ({ kind: "setting" as const, setting, label })),
      ...DOCUMENTS.map(([label, name]) => ({ kind: "document" as const, label, opens: page(name) })),
    ],
  };
}

/** Within this many points of the top, the tab bar shows. */
const NEAR_THE_TOP = 80;
/** Scrolling up this many points from the furthest read down brings the tab bar back. */
const BACK_ON_SCROLLING_UP = 50;

/** A Surah screen's tab bar, shown as the screen opens at its top. */
export function followTabBar(): TabBarFollower {
  let wanted = true;
  let recitationBarOnScreen = false;
  let lastY = 0;
  /** The furthest point read down to since the reader last scrolled down. */
  let furthest = 0;
  return {
    get shown() {
      return wanted && !recitationBarOnScreen;
    },
    scrolledTo(y) {
      if (y <= NEAR_THE_TOP) wanted = true;
      else if (y > lastY) {
        wanted = false;
        furthest = y;
      } else if (furthest - y >= BACK_ON_SCROLLING_UP) wanted = true;
      lastY = y;
    },
    recitationBar(onScreen) {
      recitationBarOnScreen = onScreen;
    },
  };
}
