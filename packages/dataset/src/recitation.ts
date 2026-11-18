// Following a Recitation (#115, ADR 0010): which Word the Reciter is saying at
// a moment of the Surah's audio, for any client that plays it. Pure, so the
// website and the mobile app follow it alike.

import type { Recitation } from "./types.ts";

/** A Recitation's Word timings as one list in the order they are said: each Word location and when it starts. */
type Timeline = { start: number; location: string }[];

const timelines = new WeakMap<Recitation, Timeline>();

function timelineOf(recitation: Recitation): Timeline {
  let timeline = timelines.get(recitation);
  if (!timeline) {
    timeline = recitation.ayahs
      .flatMap((ayah) => ayah.words.map(([word, start]) => ({ start, location: `${recitation.surah}:${ayah.number}:${word}` })))
      // Each Ayah's timings are in order already, but an Ayah's may run into
      // the next one's (QUL's Surah 9), so the whole Surah is put in order.
      .sort((x, y) => x.start - y.start);
    timelines.set(recitation, timeline);
  }
  return timeline;
}

/**
 * The Recited Word at `ms` into the Surah's audio: the Word location whose
 * timing started last at or before it, or null before the first Word starts.
 * So a Word stays the Recited Word through the pause after it, between Ayahs
 * included, and over a Word with no timing until the next timed Word starts;
 * when the Reciter goes back to repeat Words, the Recited Word goes back too.
 * Played from `playedFrom` ms (an Ayah's start), a Word that started before
 * it was not heard starting, so it is not the Recited Word: none is, until
 * the next Word starts.
 */
export function recitedWordAt(recitation: Recitation, ms: number, playedFrom = 0): string | null {
  const timeline = timelineOf(recitation);
  let [lo, hi] = [0, timeline.length];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].start <= ms) lo = mid + 1;
    else hi = mid;
  }
  return lo === 0 || timeline[lo - 1].start < playedFrom ? null : timeline[lo - 1].location;
}

/**
 * Where the Reciter first says the Word at `location` (`surah:ayah:word`) in
 * its Ayah, in ms of the Surah's audio: the earliest of its timings, as he may
 * go back to repeat it. Null for a Word the Recitation never times.
 */
export function firstSaidAt(recitation: Recitation, location: string): number | null {
  const [, ayah, word] = location.split(":").map(Number);
  const starts = (recitation.ayahs.find((a) => a.number === ayah)?.words ?? []).filter(([w]) => w === word).map(([, start]) => start);
  return starts.length ? Math.min(...starts) : null;
}
