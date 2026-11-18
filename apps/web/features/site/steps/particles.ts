// What a particle looks like to a user (#249), read from the committed
// sources as ./roots reads a Root: a Word QUL's word root database gives no
// Root belongs to the particle its QUL Lemma makes it, else its Spelling (its
// Uthmani text with pause marks set aside); the particle's Spellings are its
// Words grouped by Spelling, as a Lemma's are. Nothing here is typed from
// memory or read from the generated dataset.

import { indopakText, sourceWord, sourceWords } from "../support";
import type { Script } from "./reader";
import { byOccurrences, compareLocations, qulAnalysis, spellingMeaning, withoutPauseMarks, type ExpectedSpelling } from "./roots";

export interface ExpectedParticle {
  kind: "lemma" | "spelling";
  /** Its QUL Lemma's text, or its Spelling's Uthmani text with pause marks set aside. */
  text: string;
  /** Its text in Indo-Pak: a Lemma particle's Lemma text, a Spelling particle's first Word location's Indo-Pak text. */
  indopak: string;
  occurrences: number;
  spellings: ExpectedSpelling[];
}

let byLocation: Map<string, ExpectedParticle> | undefined;

/** Every rootless Word location's particle, as the sources give them. */
function particles(): Map<string, ExpectedParticle> {
  if (byLocation) return byLocation;
  const { rootOf, lemmaOf, lemmaText } = qulAnalysis();
  const groups = new Map<string, { kind: ExpectedParticle["kind"]; text: string; bySpelling: Map<string, string[]> }>();
  for (let surah = 1; surah <= 114; surah++) {
    for (const { location, uthmani } of sourceWords(surah)) {
      if (rootOf.has(location)) continue;
      const spelling = withoutPauseMarks(uthmani);
      const lemma = lemmaOf.get(location);
      const [kind, text] = lemma === undefined ? (["spelling", spelling] as const) : (["lemma", lemmaText.get(lemma)!] as const);
      const key = `${kind} ${text}`;
      if (!groups.has(key)) groups.set(key, { kind, text, bySpelling: new Map() });
      const { bySpelling } = groups.get(key)!;
      bySpelling.set(spelling, [...(bySpelling.get(spelling) ?? []), location]);
    }
  }
  byLocation = new Map();
  for (const { kind, text, bySpelling } of groups.values()) {
    const spellings = [...bySpelling.values()]
      .map((ls) => ls.sort(compareLocations))
      .map((ls) => ({ uthmani: sourceWord(ls[0]).uthmani, indopak: indopakText(ls[0]), meaning: spellingMeaning(ls[0]), locations: ls }))
      .sort(byOccurrences);
    const particle = {
      kind,
      text,
      indopak: kind === "lemma" ? text : spellings[0].indopak,
      occurrences: spellings.reduce((n, s) => n + s.locations.length, 0),
      spellings,
    };
    for (const s of spellings) for (const l of s.locations) byLocation.set(l, particle);
  }
  return byLocation;
}

/** The particle a Word location belongs to, or null for a Word QUL gives a Root. */
export const particleAt = (location: string): ExpectedParticle | null => particles().get(location) ?? null;

/** The text a Script shows for a particle. */
export const particleText = (p: ExpectedParticle, script: Script) => (script === "uthmani" ? p.text : p.indopak);

/** A particle's first Word location. */
const firstLocation = (p: ExpectedParticle) => p.spellings.flatMap((s) => s.locations).sort(compareLocations)[0];

/** Every particle, most frequent first, ties by first Word location: the order the Known words page lists them in (#251). */
export const allParticles = (): ExpectedParticle[] =>
  [...new Set(particles().values())].sort(
    (a, b) => b.occurrences - a.occurrences || compareLocations(firstLocation(a), firstLocation(b)),
  );
