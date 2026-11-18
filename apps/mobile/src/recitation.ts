// Listening to a Surah in the mobile app (#112, ADR 0010): the play control
// reads the Surah's Recitation file from /data/v1/recitations/<n>.json, plays
// its audio (streamed from the address the file gives) from the Ayah at the top
// of the screen, and follows it, marking the Recited Word's Word card and its
// Ayah faintly, until the Surah's audio ends. As on the website (#109, #114),
// beside each Ayah's number a reader can listen from that Ayah, a tap on a
// Word card while it plays carries it on from that Word, and the screen follows
// the Recited Word until the reader scrolls by hand, then offers a way back.
// The Recitation bar moves it to the previous or next Ayah, stops it, plays it
// at the Recitation speed this device keeps, says when the audio is loading,
// and, when the Recitation cannot play, says it is unavailable right now and
// offers to try again; reading carries on either way. On a phone (#113) the
// audio plays on with the screen locked or another app in front, the lock
// screen and the notification show the Surah and the Recited Word's Ayah with
// play and pause, and opening another Surah stops the Recitation. Which Word is the Recited Word is
// @saaliheen/dataset/recitation's recitedWordAt, as on the website; this module
// imports nothing from React Native or Expo, so the app's scenarios (features/)
// run it in Node with a fake RecitationAudio in place of the device's.
//
// Like quran-analysis.ts it reads only the app's origin under /data/v1; the
// Surah's audio, at the address its Recitation file gives, is the one other
// address the app asks of. Needs no Account.

import { firstSaidAt, recitedWordAt } from "@saaliheen/dataset/recitation";
import type { Recitation } from "@saaliheen/dataset/types";
import type { DeviceStorage } from "./quran-analysis";

/**
 * The device's audio as a Recitation drives it: expo-audio's player on a
 * phone, a fake in the scenarios. Positions are in ms into the loaded file.
 */
export interface RecitationAudio {
  /** Loads the file at `url`, replacing any loaded one, paused at its start, at normal speed. */
  load(url: string): void;
  seekTo(ms: number): void;
  play(): void;
  pause(): void;
  /** Plays at `speed` × normal, until the next file loads. */
  setSpeed(speed: number): void;
  /** Calls `listener` with the position as the audio moves on; the returned function stops it. */
  onProgress(listener: (ms: number) => void): () => void;
  /** Calls `listener` once the audio has played to the end of its file; the returned function stops it. */
  onEnd(listener: () => void): () => void;
  /** Calls `listener` with true while the audio waits for more of its file, false once it plays on; the returned function stops it. */
  onWaiting(listener: (waiting: boolean) => void): () => void;
  /** Calls `listener` once the loaded file cannot play (unreachable, or answered with an error); the returned function stops it. */
  onFailure(listener: () => void): () => void;
  /** Lets the audio play on while the app is off the screen (the screen locked, or another app in front). */
  keepPlayingInBackground(): void;
  /** Shows `nowPlaying` on the lock screen and the notification, with play and pause there; shown again, it replaces what they show. */
  showOnLockScreen(nowPlaying: NowPlaying): void;
  /** Takes the app's audio off the lock screen and the notification. */
  clearLockScreen(): void;
  /** Calls `listener` when the audio is played or paused outside the app (the lock screen, the notification); the returned function stops it. */
  onPlayPause(listener: (playing: boolean) => void): () => void;
  /** Where the audio is now, in ms. */
  currentPosition(): number;
  /** Calls `listener` when the app comes back on the screen; the returned function stops it. */
  onReturnToApp(listener: () => void): () => void;
}

/** What the lock screen and the notification show of a Recitation: its Surah and Ayah, and its Reciter. */
export interface NowPlaying {
  title: string;
  artist: string;
}

/** The Recitation speeds the Recitation bar offers, slowest first, as on the website (#110). */
export const SPEEDS: readonly number[] = [0.75, 1, 1.25];

/** PROPOSED storage key, the website's for the same setting. */
const RECITATION_SPEED = "qwt-recitation-speed";

/** The Recitation speed `device` keeps; normal when none is kept, it is not one offered, or the device cannot say. */
async function storedSpeed(device: DeviceStorage): Promise<number> {
  const speed = Number(await device.getItem(RECITATION_SPEED).catch(() => null));
  return SPEEDS.includes(speed) ? speed : 1;
}

/** The Recitation bar while it is on screen. */
export interface RecitationBar {
  /** What its main button offers: "try again" while the Recitation cannot play. */
  offers: "pause" | "play" | "try again";
  /** What it says: "loading" while the audio waits for more of its file, "unavailable right now" while it cannot play. */
  says: "loading" | "unavailable right now" | null;
  /** Its previous Ayah button: disabled in the Surah's first Ayah. */
  previousAyah: "enabled" | "disabled";
  /** Its next Ayah button: disabled in the Surah's last Ayah. */
  nextAyah: "enabled" | "disabled";
  /** The Recitation speed, × normal. */
  speed: number;
  /** The Recitation speeds it offers, slowest first. */
  speeds: readonly number[];
}

/** A Recitation started from a Surah screen: its Recitation bar and its marks, as the screen shows them now. */
export interface PlayingRecitation {
  /** The Recitation bar: null when it is not on screen. */
  readonly bar: RecitationBar | null;
  /** The Recited Word's Word location, whose Word card is marked; null when no Word card is marked. */
  readonly recitedWord: string | null;
  /** The number of the Ayah marked faintly (the Recited Word's); null when none is. */
  readonly markedAyah: number | null;
  /** The Recitation bar's pause button. */
  pause(): void;
  /** The Recitation bar's play button. */
  play(): void;
  /** "Listen from here" beside Ayah `ayah`'s number: carries the Recitation on from that Ayah's start, playing (trying again from there while it cannot play). */
  listenFrom(ayah: number): void;
  /** A tap on the Word card at `location` while the audio plays: carries it on from where the Reciter first says that Word, if he does. */
  tapWord(location: string): void;
  /** The Recitation bar's previous Ayah button: carries the Recitation on from the start of the Ayah before the one it is in. */
  previousAyah(): void;
  /** The Recitation bar's next Ayah button: carries the Recitation on from the start of the Ayah after the one it is in. */
  nextAyah(): void;
  /** The Recitation bar's stop button: ends the Recitation, taking the bar and the marks away, and the lock screen shows nothing of it. */
  stop(): void;
  /** The Recitation bar's Recitation speed: plays at `speed`, kept on the device for later Recitations; settles once it is kept. */
  chooseSpeed(speed: number): Promise<void>;
  /** The Recitation bar's try again button: reads the Recitation file again if it has to and plays from where the Recitation was to start; settles once it has tried. */
  tryAgain(): Promise<void>;
  /** The Word location whose card the screen keeps on screen: the Recited Word while it follows it, else null. */
  readonly followed: string | null;
  /** Whether the button back to the Recited Word is on screen: once the reader has scrolled by hand. */
  readonly offersWayBack: boolean;
  /** The reader scrolls the screen by hand: it stops following the Recited Word. */
  scrolledByHand(): void;
  /** The button back to the Recited Word: the screen follows it again. */
  backToRecitedWord(): void;
  /** Calls `listener` whenever the bar or the marks change, so the screen can draw them; the returned function stops it. */
  subscribe(listener: () => void): () => void;
}

export interface StartRecitationOptions {
  /** The origin the app reads /data/v1 from. */
  origin: string;
  /** The device's audio. */
  audio: RecitationAudio;
  /** The device's storage, which keeps the Recitation speed. */
  device: DeviceStorage;
  /** The Surah whose screen the play control is on. */
  surah: number;
  /** The Ayah at the top of the screen when the play control is pressed. */
  topAyah: number;
  /** The Surah's name as the Surah index gives it, for the lock screen. */
  surahName: string;
}

/** A Surah's Recitation file, read from `origin`'s /data/v1; null when it cannot be read. */
async function readRecitation(origin: string, surah: number): Promise<Recitation | null> {
  try {
    const response = await fetch(`${origin}/data/v1/recitations/${surah}.json`);
    return response.ok ? ((await response.json()) as Recitation) : null;
  } catch {
    return null;
  }
}

/** The Ayah number in a Word location ("2:9:6" → 9). */
export const ayahOf = (location: string) => Number(location.split(":")[1]);

/** Where Ayah `ayah` starts in the Surah's audio, in ms; the audio's start for an Ayah the file lacks. */
const startOf = (recitation: Recitation, ayah: number) => recitation.ayahs.find((a) => a.number === ayah)?.from ?? 0;

/** The Ayah `step` Ayahs on from Ayah `ayah` in the Recitation (-1: the one before); null past either end. */
function ayahBeside(recitation: Recitation | null, ayah: number, step: 1 | -1): number | null {
  if (!recitation) return null;
  const index = recitation.ayahs.findIndex((a) => a.number === ayah);
  return recitation.ayahs[index + step]?.number ?? null;
}

/** Whether a Recitation bar offering `offers` is playing: it offers to pause. A paused one, or one that cannot play, is not. */
export const plays = (offers: RecitationBar["offers"] | null | undefined) => offers === "pause";

const enabledIf = (on: boolean): RecitationBar["previousAyah"] => (on ? "enabled" : "disabled");

/** The lock screen's title while Ayah `ayah` of Surah `surah` is being recited: "Al-Kawthar 108:2". */
const titleOf = (surahName: string, surah: number, ayah: number) => `${surahName} ${surah}:${ayah}`;

/** The Recitation playing now, of the Surah whose screen started it; null when none is. */
let current: { surah: number; recitation: PlayingRecitation } | null = null;

/**
 * A Surah screen opening (#113): a Recitation of any other Surah stops. The
 * screens pushed on the app's navigator stay open beneath the one on top, so a
 * Recitation outlives its screen going out of sight; one plays at a time.
 */
export function surahOpened(surah: number) {
  if (current && current.surah !== surah) current.recitation.stop();
}

/**
 * The play control on a Surah screen: resolves once the Surah's audio is
 * playing from the start of `topAyah`, or, when the Recitation file cannot be
 * read or its audio cannot play, with the Recitation bar saying it is
 * unavailable right now and offering to try again.
 */
export async function startRecitation({ origin, audio, device, surah, topAyah, surahName }: StartRecitationOptions): Promise<PlayingRecitation> {
  let [recitation, speed] = await Promise.all([readRecitation(origin, surah), storedSpeed(device)]);
  /** The Ayah the Recitation is in: where it last started, or the Recited Word's. */
  let ayah = topAyah;
  /** Where the reader last started it, in ms: a Word said before, unheard, is never marked. */
  let from = 0;
  /** What the bar's main button offers; null once the bar is off screen. */
  let offers: RecitationBar["offers"] | null = "pause";
  let says: RecitationBar["says"] = null;
  let recitedWord: string | null = null;
  /** Whether the screen follows the Recited Word: it stops when the reader scrolls by hand. */
  let following = true;
  /** The Ayah the lock screen and the notification show; null while they show nothing of the Recitation. */
  let shownAyah: number | null = null;
  const listeners = new Set<() => void>();
  /** Whether the audio can be played, paused or moved: the bar is on and has not failed. */
  const playable = () => recitation !== null && (offers === "pause" || offers === "play");
  /** The lock screen follows the Ayah the Recitation is in, while it can play. */
  const showOnLockScreen = () => {
    if (!playable() || ayah === shownAyah) return;
    shownAyah = ayah;
    audio.showOnLockScreen({ title: titleOf(surahName, surah, ayah), artist: recitation!.reciter });
  };
  const clearLockScreen = () => {
    if (shownAyah === null) return;
    shownAyah = null;
    audio.clearLockScreen();
  };
  const changed = () => {
    showOnLockScreen();
    listeners.forEach((listener) => listener());
  };

  const fail = () => {
    audio.pause();
    offers = "try again";
    says = "unavailable right now";
    recitedWord = null;
    clearLockScreen();
    changed();
  };
  /** The Recited Word is the one said at `ms`, and the Recitation is in its Ayah. */
  const mark = (ms: number) => {
    if (!recitation) return;
    const now = recitedWordAt(recitation, ms, from);
    if (now === recitedWord) return;
    recitedWord = now;
    if (now !== null) ayah = ayahOf(now);
    changed();
  };
  /** The audio was played or paused outside the app: the bar offers what it is not doing. */
  const follow = (isPlaying: boolean) => {
    if (!playable()) return;
    offers = isPlaying ? "pause" : "play";
    changed();
  };
  const unlisten = [
    audio.onProgress(mark),
    audio.onPlayPause(follow),
    // Back on the screen: the phone may have sent no updates while the app was away.
    audio.onReturnToApp(() => mark(audio.currentPosition())),
    // The end of the Surah: the Recitation stops there.
    audio.onEnd(() => end()),
    audio.onWaiting((waiting) => {
      const now = waiting ? "loading" : null;
      if (!playable() || says === now) return;
      says = now;
      changed();
    }),
    audio.onFailure(() => {
      if (offers !== "try again") fail();
    }),
  ];
  /** Takes the bar, the marks and the lock screen away and stops listening to the audio. */
  const end = () => {
    unlisten.forEach((stop) => stop());
    if (current?.recitation === playing) current = null;
    offers = null;
    says = null;
    recitedWord = null;
    clearLockScreen();
    changed();
  };
  /** Loads the Surah's audio and plays it from the start of `ayah`, at the Recitation speed. */
  const begin = (recited: Recitation) => {
    from = startOf(recited, ayah);
    offers = "pause";
    says = null;
    recitedWord = null;
    audio.load(recited.audio);
    audio.setSpeed(speed);
    audio.seekTo(from);
    audio.play();
    changed();
  };
  /** The bar's button: plays or pauses the audio while it can. */
  const press = (button: "pause" | "play") => {
    if (!playable()) return;
    if (button === "pause") audio.pause();
    else audio.play();
    follow(button === "play");
  };
  /** Carries the playing audio on from `ms` in Ayah `to`, `word` the Recited Word there (none until the next Word starts, for an Ayah's start), the screen following it. */
  const carryOnFrom = (ms: number, to: number, word: string | null) => {
    from = ms;
    ayah = to;
    audio.seekTo(ms);
    audio.play();
    offers = "pause";
    recitedWord = word;
    following = true;
    changed();
  };
  /** Carries the audio on from the start of Ayah `to`, if there is one and it can. */
  const carryOnTo = (to: number | null) => {
    if (to !== null && recitation && playable()) carryOnFrom(startOf(recitation, to), to, null);
  };
  const tryAgain = async () => {
    if (offers !== "try again") return;
    recitation ??= await readRecitation(origin, surah);
    if (recitation) begin(recitation);
  };
  const setFollowing = (on: boolean) => {
    following = on;
    changed();
  };

  audio.keepPlayingInBackground();
  if (recitation) begin(recitation);
  else fail();

  const playing: PlayingRecitation = {
    get bar() {
      if (offers === null) return null;
      const previousAyah = enabledIf(ayahBeside(recitation, ayah, -1) !== null);
      const nextAyah = enabledIf(ayahBeside(recitation, ayah, 1) !== null);
      return { offers, says, previousAyah, nextAyah, speed, speeds: SPEEDS };
    },
    get recitedWord() {
      return recitedWord;
    },
    get markedAyah() {
      return recitedWord === null ? null : ayahOf(recitedWord);
    },
    get followed() {
      return following ? recitedWord : null;
    },
    get offersWayBack() {
      return !following;
    },
    pause: () => press("pause"),
    play: () => press("play"),
    listenFrom(to) {
      if (offers !== "try again") return carryOnTo(to);
      ayah = to;
      void tryAgain();
    },
    tapWord(location) {
      const said = recitation && plays(offers) ? firstSaidAt(recitation, location) : null;
      if (said !== null) carryOnFrom(said, ayahOf(location), location);
    },
    previousAyah: () => carryOnTo(ayahBeside(recitation, ayah, -1)),
    nextAyah: () => carryOnTo(ayahBeside(recitation, ayah, 1)),
    stop() {
      if (offers === null) return;
      audio.pause();
      end();
    },
    async chooseSpeed(chosen) {
      if (!SPEEDS.includes(chosen)) return;
      speed = chosen;
      audio.setSpeed(chosen);
      changed();
      await device.setItem(RECITATION_SPEED, String(chosen));
    },
    tryAgain,
    scrolledByHand: () => setFollowing(false),
    backToRecitedWord: () => setFollowing(true),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  current = { surah, recitation: playing };
  return playing;
}

/** A Word card's place in the device's window, in px from its top. */
export interface CardOnScreen {
  top: number;
  bottom: number;
}

/**
 * How far the Surah screen scrolls to follow the Recited Word, in px down the
 * Surah (negative: back up it): 0 while its card is clear of the Surah bar and
 * the Recitation bar, `seen` being the window between them; else as far as
 * brings the card to the middle of what a reader sees, as the website does, or
 * its top to the top of it for a card too tall to fit.
 */
export function scrollToFollow(card: CardOnScreen, seen: SeenArea): number {
  if (card.top >= seen.top && card.bottom <= seen.bottom) return 0;
  const room = seen.bottom - seen.top - (card.bottom - card.top);
  return card.top - seen.top - Math.max(room, 0) / 2;
}

/** Where an Ayah on the Surah screen is laid out, in px from the top of the device's window. */
export interface AyahOnScreen {
  number: number;
  top: number;
  bottom: number;
}

/** The part of the window a reader sees the Surah's Ayahs in: below the Surah bar, down to the window's bottom, in px. */
export interface SeenArea {
  top: number;
  bottom: number;
}

/**
 * The Ayah at the top of the screen, which the play control plays from: the
 * first Ayah, top to bottom, of which a reader sees at least half below the
 * Surah bar, or, for an Ayah too tall for that, which fills at least half of
 * what a reader sees. So an Ayah scrolled behind the Surah bar, or showing only a
 * sliver below it, is not the top one (the list scrolls under the Surah bar on iOS).
 * Null when no Ayah on screen is seen so.
 */
export function ayahAtTop(ayahs: readonly AyahOnScreen[], seen: SeenArea): number | null {
  const shown = (ayah: AyahOnScreen) => Math.min(ayah.bottom, seen.bottom) - Math.max(ayah.top, seen.top);
  const enough = (ayah: AyahOnScreen) => Math.min(ayah.bottom - ayah.top, seen.bottom - seen.top) / 2;
  const top = [...ayahs].sort((x, y) => x.top - y.top).find((ayah) => shown(ayah) >= enough(ayah));
  return top?.number ?? null;
}
