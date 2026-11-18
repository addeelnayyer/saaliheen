"use client";

// Listening to a Surah (#115, ADR 0010): its Recitation plays from an Ayah to
// the end of the Surah, where it stops, while the Recited Word's Word card is
// marked over its Phrase colour and its Ayah faintly. The audio streams from
// Tarteel's CDN, one file per Surah; the Word timings are the Surah's
// Recitation file in the published dataset, fetched the first time it plays.
// The marks are data-recited on the Word card and its Ayah's section, set here
// and never rendered by React, as the Ayahs are many and memoised; a Surah
// opened in parts marks a Word once its part has arrived. The Bismillah line
// is never marked: the Surah's audio starts at Ayah 1. Needs no Account.
// The Recitation bar (#110) moves it to the previous or next Ayah, stops it,
// sets the Recitation speed, and says when it is loading or unavailable.
// Listening counts as reading (#111): each Ayah the Recited Word reaches is
// recorded as the Surah's Reading place, as reading-place-tracker.tsx records
// the Ayah a scroll stops at, so it comes to the top of the Reading places
// and, signed in, goes to the Account.
// Each Ayah's heading listens from that Ayah, and while it plays a tap on a
// Word card carries it on from where the Reciter first says that Word (#109);
// both are clicks this listens for on the page, as the Ayahs are many. The page
// follows the Recited Word, keeping its card on screen clear of the Surah bar
// and the Recitation bar, until the reader scrolls by hand; a button then
// brings it back and follows it again.
// In Flowing (#126), which has no Ayah headings, a tap on any Word, or Enter or
// Space on it (word-taps.ts), plays from where the Reciter first says it
// even when nothing is playing; while a Word is marked there, the Arabic and
// Ayah ends of the other Ayahs are dimmed (surah.module.css). Switching the
// Ayah layout while a Word is marked keeps it in sight and follows it again.
// In Study with Hide Word meanings on (#256), a tap on a Word card, or Enter
// or Space on it, while nothing plays shows or hides its Word meaning
// (word-meanings.ts) instead.

import { createContext, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { firstSaidAt, recitedWordAt } from "@saaliheen/dataset/recitation";
import type { Recitation } from "@saaliheen/dataset/types";
import { pageHeld } from "@/lib/hold-page";
import { ayahId, ayahOf } from "../reading-place";
import { recordReading } from "../synced-reading-places";
import { STRINGS } from "../strings";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import styles from "./recitation.module.css";
import { landOn } from "./ayah-at-top";
import { notePageFollowing } from "./followed-scroll";
import { isFlowing, keepWordsTappable } from "./word-taps";
import { playAt, SPEEDS, storedSpeed, storeSpeed } from "./recitation-speed";
import { meaningsHidden, toggleMeaning } from "./word-meanings";

/** Off until a reader plays it, then loading until the audio plays, and failed when it cannot. */
type State = "off" | "loading" | "playing" | "paused" | "failed";

/** The Recitation of the Surah on screen: where it is, and what a reader can do with it. */
interface Listening {
  state: State;
  /** The Ayah being recited, and the Surah's last. */
  ayah: number;
  lastAyah: number;
  /** Plays from the start of Ayah `ayah`. Called from a press, so the browser lets it play. */
  playFrom: (ayah: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  /** Plays again, from the start of the Ayah last asked for, once it could not play. */
  retry: () => void;
  speed: number;
  setSpeed: (speed: number) => void;
  /** Whether the page follows the Recited Word: it stops when the reader scrolls by hand. */
  following: boolean;
  /** Brings the Recited Word's card back on screen and follows it again. */
  backToRecitedWord: () => void;
  /**
   * Makes `change` (the Ayah layout switching) keep the Recited Word in sight,
   * seated below the Surah bar, and follows it again; false, with `change`
   * not made, when no Word is marked.
   */
  keepRecitedWordInSight: (change: () => void) => boolean;
}

const RecitationContext = createContext<Listening | null>(null);

/** The Recitation of the Surah on screen, for its Surah bar's play button and its Recitation bar. */
export function useRecitation(): Listening {
  const recitation = useContext(RecitationContext);
  if (!recitation) throw new Error("useRecitation needs a RecitationProvider");
  return recitation;
}

const noop = () => {};

/** What marks the Recited Word's card and, faintly, its Ayah (surah.module.css). */
const MARK = "data-recited";

/** Marks the Word card at `location` and its Ayah, and returns what unmarks them; null when the Word is not on the page yet. */
function mark(location: string): (() => void) | null {
  const card = document.getElementById(location);
  if (!card) return null;
  const ayah = card.closest("section");
  card.setAttribute(MARK, "");
  ayah?.setAttribute(MARK, "");
  return () => {
    card.removeAttribute(MARK);
    ayah?.removeAttribute(MARK);
  };
}

/** A Word card's id: its Word location. */
const WORD_LOCATION = /^\d+:\d+:\d+$/;

/** The Word location of the Word card a click landed on, away from its Root tag or any control; null for any other click. */
function wordTapped(target: Element): string | null {
  if (target.closest("a, button, dialog")) return null;
  const id = target.closest("[id]")?.id ?? "";
  return WORD_LOCATION.test(id) ? id : null;
}

/** The keys that tap a focused Word. */
const TAP_KEYS = new Set(["Enter", " "]);

/** The Word location of the Word Enter or Space was pressed on, a Word the keyboard reaches (word-taps.ts); null for any other key. */
function wordKeyed({ key, target }: KeyboardEvent): string | null {
  return TAP_KEYS.has(key) && target instanceof Element && target.hasAttribute("tabindex") && WORD_LOCATION.test(target.id) ? target.id : null;
}

/** The Ayah whose heading's listen button a click landed on, or null. */
function listenPressed(target: Element): number | null {
  const button = target.closest<HTMLElement>("button[data-listen]");
  return button ? Number(button.dataset.listen) : null;
}

/** Whether `card` is wholly on screen with nothing over its top or its bottom edge: not the Surah bar, not the Recitation bar. */
function inSight(card: Element): boolean {
  const r = card.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) return false;
  const x = r.left + r.width / 2;
  return [r.top + 2, r.bottom - 2].every((y) => card.contains(document.elementFromPoint(x, y)));
}

/**
 * Where to put the audio, in seconds, to start at `ms`: half a ms after it,
 * as a time in ms read back from seconds can fall a hair short of it (8.065 s
 * reads back as 8064.999… ms) and so before the Word that starts there.
 */
const secondsAt = (ms: number) => (ms + 0.5) / 1000;

/** How long a scroll to the Recited Word is given to arrive, in ms, before the page looks again. */
const SCROLL_MS = 700;

const scrollBehaviour = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");

/** The keys that scroll the page. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/** Whether `event` scrolls the page by hand: the wheel, a finger, or a scrolling key outside a control; never while a dialog holds the page. */
function scrollsByHand(event: Event): boolean {
  if (pageHeld()) return false;
  const target = event.target instanceof Element ? event.target : document.body;
  return !(event instanceof KeyboardEvent) || (SCROLL_KEYS.has(event.key) && !target.closest("input, textarea, select, button, [role='button'], [contenteditable]"));
}

/** What a reader does to scroll the page by hand. */
const HAND_SCROLLS = ["wheel", "touchmove", "keydown"] as const;

/** How far short of an Ayah's start a seek to it may land and still be in that Ayah, in ms. */
const SEEK_LEEWAY = 50;

/** The Ayah being recited at `ms` into the audio: the last whose start it has reached, or Ayah 1. */
function ayahAt(ayahStarts: number[], ms: number): number {
  let ayah = 1;
  while (ayah < ayahStarts.length && ayahStarts[ayah] <= ms + SEEK_LEEWAY) ayah++;
  return ayah;
}

/**
 * Answers what hears each Recited Word's location and records its Ayah as
 * read once, when the Recitation reaches it, so the Reading place moves with
 * the Reciter, back as well as on.
 */
function readingAlong(): (location: string | null) => void {
  let heard: string | null = null;
  return (location) => {
    const place = location ? ayahOf(location) : null;
    const id = place && ayahId(place);
    if (!id || id === heard) return;
    heard = id;
    recordReading(place);
  };
}

/**
 * `audio` is the Surah's audio file, `reciter` whose voice it is, and
 * `ayahStarts` where each Ayah starts in it, in ms, Ayah 1 first: enough to
 * start playing from any Ayah at once, inside the press, before the Word
 * timings are fetched from `timings`.
 */
export function RecitationProvider({
  audio: url,
  reciter,
  ayahStarts,
  timings: timingsUrl,
  children,
}: {
  audio: string;
  reciter: string;
  ayahStarts: number[];
  timings: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>("off");
  const [ayah, setAyah] = useState(1);
  const [speed, setSpeedState] = useState(1);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timings = useRef<Recitation | null>(null);
  /** The fetch of the Word timings, once started; cleared when it fails, so a later play tries again. */
  const loading = useRef<Promise<void> | null>(null);
  /** The Word location of a Word card tapped while it played before the timings arrived, carried on from once they do; null when none waits. */
  const tappedEarly = useRef<string | null>(null);
  /** Where the reader last started it, in ms: a Word said before, unheard, is never marked. */
  const playedFrom = useRef(0);
  /** The Ayah the reader last asked for, where a retry starts. */
  const askedFor = useRef(1);
  const unfollow = useRef(noop);
  /** The Word location marked as the Recited Word, or null. */
  const recited = useRef<string | null>(null);
  const [following, setFollowing] = useState(true);
  const followingNow = useRef(true);
  /** Until when (performance.now()) a scroll to the Recited Word is still arriving. */
  const scrolling = useRef(0);

  const setFollow = (on: boolean) => {
    followingNow.current = on;
    setFollowing(on);
    notePageFollowing(on && audio.current !== null);
  };

  // Brings the Recited Word's card to the middle of the screen when it is out
  // of sight, unless a dialog is over the page or a scroll to it is arriving.
  const keepInSight = () => {
    const card = recited.current && document.getElementById(recited.current);
    if (!card || performance.now() < scrolling.current || pageHeld() || inSight(card)) return;
    card.scrollIntoView({ block: "center", behavior: scrollBehaviour() });
    scrolling.current = performance.now() + SCROLL_MS;
  };

  const backToRecitedWord = () => {
    setFollow(true);
    scrolling.current = 0;
    keepInSight();
  };

  // Follows the audio while there is one: the Recited Word is looked up every
  // frame while it plays, and whenever it is moved, so a pause or a seek keeps
  // the mark where the Reciter is, and the page follows it while it may.
  const follow = () => {
    const el = audio.current!;
    let unmark = noop;
    let frame = 0;
    const read = readingAlong();
    const remark = (location: string | null) => {
      if (location === recited.current) return;
      unmark();
      // A Word whose part has not arrived is marked by a later look, once it has.
      const undo = location ? mark(location) : null;
      recited.current = undo ? location : null;
      unmark = undo ?? noop;
    };
    const update = () => {
      setAyah(ayahAt(ayahStarts, el.currentTime * 1000));
      const location = timings.current && recitedWordAt(timings.current, el.currentTime * 1000, playedFrom.current);
      read(location);
      remark(location);
      if (followingNow.current) keepInSight();
    };
    const onHand = (event: Event) => {
      if (followingNow.current && scrollsByHand(event)) setFollow(false);
    };
    const tick = () => {
      update();
      frame = requestAnimationFrame(tick);
    };
    const onPlaying = () => {
      setState("playing");
      cancelAnimationFrame(frame);
      tick();
    };
    const onPause = () => {
      cancelAnimationFrame(frame);
      update();
      setState("paused");
    };
    const onWaiting = () => setState("loading");
    const onError = () => setState("failed");
    // The end of the Surah: the Recitation stops there.
    const events = { playing: onPlaying, pause: onPause, seeked: update, waiting: onWaiting, error: onError, ended: stop };
    for (const [type, listener] of Object.entries(events)) el.addEventListener(type, listener);
    for (const type of HAND_SCROLLS) window.addEventListener(type, onHand, { passive: true });
    unfollow.current = () => {
      cancelAnimationFrame(frame);
      unmark();
      recited.current = null;
      for (const [type, listener] of Object.entries(events)) el.removeEventListener(type, listener);
      for (const type of HAND_SCROLLS) window.removeEventListener(type, onHand);
    };
  };

  const loadTimings = () => {
    loading.current ??= fetch(timingsUrl)
      .then((response) => (response.ok ? (response.json() as Promise<Recitation>) : Promise.reject(response)))
      // Without them the Recitation still plays, unmarked.
      .then(
        (loaded) => {
          timings.current = loaded;
          carryOnFromTappedEarly();
        },
        () => {
          loading.current = null;
          tappedEarly.current = null;
        },
      );
  };

  /** Lets go of the audio, its listeners and its marks, and any Word tapped before the timings arrived. */
  const release = () => {
    tappedEarly.current = null;
    notePageFollowing(false);
    unfollow.current();
    unfollow.current = noop;
    audio.current?.pause();
    audio.current?.removeAttribute("src");
    audio.current = null;
  };

  // A function declaration, so `follow` above can use it.
  function stop() {
    release();
    setState("off");
    setFollow(true);
  }

  /** Plays the audio, and says it failed when it cannot play: unless it has been let go of meanwhile. */
  const start = (el: HTMLAudioElement) => void el.play().catch(() => audio.current === el && setState("failed"));

  const playFrom = (from: number) => {
    askedFor.current = from;
    playedFrom.current = ayahStarts[from - 1] ?? 0;
    const at = secondsAt(playedFrom.current);
    // A new start supersedes a Word tapped before the timings arrived.
    tappedEarly.current = null;
    loadTimings();
    // Moved while it plays, it says it is loading only if it has to wait for the audio.
    if (!audio.current || audio.current.paused) setState("loading");
    if (!audio.current) {
      // Starts at the Ayah from the first byte, so nothing before it is heard.
      audio.current = new Audio(`${url}#t=${at}`);
      // At the Recitation speed this device keeps, chosen here or on another page.
      const kept = storedSpeed();
      setSpeedState(kept);
      playAt(audio.current, kept);
      follow();
    } else audio.current.currentTime = at;
    setAyah(from);
    setFollow(true);
    start(audio.current);
  };

  // An audio that could not play stays failed: a retry starts on a fresh one.
  const retry = () => {
    release();
    playFrom(askedFor.current);
  };

  const play = () => audio.current && start(audio.current);
  const pause = () => audio.current?.pause();

  const setSpeed = (chosen: number) => {
    setSpeedState(chosen);
    storeSpeed(chosen);
    if (audio.current) playAt(audio.current, chosen);
  };

  // While it plays, carries it on from where the Reciter first says the Word at
  // `location`, if he does; before the timings arrive, once they do, unless a
  // later tap or a new start comes first.
  const carryOnFrom = (location: string | null) => {
    const el = audio.current;
    if (!location || !el || el.paused) return;
    if (!timings.current) {
      tappedEarly.current = location;
      return;
    }
    const said = firstSaidAt(timings.current, location);
    if (said === null) return;
    playedFrom.current = said;
    el.currentTime = secondsAt(said);
    setFollow(true);
  };

  // A function declaration, so `loadTimings` above can use it.
  function carryOnFromTappedEarly() {
    const location = tappedEarly.current;
    tappedEarly.current = null;
    carryOnFrom(location);
  }

  // Plays from the start of the Word's Ayah, inside the press, so the browser
  // lets it play; then on from where the Reciter first says the Word, once the
  // timings are there.
  const playFromWord = (location: string) => {
    const place = ayahOf(location);
    if (!place) return;
    playFrom(place.ayah);
    carryOnFrom(location);
  };

  // A tapped Word carries a playing Recitation on from it; in Flowing it
  // plays from it otherwise too, paused or stopped; in Study with Word
  // meanings hidden it shows or hides its meaning otherwise.
  const tapWord = (location: string | null) => {
    if (!location) return;
    if (audio.current && !audio.current.paused) carryOnFrom(location);
    else if (isFlowing()) playFromWord(location);
    else if (meaningsHidden()) toggleMeaning(location);
  };

  const keepRecitedWordInSight = (change: () => void) => {
    const card = recited.current && document.getElementById(recited.current);
    if (!card) return false;
    change();
    setFollow(true);
    scrolling.current = 0;
    landOn(card, true);
    return true;
  };

  // An Ayah heading's listen button, or a tap on a Word card.
  const onClick = useEffectEvent((event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const ayah = listenPressed(event.target);
    if (ayah) playFrom(ayah);
    else tapWord(wordTapped(event.target));
  });
  // Enter or Space on a Word the keyboard reaches taps it; Space then scrolls nothing.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    const location = wordKeyed(event);
    if (!location) return;
    event.preventDefault();
    tapWord(location);
  });
  useEffect(() => {
    const listener = (event: MouseEvent) => onClick(event);
    const keyListener = (event: KeyboardEvent) => onKey(event);
    document.addEventListener("click", listener);
    document.addEventListener("keydown", keyListener);
    const stopTappable = keepWordsTappable();
    return () => {
      document.removeEventListener("click", listener);
      document.removeEventListener("keydown", keyListener);
      stopTappable();
    };
  }, []);

  // Leaving the Surah (another Surah, the index, another Language) stops it.
  useEffect(() => () => stop(), []);

  const listening = { state, ayah, lastAyah: ayahStarts.length, playFrom, play, pause, stop, retry, speed, setSpeed, following, backToRecitedWord, keepRecitedWordInSight };
  return (
    <RecitationContext.Provider value={listening}>
      {children}
      {state !== "off" && <RecitationBar reciter={reciter} />}
    </RecitationContext.Provider>
  );
}

/** The Recitation bar's round buttons: play and pause, and stop. */
const ROUND = "grid flex-none cursor-pointer place-items-center rounded-full font-normal transition-none";
/** The previous and next Ayah, round on no background but on hover, faint while there is none. */
const STEP = `${ROUND} text-[length:inherit] leading-[inherit] text-foreground hover:bg-secondary hover:text-primary disabled:cursor-default disabled:text-muted-foreground disabled:opacity-35`;
/** The Recitation speed and the bar's Retry: a tinted pill 30px tall, outlined. */
const BAR_FIELD = "h-[30px] flex-none cursor-pointer rounded-full border border-input bg-secondary text-[13px] text-foreground shadow-none transition-none";

/** The play button in the Surah bar: plays the Recitation from `ayah`, the Ayah at the top of the screen. */
export function PlayButton({ ayah }: { ayah: number }) {
  const { playFrom } = useRecitation();
  return (
    <Button variant="pill" size="pill" onClick={() => playFrom(ayah)} aria-label={STRINGS.listenFrom(ayah)}>
      <span aria-hidden="true" className="text-[10px] text-primary">▶</span>
      <span className="max-[759px]:sr-only">{STRINGS.listen}</span>
    </Button>
  );
}

/** What the Recitation bar says: that it is loading or unavailable, or else whose voice it is. */
const statusOf = (state: State, reciter: string) =>
  state === "loading" ? STRINGS.recitationLoading : state === "failed" ? STRINGS.recitationUnavailable : reciter;

/** The Recitation bar: on screen while the Recitation is on, with play and pause, the previous and next Ayah, the Recitation speed and a way to stop it. */
function RecitationBar({ reciter }: { reciter: string }) {
  const { state, stop } = useRecitation();
  return (
    <>
      <BackToRecitedWord />
      {/* data-recitation-bar: while it is on screen the tab bar stays away (site-bar.module.css, #192). */}
      <div className={styles.bar} role="region" aria-label={STRINGS.recitationBar} data-recitation-bar="">
        {state === "failed" ? <Unavailable /> : <Controls reciter={reciter} />}
        <Button variant="pill" size="icon" className={`${ROUND} text-[13px] text-muted-foreground`} onClick={stop} aria-label={STRINGS.stopRecitation}>
          <span aria-hidden="true">✕</span>
        </Button>
      </div>
    </>
  );
}

/** Over the Recitation bar once the reader has scrolled by hand: brings the Recited Word back and follows it again (#109). */
function BackToRecitedWord() {
  const { following, backToRecitedWord } = useRecitation();
  if (following) return null;
  return (
    <Button
      variant="filled"
      className="fixed inset-x-0 bottom-[calc(max(16px,env(safe-area-inset-bottom))+58px)] z-20 mx-auto h-auto w-fit max-w-[calc(100%-32px)] px-4 py-[7px] text-[13px] font-normal shadow-[0_6px_24px_var(--shadow)]"
      onClick={backToRecitedWord}
    >
      {STRINGS.backToRecitedWord}
    </Button>
  );
}

/** Play and pause between the previous and next Ayah, what is playing, and the Recitation speed. */
function Controls({ reciter }: { reciter: string }) {
  const { state, ayah, lastAyah, playFrom, play, pause } = useRecitation();
  const playing = state === "playing" || state === "loading";
  return (
    <>
      <Button variant="ghost" size="icon-sm" className={STEP} onClick={() => playFrom(ayah - 1)} disabled={ayah <= 1} aria-label={STRINGS.previousAyah}>
        <StepIcon />
      </Button>
      <Button variant="filled" size="icon" className={`${ROUND} text-[12px]`} onClick={playing ? pause : play} aria-label={playing ? STRINGS.pause : STRINGS.play}>
        <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
      </Button>
      <Button variant="ghost" size="icon-sm" className={STEP} onClick={() => playFrom(ayah + 1)} disabled={ayah >= lastAyah} aria-label={STRINGS.nextAyah}>
        <StepIcon next />
      </Button>
      <span className={styles.status} aria-live="polite">
        {statusOf(state, reciter)}
      </span>
      <SpeedChoice />
    </>
  );
}

/** A bar and a triangle, pointing back to the previous Ayah or on to the next. */
function StepIcon({ next = false }: { next?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={next ? "size-3.5 -scale-x-100" : "size-3.5"}>
      <rect x="2" y="3" width="2" height="10" rx="1" fill="currentColor" />
      <path d="M13 3.5v9a.6.6 0 0 1-.9.5L5.5 8.5a.6.6 0 0 1 0-1L12.1 3a.6.6 0 0 1 .9.5Z" fill="currentColor" />
    </svg>
  );
}

/** The Recitation speed, from a few fixed steps around normal. */
function SpeedChoice() {
  const { speed, setSpeed } = useRecitation();
  return (
    <NativeSelect
      arrow="browser"
      className={`${BAR_FIELD} px-2 py-0 hover:bg-accent`}
      value={speed}
      onChange={(e) => setSpeed(Number(e.target.value))}
      aria-label={STRINGS.recitationSpeed}
    >
      {SPEEDS.map((step) => (
        <NativeSelectOption key={step} value={step}>
          {STRINGS.speed(step)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** What the bar says when the audio cannot play right now, and a way to try again. */
function Unavailable() {
  const { retry } = useRecitation();
  return (
    <>
      <span className={styles.status} aria-live="polite">
        {STRINGS.recitationUnavailable}
      </span>
      <Button variant="secondary" className={`${BAR_FIELD} px-3.5 font-semibold text-primary hover:bg-accent`} onClick={retry}>
        {STRINGS.tryAgain}
      </Button>
    </>
  );
}
