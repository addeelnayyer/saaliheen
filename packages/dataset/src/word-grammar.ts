// Reading the Word grammar source (#275, ADR 0064): the Quranic Arabic Corpus
// v0.4 as corrected in mustafa0x/quran-morphology, committed as published
// beside `qul/` with the Corpus's copyright block restored above its lines.
// Each line is one Segment: `surah:ayah:word:segment`, its Uthmani text, its
// Part of speech (N, V or P) and its features, `|`-separated. The Corpus's
// Root (ROOT:) and Lemma (LEM:) are skipped: Roots and Lemmas are QUL's
// (ADR 0003). Any other tag the terms (./grammar.ts) do not know throws,
// naming the line, so every value written has a label.
//
// The Corpus's Words are matched to Saaliheen's by Word location. Where an
// Ayah's Words are divided differently (the Corpus writes بَعْدَمَا as one
// Word where QPC Hafs writes بَعۡدَ مَا), the Words before and after the
// difference are matched from either end of the Ayah by their letters, and
// every Word of ours between them is left without Word grammar.

import {
  ASPECTS,
  CASES,
  DERIVATIONS,
  FAMILIES,
  HARF_KINDS,
  ISM_KINDS,
  MOODS,
  VERB_FORMS,
  type Affix,
  type Family,
  type GrammaticalNumber,
  type Gender,
  type PartOfSpeech,
  type Person,
  type Segment,
  type VerbForm,
} from "./grammar.ts";
import { readSourceText } from "./source-json.ts";

/** The Word grammar source, beside `qul/`. */
export const WORD_GRAMMAR_SOURCE = "quran-morphology.txt";

/** A Word of ours: its Word location and Uthmani text. */
export interface GrammarWord {
  location: string;
  uthmani: string;
}

/** Saaliheen's Surahs, as far as the Word grammar is matched to them: each Ayah's Words in order. */
export type GrammarSurahs = readonly { number: number; ayahs: readonly { number: number; words: readonly GrammarWord[] }[] }[];

export interface WordGrammar {
  /** Every Segment of every matched Word, in Quran order. */
  segments: Segment[];
  /** Our Word locations the Corpus divides differently, which have no Segments, in Quran order. */
  dividedDifferently: string[];
}

const LINE = /^(\d+):(\d+):(\d+):(\d+)\t([^\t]*)\t([NVP])\t([^\t]*)$/;
/** Person, gender and number together (3MS, 2D, F, P …). */
const PGN = /^([123])?([MF])?([SDP])?$/;
const has = <T extends object>(terms: T, key: string): key is Extract<keyof T, string> => Object.hasOwn(terms, key);

/** A Corpus Segment before it is matched to a Word of ours. */
type Parsed = Omit<Segment, "location">;
/** A Corpus Segment's features: all but its place, text and Part of speech. */
type Features = Omit<Parsed, "position" | "uthmani" | "partOfSpeech">;
/** Each family by the head the Corpus names it by. */
const FAMILY_BY_HEAD = new Map(Object.entries(FAMILIES).map(([family, { corpus }]) => [corpus as string, family as Family]));

/** One line's features as a Segment's; throws, naming `at`, on a tag the terms do not know or a feature given twice. */
function features(partOfSpeech: PartOfSpeech, tags: string[], at: string): Features {
  const fail = (what: string): never => {
    throw new Error(`${WORD_GRAMMAR_SOURCE}: ${what} at ${at}`);
  };
  const seg: Features = {
    affix: "stem",
    kind: null,
    derivation: null,
    adjective: false,
    case: null,
    indefinite: false,
    person: null,
    gender: null,
    number: null,
    aspect: null,
    verbForm: null,
    mood: null,
    passive: false,
    family: null,
  };
  const given = new Set<keyof typeof seg>();
  const once = <K extends keyof typeof seg>(key: K, value: (typeof seg)[K]) => {
    if (given.has(key)) fail(`a second ${key} "${String(value)}"`);
    given.add(key);
    seg[key] = value;
  };
  const rest = tags.filter((t) => t !== "" && !t.startsWith("ROOT:") && !t.startsWith("LEM:"));
  // A Harf's kind is its first tag: P, ACC and IMPV name a kind there, not a number, Case or Aspect.
  if (partOfSpeech === "P") {
    const kind = rest.shift();
    if (kind === undefined || !has(HARF_KINDS, kind)) return fail(`no Harf kind ("${kind ?? ""}")`);
    seg.kind = kind;
  }
  for (const tag of rest) {
    const [key, value] = tag.includes(":") ? tag.split(":", 2) : [tag, ""];
    const pgn = tag.match(PGN);
    if (tag === "PREF" || tag === "SUFF") once("affix", (tag === "PREF" ? "prefix" : "suffix") as Affix);
    else if (partOfSpeech === "N" && has(ISM_KINDS, tag)) once("kind", tag);
    else if (partOfSpeech === "N" && has(DERIVATIONS, tag)) once("derivation", tag);
    else if (tag === "ADJ") once("adjective", true);
    else if (tag === "INDEF") once("indefinite", true);
    else if (tag === "PASS") once("passive", true);
    else if (has(CASES, tag)) once("case", tag);
    else if (has(ASPECTS, tag)) once("aspect", tag);
    else if (key === "VF" && has(VERB_FORMS, value)) once("verbForm", Number(value) as VerbForm);
    else if (key === "MOOD" && has(MOODS, value)) once("mood", value);
    else if (key === "FAM" && FAMILY_BY_HEAD.has(value)) once("family", FAMILY_BY_HEAD.get(value)!);
    else if (pgn) {
      const [, person, gender, number] = pgn;
      if (person) once("person", Number(person) as Person);
      if (gender) once("gender", gender as Gender);
      if (number) once("number", number as GrammaticalNumber);
    } else fail(`unknown tag "${tag}"`);
  }
  return seg;
}

/** The letters two writings of a Word share: its consonants, without the vowel signs, alifs, hamzas and weak letters the two texts write differently. */
const WEAK = new Set("ءأإآٱاىيوئؤـ");
const letters = (text: string) => [...text].filter((c) => c >= "ء" && c <= "ي" && !WEAK.has(c)).join("");

/** The Corpus's Words by Ayah (`surah:ayah`), each Word its Segments in order; throws on a malformed or misnumbered line. */
function readCorpus(sourceDir: string): Map<string, Parsed[][]> {
  const raw = readSourceText(sourceDir, WORD_GRAMMAR_SOURCE);
  const ayahs = new Map<string, Parsed[][]>();
  raw.split("\n").forEach((line, i) => {
    if (line === "" || line.startsWith("#")) return;
    const match = line.match(LINE);
    if (!match) throw new Error(`${WORD_GRAMMAR_SOURCE}: malformed line ${i + 1}`);
    const [, s, a, w, g, uthmani, pos, tags] = match;
    const at = `${s}:${a}:${w}:${g}`;
    const partOfSpeech = pos as PartOfSpeech;
    const words = ayahs.get(`${s}:${a}`) ?? ayahs.set(`${s}:${a}`, []).get(`${s}:${a}`)!;
    if (Number(g) === 1) {
      if (Number(w) !== words.length + 1) throw new Error(`${WORD_GRAMMAR_SOURCE}: Words are not numbered 1..n within Ayah ${s}:${a} (at ${at})`);
      words.push([]);
    }
    const word = words[Number(w) - 1];
    if (!word || Number(g) !== word.length + 1) throw new Error(`${WORD_GRAMMAR_SOURCE}: Segments are not numbered 1..n within Word ${s}:${a}:${w} (at ${at})`);
    word.push({ position: Number(g), uthmani, partOfSpeech, ...features(partOfSpeech, tags.split("|"), at) });
  });
  for (const [ayah, words] of ayahs) {
    words.forEach((word, i) => {
      if (!word.some((s) => s.affix === "stem")) throw new Error(`${WORD_GRAMMAR_SOURCE}: Word ${ayah}:${i + 1} has no stem Segment`);
    });
  }
  return ayahs;
}

/**
 * The Word grammar of `surahs` from the Corpus in `sourceDir`; throws, naming
 * the source, when it is missing, malformed, uses a tag the terms do not
 * know, or covers other Ayahs than `surahs`.
 */
export function readWordGrammar(sourceDir: string, surahs: GrammarSurahs): WordGrammar {
  const ayahs = new Map<string, readonly GrammarWord[]>(surahs.flatMap((s) => s.ayahs.map((a) => [`${s.number}:${a.number}`, a.words] as const)));
  const corpus = readCorpus(sourceDir);
  const extra = [...corpus.keys()].find((ayah) => !ayahs.has(ayah));
  if (extra) throw new Error(`${WORD_GRAMMAR_SOURCE}: Ayah ${extra} is not in the Quran text`);
  const segments: Segment[] = [];
  const dividedDifferently: string[] = [];
  for (const [ayah, ours] of ayahs) {
    const theirs = corpus.get(ayah);
    if (!theirs) throw new Error(`${WORD_GRAMMAR_SOURCE}: no Words for Ayah ${ayah}`);
    const same = (i: number, j: number) => letters(ours[i].uthmani) === letters(theirs[j].map((s) => s.uthmani).join(""));
    const shorter = Math.min(ours.length, theirs.length);
    let head = 0;
    while (head < shorter && same(head, head)) head++;
    let tail = 0;
    while (tail < shorter - head && same(ours.length - 1 - tail, theirs.length - 1 - tail)) tail++;
    ours.forEach((word, i) => {
      const j = i < head ? i : i >= ours.length - tail ? i - ours.length + theirs.length : undefined;
      if (j === undefined) dividedDifferently.push(word.location);
      else for (const segment of theirs[j]) segments.push({ location: word.location, ...segment });
    });
  }
  return { segments, dividedDifferently };
}
