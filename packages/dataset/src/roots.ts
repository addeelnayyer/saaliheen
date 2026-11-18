// The dataset builder's Root analysis (ADR 0003): each Word's Root tag, every
// Root with its Lemmas and Spellings, and the Root disagreements between QUL
// and roots.json. QUL owns Roots, Lemmas and counts; roots.json supplies only
// Spelling meanings, falling back to QUL's Word meaning. A Word with no Root
// is a particle's (#249), built from the same sources as a Root's Lemma.

import { ROOT_SOURCES, type RootSources } from "./root-sources.ts";
import type { Language, Lemma, Particle, ParticleKind, ParticleTag, Root, RootDisagreement, RootTag, Spelling, Word } from "./types.ts";

/**
 * How each Buckwalter letter QUL's Roots use is transliterated (ALA-LC style,
 * e.g. rHm → r-ḥ-m). Parts are hyphen-joined, so sh (ش) never reads as s + h.
 */
const TRANSLITERATION: Record<string, string> = {
  A: "ʾ", b: "b", t: "t", v: "th", j: "j", H: "ḥ", x: "kh", d: "d", "*": "dh", r: "r", z: "z", s: "s",
  $: "sh", S: "ṣ", D: "ḍ", T: "ṭ", Z: "ẓ", E: "ʿ", g: "gh", f: "f", q: "q", k: "k", l: "l", m: "m",
  n: "n", h: "h", w: "w", y: "y",
};

/**
 * The Quranic pause, rub-el-hizb and sajdah marks QPC Hafs writes onto a Word
 * (U+06D6–U+06DC, U+06DE, U+06E9): not part of its Spelling.
 */
const PAUSE_MARKS = /[ۖ-ۜ۞۩]/g;

/** Every hamza (أ إ آ ء ؤ ئ), read as ا when comparing Root letters: QUL writes a hamza letter as ا, roots.json as the hamza itself. */
const HAMZA = /[أإآءؤئ]/g;
const hamzaFolded = (letters: string) => letters.replace(HAMZA, "ا");

/** Quran order of Word locations. */
function compareLocations(a: string, b: string): number {
  const [x, y] = [a, b].map((location) => location.split(":").map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

/** The Root QUL gives the Word at `location`, as its card shows it; null when it gives none. */
export function rootTag(sources: RootSources, location: string): RootTag | null {
  const id = sources.rootOf.get(location);
  return id === undefined ? null : { id, letters: sources.roots.get(id)!.letters };
}

/** Every QUL Root by id, each with its Lemmas and Spellings built from `words` (every Word by location). */
export function buildRoots(sources: RootSources, words: Map<string, Word>): Root[] {
  const grouped = groupLocations(sources, words);
  return [...sources.roots.values()]
    .sort((a, b) => a.id - b.id)
    .map((qul) => {
      const lemmas = lemmasOf(grouped.get(qul.id), sources, words);
      return {
        id: qul.id,
        letters: qul.letters,
        transliteration: transliterate(qul.buckwalter),
        occurrences: lemmas.reduce((n, lemma) => n + lemma.occurrences, 0),
        uniqueWords: qul.uniqueWords,
        lemmas,
      };
    });
}

/**
 * Every particle (#249): the Words QUL gives no Root, grouped by the text of
 * the Lemma QUL gives them, else by their Spelling, each with its Spellings
 * built as a Lemma's are; numbered from 1, most frequent first, ties by first
 * Word location. `words` holds every Word, in Quran order.
 */
export function buildParticles(sources: RootSources, words: Map<string, Word>): Particle[] {
  // Each group's first Word location is the first pushed, as Words come in Quran order.
  const groups = new Map<string, { kind: ParticleKind; text: string; first: string; spellings: SpellingGroups }>();
  for (const word of words.values()) {
    if (sources.rootOf.has(word.location)) continue;
    const spelling = word.uthmani.replace(PAUSE_MARKS, "");
    const lemma = sources.lemmaOf.get(word.location);
    const [kind, text]: [ParticleKind, string] = lemma === undefined ? ["spelling", spelling] : ["lemma", sources.lemmaText.get(lemma)!];
    const group = entryOf(groups, `${kind} ${text}`, () => ({ kind, text, first: word.location, spellings: new Map() }));
    entryOf(group.spellings, spelling, (): string[] => []).push(word.location);
  }
  return [...groups.values()]
    .map(({ kind, text, first, spellings }) => {
      const list = spellingsOf(spellings, sources.rootsJsonAt, words);
      return { first, particle: { kind, text, indopak: kind === "lemma" ? text : list[0].indopak, occurrences: occurrencesOf(list), spellings: list } };
    })
    .sort(byFrequency(({ particle }) => particle.occurrences, ({ first }) => first))
    .map(({ particle }, i) => ({ id: i + 1, ...particle }));
}

/** Gives each of `particles`' Words its Particle tag: its particle as the tag shows it, one per particle. */
export function tagParticleWords(particles: Particle[], words: Map<string, Word>): void {
  for (const { id, kind, text, indopak, spellings } of particles) {
    const tag: ParticleTag = { id, kind, text, indopak };
    for (const { locations } of spellings) for (const location of locations) words.get(location)!.particle = tag;
  }
}

/** Every Word location where the sources' Roots disagree, in Word location order. */
export function rootDisagreements(sources: RootSources): RootDisagreement[] {
  const locations = new Set([...sources.rootOf.keys(), ...sources.rootsJsonAt.keys()]);
  return [...locations]
    .sort(compareLocations)
    .map((location) => ({
      location,
      qul: rootTag(sources, location)?.letters ?? null,
      rootsJson: sources.rootsJsonAt.get(location)?.letters ?? null,
    }))
    .filter(disagree);
}

const disagree = ({ qul, rootsJson }: RootDisagreement) =>
  qul === null || rootsJson === null || hamzaFolded(qul) !== hamzaFolded(rootsJson);

function transliterate(buckwalter: string): string {
  return [...buckwalter]
    .map((letter) => {
      const part = TRANSLITERATION[letter];
      if (!part) throw new Error(`${ROOT_SOURCES.roots}: Root ${buckwalter} has an unknown letter "${letter}"`);
      return part;
    })
    .join("-");
}

/** A Spelling's Word locations, by its Uthmani text with pause marks set aside. */
type SpellingGroups = Map<string, string[]>;
/** A Root's Spelling groups by QUL Lemma id (null: no Lemma). */
type LemmaGroups = Map<number | null, SpellingGroups>;

const entryOf = <K, V>(map: Map<K, V>, at: K, make: () => V): V => {
  if (!map.has(at)) map.set(at, make());
  return map.get(at)!;
};

/** Each Root's Word locations in Quran order, grouped by Lemma and then by Spelling. */
function groupLocations(sources: RootSources, words: Map<string, Word>): Map<number, LemmaGroups> {
  const grouped = new Map<number, LemmaGroups>();
  for (const location of [...sources.rootOf.keys()].sort(compareLocations)) {
    const lemmas = entryOf(grouped, sources.rootOf.get(location)!, (): LemmaGroups => new Map());
    const spellings = entryOf(lemmas, sources.lemmaOf.get(location) ?? null, (): SpellingGroups => new Map());
    entryOf(spellings, spellingText(words, location), (): string[] => []).push(location);
  }
  return grouped;
}

function spellingText(words: Map<string, Word>, location: string): string {
  const word = words.get(location);
  if (!word) throw new Error(`${ROOT_SOURCES.roots}: Root given to ${location}, which is not a Word`);
  return word.uthmani.replace(PAUSE_MARKS, "");
}

/** Most frequent first; ties by first Word location. */
const byFrequency =
  <T>(count: (item: T) => number, first: (item: T) => string) =>
  (a: T, b: T) =>
    count(b) - count(a) || compareLocations(first(a), first(b));

/** How many Words `spellings` are written as. */
const occurrencesOf = (spellings: Spelling[]) => spellings.reduce((n, s) => n + s.locations.length, 0);

function lemmasOf(groups: LemmaGroups | undefined, sources: RootSources, words: Map<string, Word>): Lemma[] {
  return [...(groups ?? [])]
    .map(([id, spellings]) => lemma(id, spellingsOf(spellings, sources.rootsJsonAt, words), sources))
    .sort(byFrequency((l) => l.occurrences, (l) => l.spellings[0].locations[0]));
}

function lemma(id: number | null, spellings: Spelling[], sources: RootSources): Lemma {
  return {
    id,
    text: id === null ? null : sources.lemmaText.get(id)!,
    occurrences: occurrencesOf(spellings),
    meaning: spellings[0].meaning,
    spellings,
  };
}

function spellingsOf(groups: SpellingGroups, rootsJson: RootSources["rootsJsonAt"], words: Map<string, Word>): Spelling[] {
  return [...groups.values()]
    .map((locations) => {
      const first = words.get(locations[0])!;
      return { uthmani: first.uthmani, indopak: first.indopak, meaning: spellingMeaning(first, rootsJson), locations };
    })
    .sort(byFrequency((s) => s.locations.length, (s) => s.locations[0]));
}

/** roots.json's meaning at the Word's location, else QUL's Word meaning there. */
function spellingMeaning(word: Word, rootsJson: RootSources["rootsJsonAt"]): Record<Language, string> {
  const entry = rootsJson.get(word.location)?.entry;
  return entry ? { ur: entry.urdu, en: entry.english } : { ...word.meaning };
}
