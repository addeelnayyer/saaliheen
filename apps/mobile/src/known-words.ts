// Known Roots and Known particles in the mobile app (#253, #255): this
// device's Known words, kept in the given DeviceStorage under the website's key
// by the shared rules of @saaliheen/known-words (signed in, that storage is the
// Account's, which brings them to the Account, #254); the Known words page's
// head, Roots tab and Particles tab; and how a Word card is drawn with Known
// words colour on. A Root is marked by its letters, a particle by its kind and
// text (ADR 0057), from the Root or Particle dialog's Memorized? or a row of
// either tab. This module imports nothing from React Native or Expo, so the
// app's scenarios (features/known-roots.feature, features/known-particles.feature)
// run it in Node.

import {
  hasLetters,
  markKnown,
  parseKnownWords,
  rootHasLetters,
  writeKnownWords,
  type KnownWordEntry,
  type KnownWordKey,
} from "@saaliheen/known-words";
import type { Colors } from "./colours";
import { inScript, type DeviceStorage, type Script, type WordCard } from "./quran-analysis";

/** The key the Known words are kept under, as on the website. */
export const KNOWN_WORDS = "qwt-known-words";

export interface DeviceKnownWords {
  /** This device's Known words entries, marks and kept unmarks. */
  entries(): Promise<KnownWordEntry[]>;
  /** Marks (`known`) or unmarks `key` now, keeps it, and answers the entries as kept. */
  mark(key: KnownWordKey, known: boolean): Promise<KnownWordEntry[]>;
}

/** This device's Known words, kept in `device`. */
export function openKnownWords(device: DeviceStorage): DeviceKnownWords {
  const entries = async () => parseKnownWords(await device.getItem(KNOWN_WORDS));
  // Each mark reads the entries the one before it kept, so two quick taps keep both.
  let last: Promise<unknown> = Promise.resolve();
  return {
    entries,
    mark(key, known) {
      const marked = last.then(async () => {
        const next = markKnown(await entries(), key, known, Date.now());
        await device.setItem(KNOWN_WORDS, writeKnownWords(next));
        return next;
      });
      last = marked.catch(() => undefined);
      return marked;
    },
  };
}

/** What marks the Root with `letters` (ر ح م). */
export const rootKey = (letters: string): KnownWordKey => ({ kind: "root", text: letters });

/** Whether a Root or particle is a Known word now: `knownLookup` over the device's entries. */
export type KnownLookup = (key: KnownWordKey) => boolean;

/** A Root as the Known words page lists it: its letters and its Lemmas' meanings in the page's Language, most frequent first. */
export interface ListedRootIn {
  letters: string;
  meanings: string[];
}

/** One row of the Roots tab: the Root's letters, its first meanings and whether it is a Known Root. */
export interface KnownRootRow {
  letters: string;
  meanings: string;
  known: boolean;
}

export interface KnownRootsTab {
  /** Every Root the search finds, in the Root list's order. */
  rows: KnownRootRow[];
  /** What the tab says when the search finds no Root, else null. */
  none: string | null;
}

/** How many of a Root's meanings its row shows; a search reads them all. */
const SHOWN_MEANINGS = 3;

/** The Known words page's words, as on the website (apps/web/src/app/[lang]/strings.ts). */
export const KNOWN_WORDS_WORDS = {
  knownWords: "Known words",
  memorized: "Memorized?",
  roots: "Roots",
  search: "Search by letters or meaning",
  noRootsMatch: "No Root matches this search.",
  particles: "Particles",
  noParticlesMatch: "No particle matches this search.",
  count: (roots: number, allRoots: number, particles: number, allParticles: number) =>
    `${roots.toLocaleString("en")} of ${allRoots.toLocaleString("en")} Roots · ${particles.toLocaleString("en")} of ${allParticles.toLocaleString("en")} particles`,
} as const;

/** A particle as the Known words page lists it (#255): what it is kept by, its Indo-Pak text and its Spellings' meanings in the page's Language. */
export interface ListedParticleIn {
  kind: KnownWordKey["kind"];
  text: string;
  indopak: string;
  meanings: string[];
}

/** One row of the Particles tab: what the particle is kept by, its text in the reader's Script, its first meanings and whether it is a Known particle. */
export interface KnownParticleRow {
  key: KnownWordKey;
  arabic: string;
  meanings: string;
  known: boolean;
}

export interface KnownParticlesTab {
  /** Every particle the search finds, in the particle list's order, most frequent first. */
  rows: KnownParticleRow[];
  /** What the tab says when the search finds no particle, else null. */
  none: string | null;
}

/** What marks a particle: its Lemma's text, or its Spelling's when it has no Lemma. */
export const particleKey = ({ kind, text }: { kind: KnownWordKey["kind"]; text: string }): KnownWordKey => ({ kind, text });

/** Whether any of `meanings` holds `search`, case aside. */
const meaningHas = (meanings: string[], search: string) => {
  const lower = search.toLocaleLowerCase();
  return meanings.some((m) => m.toLocaleLowerCase().includes(lower));
};

/**
 * The Known words page's head: "3 of 1,642 Roots · 2 of 352 particles", how
 * many of `roots` and of `particles` are Known words, as on the website.
 */
export function knownWordsCount(roots: ListedRootIn[], particles: ListedParticleIn[], known: KnownLookup): string {
  const knownRoots = roots.filter((root) => known(rootKey(root.letters))).length;
  const knownParticles = particles.filter((particle) => known(particleKey(particle))).length;
  return KNOWN_WORDS_WORDS.count(knownRoots, roots.length, knownParticles, particles.length);
}

/**
 * The Particles tab over `particles` (most frequent first) in `script`, with
 * `search` typed: a particle is found by its Arabic letters, vowel marks
 * aside (إيا finds إِيَّا), or by any of its meanings, case aside, as on the
 * website.
 */
export function knownParticlesTab(particles: ListedParticleIn[], script: Script, known: KnownLookup, search: string): KnownParticlesTab {
  const query = search.trim();
  const finds = (particle: ListedParticleIn) => hasLetters(particle.text, query) || meaningHas(particle.meanings, query);
  const rows = (query ? particles.filter(finds) : particles).map((particle) => ({
    key: particleKey(particle),
    arabic: inScript(particle, script),
    meanings: particle.meanings.slice(0, SHOWN_MEANINGS).join(" · "),
    known: known(particleKey(particle)),
  }));
  return { rows, none: rows.length ? null : KNOWN_WORDS_WORDS.noParticlesMatch };
}

/**
 * The Roots tab over `roots` (in Arabic letter order) with the Roots of
 * `known` letters marked and `search` typed: a Root is found by its letters (رحم, ر ح م or رَحِمَ find
 * ر ح م) or by any of its meanings, case aside, as on the website.
 */
export function knownRootsTab(roots: ListedRootIn[], known: KnownLookup, search: string): KnownRootsTab {
  const query = search.trim();
  const finds = (root: ListedRootIn) => rootHasLetters(root.letters, query) || meaningHas(root.meanings, query);
  const rows = (query ? roots.filter(finds) : roots).map(({ letters, meanings }) => ({
    letters,
    meanings: meanings.slice(0, SHOWN_MEANINGS).join(" · "),
    known: known(rootKey(letters)),
  }));
  return { rows, none: rows.length ? null : KNOWN_WORDS_WORDS.noRootsMatch };
}

/** How a Word card is drawn: tinted or not, its background, its Arabic's and Word meaning's colours, and its border. */
export interface WordCardLook {
  tinted: boolean;
  background: string;
  arabic: string;
  meaning: string;
  /** The Recited Word's accent mark, else none. */
  border: string;
}

/** Whether `card`'s Word is a Known word: its Root a Known Root, or, with no Root, its particle a Known particle. */
const isKnownCard = (card: Pick<WordCard, "root" | "particle">, known: KnownLookup) =>
  card.root ? known(rootKey(card.root.letters)) : card.particle !== null && known(particleKey(card.particle));

/**
 * How `card` is drawn in `colors`: with Known words colour on, the Word of a
 * Known Root or a Known particle on the green, its Word meaning in the colour that reads on it; an Allah
 * reference's Arabic in Allah reference colour while that switch is on, and
 * the Recited Word's accent border, both over the green as over the paper.
 */
export function wordCardLook(
  card: Pick<WordCard, "root" | "particle" | "allahReference">,
  options: { knownWordsColour: boolean; known: KnownLookup; allahReferenceColour: boolean; recited: boolean },
  colors: Colors,
): WordCardLook {
  const tinted = options.knownWordsColour && isKnownCard(card, options.known);
  return {
    tinted,
    background: tinted ? colors.known : "transparent",
    arabic: card.allahReference && options.allahReferenceColour ? colors.allah : colors.ink,
    meaning: tinted ? colors.knownMeaning : colors.muted,
    border: options.recited ? colors.accent : "transparent",
  };
}
