// The Recitation speed (#110): a few fixed steps around normal, kept per device
// in browser storage and remembered on later visits, on every Surah page.

import { readStored, store } from "../storage";

/** The Recitation speeds the Recitation bar offers, slowest first. */
export const SPEEDS: readonly number[] = [0.75, 1, 1.25];

/** PROPOSED storage key, beside qwt-script and qwt-theme. */
const RECITATION_SPEED = "qwt-recitation-speed";

/** The Recitation speed this device keeps; normal when none is kept, or it is not one offered. */
export function storedSpeed(): number {
  const speed = Number(readStored(RECITATION_SPEED));
  return SPEEDS.includes(speed) ? speed : 1;
}

export const storeSpeed = (speed: number) => store(RECITATION_SPEED, String(speed));

/** Plays `audio` at `speed`, now and after it loads (loading resets the rate to the default one). */
export function playAt(audio: HTMLAudioElement, speed: number) {
  audio.defaultPlaybackRate = speed;
  audio.playbackRate = speed;
}
