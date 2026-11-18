// What the website served before Themes moved into Neon (#170): the Themes
// file and the generated dataset as last committed at 5127e94, read from git
// so that they outlive the deletion of the Themes file and its generated
// output. The site, API and no-database features compare what the site serves
// now, read from Neon, with them: the parity check of #170's AC-3.
// Likewise for Passages and Phrases (#171): the Passages and Phrases files and
// the generated Surah files as last committed, before they moved, the parity
// check of #171's AC-7 and every feature's source of Passages and Phrases once
// the files are deleted. Each file is read at the last Publish to change it,
// which the Passage load's input equals: the Passages file at 646e747 (Surah
// 57), the Phrases file at edc10b5 (Surah 2's Ayahs 1–33). The generated Surah
// files are read at 3a52736, with each Surah's Passages taken from that
// Passages file and, where those Publishes changed a Surah's Phrases, its
// Phrases and Phrase colours from that Phrases file, placed and coloured by the
// dataset's Phrase rules: neither Publish regenerated the Surah files.
// Likewise for the Roots and the Juz file (#173): as last committed, before
// they moved into Neon and the generated dataset was deleted, BEFORE_ROOTS_MOVED.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { checkedPhrases, indexWords, phraseColours } from "@saaliheen/dataset/phrase-rules";
import type { Language, ListedRoot, Root } from "@saaliheen/dataset/types";

/** The last commit before Themes moved into Neon. */
export const BEFORE_THE_MOVE = "5127e948092b0bcc0c825a59034cdf9ecaba9bce";

/** The last commit before Passages and Phrases moved into Neon (#171): main as the move began. */
export const BEFORE_PASSAGES_MOVED = "3a52736c23e2080c88b22f0de20e53a633497530";

/** The last commit to change the Passages file before it moved (#171): Surah 57's Publish, whose Passages the Passage load's input holds. */
export const LAST_PASSAGES_PUBLISHED = "646e747e189046360b716d786e448bd5d8c3dd93";

/** The last commit to change the Phrases file before it moved (#171): Surah 2's second Phrase Publish, whose Phrases the Passage load's input holds. */
export const LAST_PHRASES_PUBLISHED = "edc10b5443b75b289e36c2eb71f9088e6a9dd602";

/** The last commit before the Quran text, Word meanings, Word counts and Recitation timings moved into Neon (#172): main as the move began. */
export const BEFORE_QURAN_MOVED = "5298a729477fe314b42beeb4e9b405178ef53d64";

/** The last commit holding the generated dataset, before the Roots and Juz lists moved into Neon (#173): main as the move began. */
export const BEFORE_ROOTS_MOVED = "59abfe6ff3656c09dfcc7af81c04fd0101579739";

/** Surah `n`'s number as the generated dataset's file names wrote it, three digits: `018` for 18. */
const paddedSurah = (n: number) => String(n).padStart(3, "0");

/** The website's own directory. */
const WEB = path.join(__dirname, "..", "..");

const texts = new Map<string, string>();

/** The text of `file` (a path inside apps/web) as committed at `commit`, BEFORE_THE_MOVE unless another is given. */
export function committedText(file: string, commit: string = BEFORE_THE_MOVE): string {
  const at = `${commit}:apps/web/${file}`;
  if (!texts.has(at)) {
    const text = execFileSync("git", ["show", at], {
      cwd: WEB,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    texts.set(at, text);
  }
  return texts.get(at)!;
}

const parsed = new Map<string, unknown>();

/** `file` (a path inside apps/web) as committed at `commit`, BEFORE_THE_MOVE unless another is given, parsed as JSON. */
export function committedJson<T>(file: string, commit: string = BEFORE_THE_MOVE): T {
  const at = `${commit}:${file}`;
  if (!parsed.has(at)) parsed.set(at, JSON.parse(committedText(file, commit)));
  return parsed.get(at) as T;
}

/** A Theme page's Passage group as the generated dataset held it: a Passage's full range and the Theme's Ayahs in it. */
export interface CommittedGroup {
  surah: number;
  from: number;
  till: number;
  ayahs: number[];
}

/** One Theme as the generated dataset held it. */
export interface CommittedTheme {
  slug: string;
  en: string;
  ur: string;
  category: string;
  description: string;
  ayahCount: number;
  groups: CommittedGroup[];
}

export interface CommittedThemes {
  categories: { slug: string; en: string; ur: string }[];
  themes: CommittedTheme[];
}

/** data/generated/themes.json as committed: every Theme category, and every Theme with its count and Passage groups. */
export const committedThemes = () => committedJson<CommittedThemes>("data/generated/themes.json");

/** The path of Surah `n`'s generated file, `data/generated/surahs/018.json` for 18. */
export const committedSurahPath = (n: number) => `data/generated/surahs/${paddedSurah(n)}.json`;

/** One Ayah of a committed Surah file: its number and its Theme slugs in tagged order, among the rest. */
export interface CommittedAyah {
  number: number;
  themes: string[];
}

/** Surah `n`'s generated file as committed. */
export const committedSurah = (n: number) => committedJson<{ number: number; ayahs: CommittedAyah[] }>(committedSurahPath(n));

/**
 * Surah `n`'s file as the dataset build last wrote it, committed before the
 * Quran moved into Neon (#172), BEFORE_QURAN_MOVED: what the import loads, read
 * back by /data/v1 key for key, so it outlives the file's deletion.
 */
export const committedBuiltSurah = <T = unknown>(n: number) => committedJson<T>(committedSurahPath(n), BEFORE_QURAN_MOVED);

/** A Word of a built Surah file: its location and any Phrase colour, among the rest. */
interface BuiltWord {
  location: string;
  phraseColour?: string;
}

/** A built Surah file: its Passages, Phrases and Ayahs, among the rest. */
interface BuiltSurah {
  number: number;
  passages: unknown[];
  phrases: unknown[];
  ayahs: (CommittedAyah & { words: BuiltWord[] })[];
}

/**
 * Surah `n`'s file as the website would serve it had Themes, Passages and
 * Phrases never moved: the Surah file the dataset build writes now, each
 * Ayah's Themes as committed at BEFORE_THE_MOVE, and its Passages, Phrases
 * and each Word's Phrase colour as last committed (#171, committedPassageSurah).
 * Its Themes, Passages and Phrases come from git; the rest from the Surah
 * file as committed before the Quran moved into Neon (#172), BEFORE_QURAN_MOVED,
 * so that it outlives that file's deletion. A Word's Phrase colour is its
 * last key, so it is put back last.
 */
export function surahBeforeTheMove(n: number): BuiltSurah {
  const built = committedBuiltSurah<BuiltSurah>(n);
  const themed = committedSurah(n).ayahs;
  const passaged = committedPassageSurah(n);
  return {
    ...built,
    passages: passaged.passages,
    phrases: passaged.phrases,
    ayahs: built.ayahs.map((ayah, i) => ({
      ...ayah,
      words: ayah.words.map((word, w) => {
        const rest: BuiltWord = { ...word };
        delete rest.phraseColour;
        const colour = passaged.ayahs[i]?.words[w]?.phraseColour;
        return colour === undefined ? rest : { ...rest, phraseColour: colour };
      }),
      themes: themed[i]?.themes ?? [],
    })),
  };
}

/** One entry of the Surah index, data/generated/surahs.json. */
export interface CommittedSurahEntry {
  number: number;
  nameArabic: string;
  nameLatin: string;
  revelationPlace: string;
  ayahCount: number;
  bismillah: boolean;
}

/** The Surah index as committed before the Quran moved into Neon (#172). */
export const committedSurahIndex = () => committedJson<CommittedSurahEntry[]>("data/generated/surahs.json", BEFORE_QURAN_MOVED);

/** A Recitation file as committed before the Quran moved into Neon: each Ayah's span and each Word's timing as [position, start, end]. */
export interface CommittedRecitation {
  surah: number;
  reciter: string;
  audio: string;
  ayahs: { number: number; from: number; to: number; words: [number, number, number][] }[];
}

/** Surah `n`'s Recitation file as committed before the Quran moved into Neon (#172). */
export const committedRecitation = (n: number) =>
  committedJson<CommittedRecitation>(`data/generated/recitations/${paddedSurah(n)}.json`, BEFORE_QURAN_MOVED);

/** The Word counts, by Surah then Ayah, as committed before the Quran moved into Neon (#172). */
export const committedWordCounts = () => committedJson<number[][]>("data/generated/word-counts.json", BEFORE_QURAN_MOVED);

/** A Surah file's Passages, Phrases, Themes and Phrase colours: what Neon held before the Quran moved (#170, #171). */
interface WithNeonContent {
  passages?: unknown;
  phrases?: unknown;
  ayahs: { themes?: unknown; words: { phraseColour?: unknown }[] }[];
}

/** Surah file `file` without its Passages, Phrases, Themes and Phrase colours: its Quran text, Word meanings and translations, every other key kept in its order. */
export function quranOf(file: WithNeonContent): unknown {
  const { passages, phrases, ...rest } = file;
  void [passages, phrases];
  return {
    ...rest,
    ayahs: file.ayahs.map(({ themes, words, ...ayah }) => {
      void themes;
      return { ...ayah, words: words.map(({ phraseColour, ...word }) => (void phraseColour, word)) };
    }),
  };
}

/** The Juz file as last committed, before the Juz lists moved into Neon (#173). */
export const committedJuz = () => committedJson<unknown>("data/generated/juz.json", BEFORE_ROOTS_MOVED);

let roots: Map<number, unknown> | undefined;

/** Every Root file as last committed, before the Roots moved into Neon (#173), by its QUL id, read from git in one pass. */
const rootsById = () =>
  (roots ??= new Map(
    [...committedFiles(BEFORE_ROOTS_MOVED, ["data/generated/roots/"])]
      .map(([name, text]) => [Number(name.slice("roots/".length, -".json".length)), JSON.parse(text)] as const)
      .sort(([a], [b]) => a - b),
  ));

/** Every Root file as last committed (#173), by ascending id: 1642 files are too many to show one by one. */
export const committedRoots = (): { id: number; root: unknown }[] => [...rootsById()].map(([id, root]) => ({ id, root }));

/**
 * Every Root as /data/v1/roots.json lists it (#253), from the Root files as
 * last committed (#173), by ascending id: its letters and its Lemmas'
 * representative meanings in each Language, most frequent first, empty ones
 * left out.
 */
export const committedRootList = (): ListedRoot[] =>
  committedRoots().map(({ root }) => {
    const { letters, lemmas } = root as Root;
    const meanings = (language: Language) => lemmas.map((lemma) => lemma.meaning[language]).filter((meaning) => meaning !== "");
    return { letters, meanings: { ur: meanings("ur"), en: meanings("en") } };
  });

/** The Root file of QUL id `id` as last committed (#173); undefined when none was. */
export const committedRoot = <T = unknown>(id: number): T | undefined => rootsById().get(id) as T | undefined;

/**
 * Every file under `dirs` (directories or files, as paths inside apps/web) as
 * committed at `commit`, its text by its path under data/generated, read from
 * git in one `cat-file --batch`.
 */
export function committedFiles(commit: string, dirs: string[]): Map<string, string> {
  const dir = "apps/web/data/generated/";
  const under = (d: string) => `apps/web/${d}`;
  const names = execFileSync("git", ["ls-tree", "-r", "--full-tree", "--name-only", commit, ...dirs.map(under)], { cwd: WEB, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const out = execFileSync("git", ["cat-file", "--batch"], {
    cwd: WEB,
    input: names.map((name) => `${commit}:${name}`).join("\n") + "\n",
    maxBuffer: 256 * 1024 * 1024,
  });
  const files = new Map<string, string>();
  let at = 0;
  for (const name of names) {
    const start = out.indexOf(10, at) + 1;
    const size = Number(out.subarray(at, start - 1).toString("utf8").split(" ")[2]);
    files.set(name.slice(dir.length), out.subarray(start, start + size).toString("utf8"));
    at = start + size + 1;
  }
  return files;
}

/** A Passage as the Passages file wrote it. */
export interface CommittedPassage {
  surah_no: number;
  ayah_from: number;
  ayah_till: number;
  title_en: string;
  title_ur: string;
}

/** A Phrase as the Phrases file wrote it: its first and last Word location. */
export interface CommittedPhrase {
  first: string;
  last: string;
}

/** Where the Passages file and the Phrases file were, inside apps/web, until they moved into Neon (#171). */
const PASSAGES_FILE = "data/passages.json";
const PHRASES_FILE = "data/phrases.json";

/** The Passages file as last committed before Passages moved into Neon: every Passage and Passage title. */
export const committedPassages = () => committedJson<CommittedPassage[]>(PASSAGES_FILE, LAST_PASSAGES_PUBLISHED);

/** The Phrases file as last committed before Phrases moved into Neon: every Phrase. */
export const committedPhrases = () => committedJson<CommittedPhrase[]>(PHRASES_FILE, LAST_PHRASES_PUBLISHED);

/** A Surah file's Passages and Phrases, and each Word's Phrase colour, as the generated dataset held them. */
export interface CommittedPassageSurah {
  number: number;
  passages: { from: number; till: number; en: string; ur: string }[];
  phrases: CommittedPhrase[];
  ayahs: { number: number; words: { location: string; phraseColour?: string }[] }[];
}

/** `phrases`' first and last Words, sorted: the same for the same Phrases in any order. */
const phraseKeys = (phrases: CommittedPhrase[]) => phrases.map((p) => `${p.first}–${p.last}`).sort();

/** Those of `phrases` in Surah `n`. */
const phrasesIn = (n: number, phrases: CommittedPhrase[]) => phrases.filter((p) => Number(p.first.split(":")[0]) === n);

/**
 * Surah `n`'s generated file as last committed before Passages and Phrases
 * moved into Neon, with the Passages the last committed Passages file gives
 * it, as the dataset build wrote them: Surah 57's Publish at
 * LAST_PASSAGES_PUBLISHED changed the Passages file but not the generated
 * files. Where Surah 2's Phrase Publishes, up to LAST_PHRASES_PUBLISHED,
 * changed a Surah's Phrases without regenerating its file, its Phrases are
 * the last committed Phrases file's, in Quran order, and its Words' Phrase
 * colours those the dataset's Phrase rules give them, as the build would.
 */
export function committedPassageSurah(n: number): CommittedPassageSurah {
  const generated = committedJson<CommittedPassageSurah>(committedSurahPath(n), BEFORE_PASSAGES_MOVED);
  const passages = committedPassages()
    .filter((p) => p.surah_no === n)
    .map((p) => ({ from: p.ayah_from, till: p.ayah_till, en: p.title_en, ur: p.title_ur }));
  const filed = phrasesIn(n, committedPhrases());
  const generatedFrom = phrasesIn(n, committedJson<CommittedPhrase[]>(PHRASES_FILE, BEFORE_PASSAGES_MOVED));
  if (JSON.stringify(phraseKeys(filed)) === JSON.stringify(phraseKeys(generatedFrom))) return { ...generated, passages };
  const index = indexWords([{ ...generated, passages }]);
  const sorted = checkedPhrases(index, filed);
  const colours = phraseColours(sorted, index);
  return {
    ...generated,
    passages,
    phrases: sorted.map((p) => p.phrase),
    ayahs: generated.ayahs.map((ayah) => ({
      ...ayah,
      words: ayah.words.map((word) => {
        const rest = { ...word };
        delete rest.phraseColour;
        const colour = colours.get(word.location);
        return colour ? { ...rest, phraseColour: colour } : rest;
      }),
    })),
  };
}
