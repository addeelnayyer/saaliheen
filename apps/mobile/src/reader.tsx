// The reader's choices, shared by every screen: Script, Language, the Ayah
// translation switch, and Arabic size and Meaning size. Sizes are the Quran
// Analysis module's (kept on the device under the website's keys); Script and
// the Ayah translation switch are kept beside them under the website's keys too,
// and the Language under qwt-language (src/language.ts), chosen in Me. The device's Reading places
// (src/reading-places.ts) are kept beside them under the website's key, and the
// Allah reference colour switch is the Quran Analysis module's (#151), as are
// the Hide Word meanings switch (#247), the Known words colour switch (#253)
// and the Section marks choice (#194). The Known Roots (#253) are kept beside
// them under the website's key (src/known-words.ts).
// Downloaded Surahs are kept in the device's files (#73).
// Signed in to an Account (#75), the Script, Language, Reading places and
// Known words (#254) are kept through the Account's storage, which also brings
// them to the Account, and are read again each time the Account syncs.

import { fetch as expoFetch } from "expo/fetch";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { openAccount, type AppAccount } from "./account";
import { appVersion, dataOrigin, deviceFiles, deviceStorage, passageHeadings, tafsir } from "./config";
import { deviceConnection, deviceKeychain, deviceSheet } from "./device-account";
import { knownLookup, markKnown, type KnownWordEntry, type KnownWordKey } from "@saaliheen/known-words";
import { openKnownWords, type KnownLookup } from "./known-words";
import { keepLanguage, storedLanguage } from "./language";
import {
  DEFAULT_SIZE,
  openQuranAnalysis,
  SIZES,
  type DeviceStorage,
  type Language,
  type QuranAnalysis,
  type Script,
  type SectionMarksChoice,
  type SizeSetting,
  type Sizes,
} from "./quran-analysis";
import { openReadingPlaces, type DeviceReadingPlaces } from "./reading-places";

type Direction = "larger" | "smaller";
/** Whether Larger and Smaller can still change each size. */
type SizeLimits = Record<SizeSetting, Record<Direction, boolean>>;

export interface Reader {
  analysis: QuranAnalysis;
  /** The Account this device signs in to (#75). */
  account: AppAccount;
  /** This device's Reading places. */
  readingPlaces: DeviceReadingPlaces;
  script: Script;
  language: Language;
  ayahTranslation: boolean;
  /** Whether Allah references show their Arabic in Allah reference colour (#151). */
  allahReferenceColour: boolean;
  /** Whether Word cards leave their Word meanings off until tapped (#247). */
  hideWordMeanings: boolean;
  /** Whether the Word cards of Known Roots and Known particles are tinted (#253, #255). */
  knownWordsColour: boolean;
  /** Whether a Root or particle is a Known word on this device (#253, #255), the Account's merged in when signed in (#254). */
  known: KnownLookup;
  /** Which Section marks a Surah's screen shows (#194). */
  sectionMarks: SectionMarksChoice;
  sizes: Sizes;
  limits: SizeLimits;
  setScript(script: Script): void;
  setLanguage(language: Language): void;
  setAyahTranslation(on: boolean): void;
  setAllahReferenceColour(on: boolean): void;
  setHideWordMeanings(on: boolean): void;
  setKnownWordsColour(on: boolean): void;
  /** Marks a Root (`rootKey`) or a particle (`particleKey`) as a Known word, or unmarks it, everywhere at once. */
  markKnown(key: KnownWordKey, known: boolean): void;
  setSectionMarks(choice: SectionMarksChoice): void;
  changeSize(setting: SizeSetting, direction: Direction): void;
  resetSizes(): void;
}

const STORED_AS = { script: "qwt-script", translation: "qwt-translation" } as const;

const START_SIZES: Sizes = { arabicSize: DEFAULT_SIZE, meaningSize: DEFAULT_SIZE };

/** Whether Larger and Smaller can still change a size of `size` percent: not at the last step either way. */
const limitsAt = (size: number): Record<Direction, boolean> => ({ larger: size !== SIZES[SIZES.length - 1], smaller: size !== SIZES[0] });

const ReaderContext = createContext<Reader | null>(null);

/** The reader's choices; only inside ReaderProvider. */
export function useReader(): Reader {
  const reader = useContext(ReaderContext);
  if (!reader) throw new Error("useReader outside ReaderProvider");
  return reader;
}

/** The stored Script, Ayah translation switch and Language, each falling back to the website's default. */
async function storedChoices(storage: DeviceStorage) {
  const [script, translation, language] = await Promise.all([
    storage.getItem(STORED_AS.script),
    storage.getItem(STORED_AS.translation),
    storedLanguage(storage),
  ]);
  return {
    script: (script === "indopak" ? "indopak" : "uthmani") as Script,
    ayahTranslation: translation === "on",
    language,
  };
}

/** The app's Account, opened once as the app launches; Quran Chat's answers stream through expo/fetch, whose bodies are read as they arrive (#81). */
const openAppAccount = () =>
  openAccount({
    origin: dataOrigin(),
    device: deviceStorage,
    keychain: deviceKeychain,
    sheet: deviceSheet,
    connection: deviceConnection,
    streamingFetch: expoFetch as unknown as typeof fetch,
  });

export function ReaderProvider({ children }: { children: ReactNode }) {
  const account = useMemo(openAppAccount, []);
  const storage = account.storage;
  const analysis = useMemo(
    () => openQuranAnalysis({ origin: dataOrigin(), device: storage, files: deviceFiles, appVersion: appVersion(), passageHeadings: passageHeadings(), tafsir: tafsir() }),
    [storage],
  );
  const readingPlaces = useMemo(() => openReadingPlaces(storage), [storage]);
  const knownWords = useMemo(() => openKnownWords(storage), [storage]);
  const [script, setScriptState] = useState<Script>("uthmani");
  const [language, setLanguageState] = useState<Language>("ur");
  const [ayahTranslation, setTranslationState] = useState(false);
  const [sizes, setSizes] = useState<Sizes>(START_SIZES);
  const [allahReferenceColour, setAllahReferenceColourState] = useState(true);
  const [hideWordMeanings, setHideWordMeaningsState] = useState(false);
  const [knownWordsColour, setKnownWordsColourState] = useState(false);
  const [knownEntries, setKnownEntries] = useState<KnownWordEntry[]>([]);
  const known = useMemo(() => knownLookup(knownEntries), [knownEntries]);
  const [sectionMarks, setSectionMarksState] = useState<SectionMarksChoice>("hizb");

  /** Shows `next` sizes once they are kept. */
  const showSizes = useCallback(async (next: Promise<Sizes>) => setSizes(await next), []);

  /** Shows the stored Script, Ayah translation switch and Language. */
  const showStoredChoices = useCallback(
    () =>
      void storedChoices(storage).then((stored) => {
        setScriptState(stored.script);
        setTranslationState(stored.ayahTranslation);
        setLanguageState(stored.language);
      }),
    [storage],
  );

  /** Shows the kept Known words. */
  const showKnownWords = useCallback(() => void knownWords.entries().then(setKnownEntries), [knownWords]);

  // The Account's sync may bring another Script or Language, or other Known words, to the device.
  useEffect(
    () =>
      account.subscribe(() => {
        showStoredChoices();
        showKnownWords();
      }),
    [account, showStoredChoices, showKnownWords],
  );

  useEffect(() => {
    showStoredChoices();
    void showSizes(analysis.sizes());
    void analysis.allahReferenceColour().then(setAllahReferenceColourState);
    void analysis.hideWordMeanings().then(setHideWordMeaningsState);
    void analysis.knownWordsColour().then(setKnownWordsColourState);
    showKnownWords();
    void analysis.sectionMarks().then(setSectionMarksState);
  }, [analysis, showKnownWords, showSizes, showStoredChoices]);

  const reader = useMemo<Reader>(
    () => ({
      analysis,
      account,
      readingPlaces,
      script,
      language,
      ayahTranslation,
      allahReferenceColour,
      hideWordMeanings,
      knownWordsColour,
      known,
      sectionMarks,
      sizes,
      limits: { arabicSize: limitsAt(sizes.arabicSize), meaningSize: limitsAt(sizes.meaningSize) },
      setScript(next) {
        setScriptState(next);
        void storage.setItem(STORED_AS.script, next);
      },
      setLanguage(next) {
        setLanguageState(next);
        void keepLanguage(storage, next);
      },
      setAyahTranslation(on) {
        setTranslationState(on);
        void storage.setItem(STORED_AS.translation, on ? "on" : "off");
      },
      setAllahReferenceColour(on) {
        setAllahReferenceColourState(on);
        void analysis.setAllahReferenceColour(on);
      },
      setHideWordMeanings(on) {
        setHideWordMeaningsState(on);
        void analysis.setHideWordMeanings(on);
      },
      setKnownWordsColour(on) {
        setKnownWordsColourState(on);
        void analysis.setKnownWordsColour(on);
      },
      // Shown at once, so every open screen follows the mark, then as kept, so a
      // mark made before the kept Known words were first read is not lost.
      markKnown(key, on) {
        setKnownEntries((now) => markKnown(now, key, on, Date.now()));
        void knownWords.mark(key, on).then(setKnownEntries);
      },
      // Kept before it is shown, so the Surah screen's reload reads the new choice.
      setSectionMarks: (choice) => void analysis.setSectionMarks(choice).then(setSectionMarksState),
      changeSize: (setting, direction) => void showSizes(analysis.changeSize(setting, direction)),
      resetSizes: () => void showSizes(analysis.resetSizes()),
    }),
    [
      analysis,
      account,
      storage,
      readingPlaces,
      knownWords,
      script,
      language,
      ayahTranslation,
      allahReferenceColour,
      hideWordMeanings,
      knownWordsColour,
      known,
      sectionMarks,
      sizes,
      showSizes,
    ],
  );

  return <ReaderContext.Provider value={reader}>{children}</ReaderContext.Provider>;
}

/** Arabic size and Meaning size as the scales the styles multiply by. */
export function useScales() {
  const { sizes } = useReader();
  return { arabic: sizes.arabicSize / 100, meaning: sizes.meaningSize / 100 };
}
