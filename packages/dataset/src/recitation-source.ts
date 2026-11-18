// The Recitation's import (#115, ADR 0010): Yasser ad-Dussary's Surah-by-Surah
// Murattal from QUL (resource 422), committed as QUL publishes it, keyed
// `surah:ayah`, each entry its `[word, start ms, end ms]` timings and where
// the Ayah starts and ends on the clock of its Surah's one audio file. The
// audio itself is streamed from Tarteel's CDN, never copied into the repo.

import { isObject } from "./source-json.ts";
import type { Recitation, RecitedAyah, Surah, WordTiming } from "./types.ts";

export const RECITATION_SOURCE = "yasser-ad-dussary-surah-by-surah.json";

const RECITER = "Yasser ad-Dussary";

/** Surah `number` as three digits, `001` … `114`, as its audio files are named. */
const paddedSurah = (number: number) => String(number).padStart(3, "0");

/** Surah `n`'s audio file on Tarteel's CDN; hosting it ourselves later changes only this (ADR 0010). */
const audioUrl = (surah: number) =>
  `https://audio-cdn.tarteel.ai/quran/surah/yasserAlDosari/murattal/mp3/${paddedSurah(surah)}.mp3`;

/** One Ayah's entry in the source, as validated by `isAyahTiming`. */
interface SourceAyah {
  segments: WordTiming[];
  timestamp_from: number;
  timestamp_to: number;
}

const isMs = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

const isWordTiming = (value: unknown): value is WordTiming =>
  Array.isArray(value) && value.length === 3 && Number.isInteger(value[0]) && value[0] >= 1 && isMs(value[1]) && isMs(value[2]);

const isSourceAyah = (entry: unknown): entry is SourceAyah =>
  isObject(entry) &&
  Array.isArray(entry.segments) &&
  entry.segments.every(isWordTiming) &&
  isMs(entry.timestamp_from) &&
  isMs(entry.timestamp_to);

/**
 * Each Surah's Recitation from the source, with every Word of `surahs` the
 * source gives no timing, in Word order (the report's untimed Words). Throws,
 * naming the source, when an Ayah's entry is missing or malformed, or times a
 * Word its Ayah does not have.
 */
export function buildRecitations(
  json: Record<string, unknown>,
  surahs: Pick<Surah, "number" | "ayahs">[],
): { recitations: Recitation[]; untimedWords: string[] } {
  const untimedWords: string[] = [];
  const recitations = surahs.map(({ number, ayahs }) => ({
    surah: number,
    reciter: RECITER,
    audio: audioUrl(number),
    ayahs: ayahs.map((ayah): RecitedAyah => {
      const key = `${number}:${ayah.number}`;
      const entry = json[key];
      if (!isSourceAyah(entry)) throw new Error(`${RECITATION_SOURCE}: missing or malformed entry at ${key}`);
      const beyond = entry.segments.find(([word]) => word > ayah.words.length);
      if (beyond) throw new Error(`${RECITATION_SOURCE}: ${key} times Word ${beyond[0]}, but the Ayah has ${ayah.words.length} Words`);
      const timed = new Set(entry.segments.map(([word]) => word));
      ayah.words.forEach((word, k) => timed.has(k + 1) || untimedWords.push(word.location));
      return {
        number: ayah.number,
        from: entry.timestamp_from,
        to: entry.timestamp_to,
        // QUL lists a few timings out of time order (8:1, 7:2): put them in the order they are said.
        words: entry.segments.toSorted((x, y) => x[1] - y[1]),
      };
    }),
  }));
  return { recitations, untimedWords };
}
