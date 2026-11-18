// The committed Surah files (../site/committed-output.ts) as /data/v1 serves
// them since #249: each rootless Word given its particle after its Root tag,
// before any Phrase colour, as the dataset builder now makes it of the
// committed sources; and every particle as /data/v1/particles.json lists it
// (#255). Kept apart from committed-output.ts, which the website's
// scenarios load too, where the dataset builder does not load.

import type { Language, ListedParticle, ParticleTag } from "@saaliheen/dataset";
import { committedBuiltSurah, surahBeforeTheMove } from "../site/committed-output.ts";
import { allWords, buildFromCommittedSources } from "../dataset/support.ts";

let particles: Map<string, ParticleTag> | undefined;

/** The particle the builder gives the Word at `location`, if it has no Root. */
export const particleAt = (location: string) =>
  (particles ??= new Map(allWords(buildFromCommittedSources()).flatMap((w) => (w.particle ? [[w.location, w.particle] as const] : [])))).get(
    location,
  );

interface CommittedWord {
  location: string;
  phraseColour?: string;
}

/** `file` with each rootless Word carrying its particle, before any Phrase colour (#249). */
export function withParticles<T>(file: { ayahs: { words: CommittedWord[] }[] }): T {
  return {
    ...file,
    ayahs: file.ayahs.map((ayah) => ({
      ...ayah,
      words: ayah.words.map(({ phraseColour, ...word }) => {
        const particle = particleAt(word.location);
        return { ...word, ...(particle && { particle }), ...(phraseColour !== undefined && { phraseColour }) };
      }),
    })),
  } as T;
}

const built = new Map<number, unknown>();

/** Surah `n`'s file as the dataset build last committed it (committedBuiltSurah), each rootless Word carrying its particle. */
export function servedBuiltSurah<T = unknown>(n: number): T {
  if (!built.has(n)) built.set(n, withParticles(committedBuiltSurah(n)));
  return built.get(n) as T;
}

/** Surah `n`'s file as surahBeforeTheMove gives it, each rootless Word carrying its particle. */
export const servedSurahBeforeTheMove = (n: number) => withParticles<ReturnType<typeof surahBeforeTheMove>>(surahBeforeTheMove(n));

/** Every particle as /data/v1/particles.json lists it (#255): the builder's particles by number, each with its Spellings' meanings in each Language, empty and repeated ones left out. */
export function builtParticleList(): ListedParticle[] {
  return buildFromCommittedSources().dataset.particles.map(({ id, kind, text, indopak, spellings }) => {
    const meanings = (language: Language) => [...new Set(spellings.map((s) => s.meaning[language]).filter((meaning) => meaning !== ""))];
    return { id, kind, text, indopak, meanings: { ur: meanings("ur"), en: meanings("en") } };
  });
}
