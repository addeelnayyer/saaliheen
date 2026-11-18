// The Ayah at the top of the screen on a Surah page, and seating an Ayah
// there. One rule serves the Reading place tracker (the Reading place and the
// Surah bar's Ayah being read, reading-place-tracker.tsx) and the Ayah layout
// switch, which keeps that Ayah at the top as it changes the layout (#125).
//
// The reading area starts below the Surah bar: the page's scroll padding
// clears its mini form, and its full form reaches further down by as far as its
// slim row (the bar's last row) sits below the top of the screen. Switching the
// Ayah layout keeps the bar's form, full or mini, so the Ayah kept at the top is
// seated below whichever is shown, never behind it.
//
// In Study the Ayahs are stacked boxes: the Ayah at the top is the first whose
// bottom is more than AT_TOP_SLACK below the top of the reading area.
//
// In Flowing the Ayah sections are inline, so one line may hold the end of one
// Ayah and the start of the next: the Ayah at the top is the first Ayah whose
// first Word is on the first line on screen, else the Ayah running through that
// line.

import { ayahSections, parseReadingPlace } from "../reading-place";
import { parseAyahLayout } from "../settings";

/**
 * How far below the top of the reading area an Ayah must still reach to be the
 * one at the top, in CSS pixels. The Ayahs abut, and a landing seats its Ayah
 * only to within a pixel or so of that line: the end of the Ayah above, left a
 * hair below it, never counts.
 */
const AT_TOP_SLACK = 4;

/** What a reader does to take the page over from a landing still seating its target. */
export const TAKE_OVER = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * How far the Surah bar reaches below its mini form: in its full form, how far
 * its slim row sits below the bar's top; 0 when mini or on a page without it.
 * Read from the form the bar has taken, not from where its slide has got to.
 */
const barBelowMini = () => {
  const row = document.querySelector<HTMLElement>("[data-slim-row]");
  return row?.closest('[data-form="full"]') ? row.offsetTop : 0;
};

/**
 * The line on screen an Ayah must reach below to be at the top: the top of the
 * reading area (the scroll padding, under the mini Surah bar, lower by as far
 * as the bar reaches below that) and the slack.
 */
const readingLine = () =>
  (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + barBelowMini() + AT_TOP_SLACK;

const flowing = () => parseAyahLayout(document.documentElement.getAttribute("data-ayah-layout")) === "flowing";

/** The index of the first of `ayahs` (in page order) whose bottom is below `line` on screen; their length when none is. A binary search, quick even among Al-Baqarah's 286. */
function firstEndingBelow(ayahs: HTMLCollectionOf<Element>, line: number): number {
  let [lo, hi] = [0, ayahs.length];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ayahs[mid].getBoundingClientRect().bottom > line) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/**
 * The first of `items` (stacked boxes, in page order) at the top of the reading
 * area, by Study's rule; null when none is. A Theme page's Ayahs (#131), which
 * have no Surah bar, are found by it.
 */
export function firstAtTop<T extends Element>(items: HTMLCollectionOf<T>): T | null {
  return items[firstEndingBelow(items, readingLine())] ?? null;
}

/** An Ayah section's Words, in order: the Word cards whose ids are its Word locations. */
const wordsOf = (ayah: HTMLElement) => Array.from(ayah.querySelectorAll<HTMLElement>(`[id^="${ayah.id}:"]`));

/** Whether two Words sit on one line: they overlap by more than half the shorter's height. */
function sameLine(a: HTMLElement, b: HTMLElement): boolean {
  const r = a.getBoundingClientRect();
  const q = b.getBoundingClientRect();
  return Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > Math.min(r.height, q.height) / 2;
}

/**
 * In Flowing, from `running`, the index of the Ayah running through the first
 * line on screen: the next Ayah when its first Word is on that line (no later
 * Ayah can start there before it), else `running` itself. When `running`
 * starts on that line it is the first to.
 */
function startingOnFirstLine(ayahs: HTMLCollectionOf<HTMLElement>, running: number, line: number): number {
  const words = wordsOf(ayahs[running]);
  const first = words.find((word) => word.getBoundingClientRect().bottom > line);
  const next = ayahs[running + 1]?.querySelector<HTMLElement>(`[id^="${ayahs[running + 1].id}:"]`);
  return first && first !== words[0] && next && sameLine(next, first) ? running + 1 : running;
}

/** The section of the Ayah at the top of the screen (the rule above), among the page's `ayahs` in page order; null when none is. */
function ayahAtTop(ayahs: HTMLCollectionOf<HTMLElement> | undefined): HTMLElement | null {
  if (!ayahs) return null;
  const running = firstAtTop(ayahs);
  if (!running || !flowing()) return running;
  return ayahs[startingOnFirstLine(ayahs, Array.prototype.indexOf.call(ayahs, running), readingLine())];
}

/** The number of the Ayah at the top of the screen (`ayahAtTop`), or null when none is. */
export function ayahNumberAtTop(ayahs: HTMLCollectionOf<HTMLElement> | undefined): number | null {
  const ayah = ayahAtTop(ayahs);
  return ayah ? (parseReadingPlace(ayah.id)?.ayah ?? null) : null;
}

/**
 * Brings `target` to the top of the screen and keeps it there. The Ayahs
 * around it render at their real heights only once on screen
 * (content-visibility), and the browser does not always hold the page on it as
 * they do: until it has stayed put a few frames, or the reader takes over, seat
 * it again. An inline Ayah section (Flowing) is seated by its first line.
 * `belowBar` seats it below the Surah bar in its present form, full or mini
 * (the Ayah layout switch, which keeps the bar's form); a landing seats it at
 * the scroll padding, below the mini bar a landing leaves. Returns what stops it.
 */
export function landOn(target: HTMLElement, belowBar = false): () => void {
  const lowered = belowBar ? barBelowMini() : 0;
  const place = () => target.getBoundingClientRect().top - lowered;
  const seatIt = () => {
    target.scrollIntoView({ block: "start" });
    if (lowered > 0) window.scrollBy({ top: -lowered, behavior: "instant" });
    return place();
  };
  let landed = seatIt();
  let still = 0;
  let frames = 0;
  let seating = 0;
  const seat = () => {
    if (Math.abs(place() - landed) > 1) {
      landed = seatIt();
      still = 0;
    } else still++;
    if (still < 10 && ++frames < 120) seating = requestAnimationFrame(seat);
  };
  seating = requestAnimationFrame(seat);
  const stop = () => {
    cancelAnimationFrame(seating);
    TAKE_OVER.forEach((type) => window.removeEventListener(type, stop));
  };
  TAKE_OVER.forEach((type) => window.addEventListener(type, stop, { passive: true, once: true }));
  return stop;
}

/**
 * Makes `change` (the Ayah layout switching) keep the Ayah at the top of the
 * screen at the top: it notes that Ayah, makes the change and seats the Ayah
 * again below the Surah bar, which keeps its form. The Ayah is `reading`, the
 * id of the Ayah at the top as the page was last scrolled (the Ayah being
 * read): a tap that brings the full bar down over it moves nothing, so it is
 * still the one at the top. Without one, the Ayah at the top now. Where the
 * page has no Ayahs, it only makes the change.
 */
export function keepAyahAtTop(change: () => void, reading: string | null): void {
  const ayah = (reading && document.getElementById(reading)) || ayahAtTop(ayahSections());
  change();
  if (ayah) landOn(ayah, true);
}
