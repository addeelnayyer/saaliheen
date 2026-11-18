// Interface strings. The interface is always English; the Language (/ur, /en)
// only chooses the language of the Word meanings, Ayah translations and Root
// dialog meanings, which carry their own lang and dir.

import type { Language } from "@/dataset/reader";
import type { LimitName } from "@saaliheen/quran-chat";
import type { SupplicationKind } from "@/supplications/supplications";

export const STRINGS = {
  brand: "Saaliheen",
  prev: "← Previous",
  next: "Next →",
  surahBarLabel: "Surah",
  ayah: (n: number) => `Ayah ${n}`,
  /** An Ayah heading's share button, by the Ayah's `surah:ayah`. */
  shareAyah: (ayah: string) => `Share Ayah ${ayah}`,
  copied: "Copied",
  copyFailed: "Couldn't copy",
  ayahCount: (n: number) => `${n.toLocaleString("en-US")} ayahs`,
  makki: "Meccan",
  madani: "Medinan",
  noMeaning: "—",
  /** Shown for a Lemma QUL gives no text: the Root's Word locations that have no QUL Lemma. */
  noLemma: "—",
  indexTitle: "Surah index",
  search: "Search by name or number",
  all: "All",
  filterLabel: "Revelation",
  continueReading: "Continue reading",
  /** An Ayah by its Surah's name, as the Continue reading card shows it: "Al-Kahf · Ayah 45". */
  ayahOf: (name: string, ayah: number) => `${name} · Ayah ${ayah}`,
  /** The Surah index's Surahs and Juz tabs (#193): the tablist, the one search box, each tab's empty result, a Juz row. */
  surahsTab: "Surahs",
  juzTab: "Juz",
  findBy: "Find by",
  searchBoth: "Search Surahs and Juz",
  noSurah: (q: string) => `No Surah matches “${q}”. Try a number from 1 to 114.`,
  noJuz: (q: string) => `No Juz matches “${q}”. Try a number from 1 to 30 or a Surah name.`,
  juz: (n: number) => `Juz ${n}`,
  latestReadingPlace: "latest Reading place",
  /** The Surah bar's quick picker of Surahs and Juz (#193). */
  picker: "Go to a Surah or Juz",
  closePicker: "Close",
  credits: "Credits",
  /** A Grammar page (#275): each Ayah's Words with their Word meanings and Grammar lines. */
  grammar: "Grammar",
  grammarOf: (name: string) => `${name} · ${STRINGS.grammar}`,
  /** In place of a Grammar line, under a Word the Corpus divides differently from Saaliheen's text (ADR 0064). */
  noWordGrammar: "No Word grammar",
  /** The Word grammar dialog (#277): a Word's Segments, each with its Part of speech and features. */
  wordGrammarLabel: "Word grammar",
  segmentsTitle: "Segments",
  /** A Segment the Corpus writes with no letters of its own. */
  emptySegment: "no text",
  /** Said to an Indo-Pak reader only: the Segments are the Corpus's own text (ADR 0064). */
  segmentsInUthmani: "The Segments are in the Uthmani Script, as the Quranic Arabic Corpus writes them.",
  /** Quran Grammar (#279): its Explore card, and the Surah picker at a Grammar page's head, which searches the Surahs alone. */
  quranGrammar: "Quran Grammar",
  /** The Grammar guide (#280): how to read a Grammar page, linked from every Grammar page and from Quran Grammar's Explore card. */
  grammarGuide: "Grammar guide",
  grammarPicker: "Go to a Surah",
  searchSurahs: "Search Surahs",
  /** Read, Explore and Me (#192): the destinations, their navigation landmark, and Explore's and Me's words. */
  read: "Read",
  explore: "Explore",
  me: "Me",
  destinations: "Destinations",
  backToExplore: "← Explore",
  /** Quran Chat (#78): asking a question about the Quran, and its answer. */
  quranChat: "Quran Chat",
  quranChatLead: "Ask about the Quran. Answers come only from the Ayah translations and the Tafsir, and cite each Ayah they rest on.",
  quranChatNeedsAccount: "Quran Chat needs an Account. Sign in to ask it about the Quran.",
  yourQuestion: "Your question",
  ask: "Ask",
  asking: "Asking…",
  answer: "Answer",
  answerFailed: "Quran Chat could not answer just now. Please try again.",
  /** Quran Chat's Conversations (#79): the ones kept for the Account, reopened, started afresh and deleted. */
  conversations: "Conversations",
  thisConversation: "This Conversation",
  newConversation: "New Conversation",
  noConversations: "No Conversations yet. Your first question starts one.",
  conversationsFailed: "Your Conversations could not be loaded just now.",
  deleteConversation: (title: string) => `Delete “${title}”`,
  conversationGone: "This Conversation was deleted, perhaps in another browser. Ask again to start a new one.",
  noAnswerKept: "No answer was kept for this question.",
  /** Question limits (#80): how many are left, once fewer than five, and the limit reached, with when it resets (`resets`, in UTC). */
  questionsLeftToday: (n: number) => (n === 1 ? "1 question left today" : `${n} questions left today`),
  limitReached: (reached: LimitName, limit: number, resets: string) =>
    `You have asked all ${limit} of ${reached === "daily" ? "today's" : "this month's"} questions. You can ask again from ${resets}.`,
  categoriesCount: (n: number) => `${n} categories`,
  directionsCount: (n: number) => `${n} directions`,
  readingPlaces: "Reading places",
  noReadingPlaces: "Places you read are kept here, on this device.",
  /** Known words (#248, #251): the Memorized? choice, and the Known words page on Me with its Roots and Particles tabs. */
  knownWords: "Known words",
  memorized: "Memorized?",
  roots: "Roots",
  searchKnownWords: "Search by letters or meaning",
  noRootsMatch: "No Root matches this search.",
  particles: "Particles",
  noParticlesMatch: "No particle matches this search.",
  knownWordsCount: (roots: number, allRoots: number, particles: number, allParticles: number) =>
    `${roots.toLocaleString("en")} of ${allRoots.toLocaleString("en")} Roots · ${particles.toLocaleString("en")} of ${allParticles.toLocaleString("en")} particles`,
  account: "Account",
  admin: "Admin",
  about: "About",
  surahFoot: "Surahs",
  /** The Sign-in page (#66): signing in to an Account with Google or Apple, and out. */
  signIn: "Sign in",
  signInLead: "Reading never needs an Account. Sign in to keep one with Google or Apple.",
  signInWith: (method: string) => `Sign in with ${method}`,
  signingIn: "Checking whether you're signed in…",
  signedInAs: "Signed in as",
  signOut: "Sign out",
  signInFailed: "Sign-in didn't start. Please try again later.",
  /** Deleting an Account on the Sign-in page (#68). */
  deleteAccount: "Delete Account",
  deleteAccountTitle: "Delete your Account?",
  deleteAccountWarning:
    "Your Account and all its data are deleted at once, with no grace period, and you are signed out on every device. This cannot be undone. Reading never needs an Account.",
  deleteAccountFailed: "Your Account wasn't deleted. Sign out, sign in again, and try once more.",
  cancel: "Cancel",
  /** The Surah index footer's links to the site documents (#50). */
  privacy: "Privacy",
  terms: "Terms",
  translationLanguageLabel: "Translation language",
  scriptLabel: "Arabic script",
  uthmani: "Uthmani",
  indopak: "Indo-Pak",
  themeLabel: "Theme",
  system: "System",
  light: "Light",
  dark: "Dark",
  translation: "Ayah translation",
  close: "Close",
  /** The Surah bar's button opening the reader settings in a sheet, and the sheet's title (#192). */
  settings: "Reading settings",
  arabicSize: "Arabic size",
  meaningSize: "Meaning size",
  /** The Settings drawer's switch for the Phrase colours on Word cards (#99). */
  phraseColours: "Phrase colours",
  /** The Phrase colours switch's note while Known words colour is on, which keeps them from being drawn (#250). */
  phraseColoursKnownNote: "Off while Known words colour is on",
  /** The Settings drawer's switch for Allah reference colour, the gold on Allah references (#148). */
  allahReferenceColour: "Allah reference colour",
  /** The reader settings' switch for Known words colour, the green behind the Words of Known Roots and Known particles (#250, #251). */
  knownWordsColour: "Known words colour",
  /** The reader settings' switch for Hide Word meanings (#256), and its note in Flowing, which shows no Word meanings. */
  hideWordMeanings: "Hide Word meanings",
  hideWordMeaningsNote: "Applies to Study",
  /** The Surah bar's Ayah layout switch (#125): Study or Flowing (STRINGS.flowing). */
  ayahLayoutLabel: "Ayah layout",
  study: "Study",
  /** The Section marks setting (#194): Hizb quarters or Rukus. */
  sectionMarksLabel: "Section marks",
  hizb: "Hizb quarters",
  ruku: "Rukus",
  smaller: "Smaller",
  larger: "Larger",
  percent: (n: number) => `${n}%`,
  resetSizes: "Reset sizes",
  /** The Settings drawer's sample Ayah. */
  preview: "Preview",
  /** Shown in place of the Ayahs still to come when a Surah opened in parts stops loading (#24). */
  partsFailed: "The rest of this Surah could not be loaded. Check your connection and try again.",
  retry: "Retry",
  pageFailed: "This page could not be loaded. Check your connection and try again.",
  rootLabel: "Root",
  /** The Root dialog's link to its Root's Root page (#289). */
  rootPage: "Root page",
  rootCounts: (o: number, u: number) => `${o} occurrences · ${u} unique words`,
  lemmasTitle: "Lemmas",
  /** What a screen reader hears of the Lemma row of the Word whose Root tag opened the Root dialog (#322). */
  thisWordsLemma: "this Word's Lemma",
  times: (n: number) => `${n}×`,
  /** A Root page (#287): its section of the Words with no Lemma, and what a screen reader hears of a Spelling's marked Word. */
  withoutLemma: "Without a Lemma",
  markedWord: "Marked",
  /** A large Root page's Spelling (#288): what brings its next fifty Ayahs, and what stands in for a part of them that could not be loaded. */
  showMore: "Show more",
  spellingPartFailed: "These Ayahs could not be loaded. Check your connection and try again.",
  /** The Roots list (#290): its count, its search, what it says when the search finds nothing, and what a screen reader hears of a Known Root's tick. */
  rootsCount: (n: number) => `${n.toLocaleString("en-US")} Roots`,
  searchRoots: "Search by letters or transliteration",
  noRootMatches: (q: string) => `No Root matches “${q}”.`,
  knownRoot: "Known Root",
  /** The Particle dialog (#249). */
  particleLabel: "Particle",
  particleCount: (o: number) => `${o} occurrences`,
  spellingsTitle: "Spellings",
  /** The Share page (#55): its visitor's Share layout toggle, colophon and link below the frame. */
  shareLayout: "Share layout",
  ayahByAyah: "Ayah by Ayah",
  flowing: "Flowing",
  readInQuranAnalysis: "Read this in Quran Analysis",
  shareYourOwn: "Share your own",
  /** The site bar's link to a Share page with the edit strip (#56). */
  shareAyahs: "Share Ayahs",
  /** The edit strip (#56) and its lists; its Surah list is labelled like the Surah bar. */
  chooseAyahsToShare: "Choose Ayahs to share",
  fromAyah: "From Ayah",
  toAyah: "To Ayah",
  /** A Passage heading's share button (#56), by the Passage's `surah:from–to`, or `surah:ayah` for one Ayah. */
  sharePassage: (passage: string) => `Share Passage ${passage}`,
  translationBy: (translator: string) => `Translation: ${translator}`,
  /** A Passage's Tafsir (#234), as a screen reader names it, by the Ayahs its entries cover, `surah:from–to`. */
  tafsirOf: (ayahs: string) => `Tafsir of ${ayahs}`,
  /** The Share page's sharer's buttons (#56). */
  share: "Share",
  copyText: "Copy text",
  /** An Ayah's row of Theme chips (#129), as a screen reader names it; the Themes list's title and the Surah index's link to it (#130). */
  themes: "Themes",
  themesStats: (themes: number, categories: number) => `${themes} themes · ${categories} categories`,
  /** The Iltifat pages' title, the Surah index's link to them, and the counts beside them (#138). */
  iltifat: "Iltifat",
  iltifatStats: (counted: number, disputed: number) => `${counted} Iltifat · ${disputed} disputed`,
  iltifatCount: (n: number) => `${n} Iltifat`,
  /** An Iltifat direction page's link back to the overview. */
  allIltifat: "← Iltifat",
  /** The Supplications page's title, Explore's card to it, and the page's count of Supplications (#199). */
  supplications: "Supplications",
  supplicationsCount: (n: number) => `${n} Supplications`,
  /** The Supplications page's filters (#200): the Opening chips, the two switches, and what it says when they leave nothing. */
  openingLabel: "Opening",
  rabbana: "Rabbana",
  rabbi: "Rabbi",
  otherOpening: "Other",
  prophetsOnly: "Prophets only",
  showOtherWords: "Show other words to Allah",
  noSupplications: "Nothing matches these choices. Choose another Opening, or turn a switch off.",
  /** A Disputed Iltifat's tag. */
  disputed: "Disputed",
  /** Listening to a Surah (#115, #110): the Surah bar's play button and the Recitation bar. */
  listen: "Listen",
  /** By the Ayah's number in the Surah bar, or by its `surah:ayah` beside it in its heading (#109). */
  listenFrom: (ayah: number | string) => `Listen from Ayah ${ayah}`,
  /** Shown while the page has stopped following the Recited Word (#109). */
  backToRecitedWord: "Back to the Recited Word",
  recitationBar: "Recitation",
  play: "Play",
  pause: "Pause",
  stopRecitation: "Stop the Recitation",
  recitationLoading: "Loading…",
  recitationUnavailable: "Recitation unavailable right now",
  tryAgain: "Try again",
  previousAyah: "Previous Ayah",
  nextAyah: "Next Ayah",
  recitationSpeed: "Recitation speed",
  /** A Recitation speed as the Recitation bar offers it: 0.75×, 1×, 1.25×. */
  speed: (speed: number) => `${speed}×`,
};

/** Each Explore card's line, in the reader's Language: the same words as the mobile app's Explore (#192; Urdu drafted, DELIVERY/drafted-urdu.md). */
export const EXPLORE_LINES: Record<"themes" | "roots" | "iltifat" | "supplications" | "quranChat" | "quranGrammar", Record<Language, string>> = {
  themes: {
    en: "What the Quran speaks of, by subject, with every Ayah on each.",
    ur: "قرآن کن موضوعات پر بات کرتا ہے، ہر موضوع کی تمام آیات کے ساتھ۔",
  },
  // #290; Urdu drafted, for the owner to check.
  roots: {
    en: "Every Root the Quran's words come from, by its letters, with the Ayahs it occurs in.",
    ur: "قرآن کے الفاظ کے تمام مادّے، حروف کی ترتیب سے، ان آیات کے ساتھ جن میں وہ آتے ہیں۔",
  },
  iltifat: {
    en: "Sudden turns between I, We, You and He that still mean the same person.",
    ur: "میں، ہم، تم اور وہ کے درمیان اچانک موڑ، جن سے مراد وہی ہستی رہتی ہے۔",
  },
  // #199; Urdu drafted, DELIVERY/drafted-urdu.md.
  supplications: {
    en: "What people in the Quran ask of Allah, in order, with who says each.",
    ur: "قرآن میں لوگ اللہ سے کیا مانگتے ہیں، ترتیب سے، اور ہر دعا کون کرتا ہے۔",
  },
  // #78; Urdu drafted, for the owner to check.
  quranChat: {
    en: "Ask about the Quran, answered from its translations and Tafsir.",
    ur: "قرآن کے بارے میں پوچھیے، جواب اس کے تراجم اور تفسیر سے۔",
  },
  // #279; website only, Urdu drafted, for the owner to check.
  quranGrammar: {
    en: "The grammar of every Word, Surah by Surah: Ism, Fi'l or Harf, and how each is built.",
    ur: "ہر لفظ کی گرامر، سورت بہ سورت: اسم، فعل یا حرف، اور ہر ایک کی ساخت۔",
  },
};

/** The label of each kind of Other words to Allah (#195), so that none is mistaken for a Supplication. */
export const OTHER_WORDS_LABEL: Record<Exclude<SupplicationKind, "supplication">, string> = {
  "plea-at-the-judgment": "Plea at the Judgment",
  "request-for-this-world-only": "Request for this world only",
  complaint: "Complaint",
  mockery: "Mockery",
  hypothetical: "Hypothetical",
  "reported-words": "Reported words",
};

/** A Supplication span (#270) as a screen reader names it, in each Language. */
export const SUPPLICATION_SPAN_LABEL: Record<Language, string> = { ur: "دعا", en: "Supplication" };

/** Each Language's name in itself, as the Translation language switch shows it (the mockup's اردو / English). */
export const LANGUAGE_NAME: Record<Language, string> = { ur: "اردو", en: "English" };

/** Who made each Language's Ayah translation, as the credits page and a shared Ayah name them. */
export const TRANSLATOR: Record<Language, string> = { ur: "Fateh Muhammad Jalandhari", en: "Saheeh International" };

export const DIRECTION: Record<Language, "rtl" | "ltr"> = { ur: "rtl", en: "ltr" };

/** The lang and dir of text in a Language: the meanings and translations, never the interface. */
export const inLanguage = (lang: Language) => ({ lang, dir: DIRECTION[lang] });
