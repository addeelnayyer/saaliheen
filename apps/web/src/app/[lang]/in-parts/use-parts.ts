// The mechanism by which a page opened in parts (ADR 0005, 0014) — a Surah
// (#24) or a Theme page (#131) — fetches its part files (a Root page's Spellings,
// which fetch theirs only when asked, use use-parts-on-demand.ts): in order, a few ahead,
// each part handed over as soon as every part before it has arrived. Whenever
// the next part takes longer than PART_MS, or a part fails, loading stops short
// until Retry; parts already handed over stay. What the parts hold, and how the
// page shows them and its skeleton, is the page's own.
//
// A Surah's parts are kept for the last few Surahs opened, so that going Back
// to one shows it at once. A Theme page's are kept only while it is open. Each
// part is fetched once; a fetch that fails is forgotten, so Retry fetches it
// again.

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { partUrl } from "@saaliheen/dataset/parts";
import { fetchJsonOnce, remember } from "../caches";

/** How long the next part to show may take before loading stops short, for Retry. */
const PART_MS = 10_000;
/** How many parts are requested at once, the next one to show first. */
const AHEAD = 3;
/** For how many addresses opened with `kept` the fetched parts are kept. */
const KEEP_ADDRESSES = 3;

/** The parts at one address, by part number, each as it was fetched. */
type PartFiles<T> = Map<number, Promise<T>>;

const keptFiles = new Map<string, PartFiles<unknown>>();

/** The fetched parts at `address`: when `kept`, among the last few addresses opened, now the most recently used; else new. */
function partFiles<T>(address: string, kept: boolean): PartFiles<T> {
  if (!kept) return new Map();
  const files = keptFiles.get(address) ?? new Map();
  remember(keptFiles, address, files, KEEP_ADDRESSES);
  return files as PartFiles<T>;
}

/** Part `part` (from 1) at `address`, fetched once into `files`. */
const loadPart = <T>(files: PartFiles<T>, address: string, part: number) =>
  fetchJsonOnce(files, part, partUrl(address, part));

/** Part `part`, or a rejection once it has taken longer than PART_MS; `onTimer` hears its timer, to clear it. */
export function inTime<T>(files: PartFiles<T>, address: string, part: number, onTimer: (timer: ReturnType<typeof setTimeout>) => void) {
  return new Promise<T>((resolve, reject) => {
    // Its own timer: the next part's may already be set by the time this one settles.
    const timer = setTimeout(() => reject(new Error(`part ${part} took longer than ${PART_MS} ms`)), PART_MS);
    onTimer(timer);
    loadPart(files, address, part)
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

/** What a part that took too long, or failed, stands in for. */
const STOPPED: unique symbol = Symbol("stopped");

/** Requests parts `from` to `to` ahead of their turn; one that fails is retried when its turn comes. */
function requestAhead<T>(files: PartFiles<T>, address: string, from: number, to: number) {
  for (let next = from; next <= to; next++) loadPart(files, address, next).catch(() => undefined);
}

/** Which parts a page opened in parts fetches. */
export interface PartsSource {
  /** Where they are served (surahPartsAddress, themePartsAddress, grammarPartsAddress). */
  address: string;
  /** How many parts there are. */
  count: number;
  /** The first part to fetch: 1, or 2 when the page arrives with its first part. */
  from: number;
  /** Whether the parts are kept after the page is left (a Surah's), or only while it is open (a Theme page's). */
  kept: boolean;
}

/** What has arrived so far. */
export interface Parts<T, D> {
  /** Each part fetched so far, in order, from `from` on. */
  arrived: T[];
  /** Whether every part has arrived. */
  complete: boolean;
  /** Whether loading has stopped short: the next part took too long, or a part failed. */
  failed: boolean;
  /** What `decide` answered, once the first part fetched has arrived (or there is none to fetch); null before. */
  decided: D | null;
  /** Starts loading again from the part it stopped at. */
  retry: () => void;
}

/** What a page that decides nothing as its parts start loading (a Grammar page's) is asked: nothing. */
const decideNothing = () => null;

/**
 * Fetches `source`'s parts in order. `decide` is asked once, as loading starts
 * after the page has committed (while a link's new page renders, the URL and
 * the history entry are still the page being left): where the page lands.
 */
export function useParts<T, D = null>({ address, count, from, kept }: PartsSource, decide: () => D = decideNothing as () => D): Parts<T, D> {
  const [view, setView] = useState<Omit<Parts<T, D>, "retry" | "complete">>({ arrived: [], failed: false, decided: null });
  const [attempt, setAttempt] = useState(0);
  /** How many parts have arrived, what was decided and the parts' files: kept across Retry. */
  const progress = useRef<{ parts: number; decided: D | null; files: PartFiles<T> | null }>({
    parts: from - 1,
    decided: null,
    files: null,
  });
  const decideOnce = useEffectEvent(decide);

  useEffect(() => {
    const state = progress.current;
    const decided = (state.decided ??= decideOnce());
    const files = (state.files ??= partFiles<T>(address, kept));
    let live = true;
    let slow: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      for (let i = state.parts; i < count; i++) {
        // The next part to show is requested first. Too slow or failed: stop there; a slow part's fetch goes on, so Retry may find it arrived.
        const arriving = inTime(files, address, i + 1, (timer) => (slow = timer)).catch(() => STOPPED);
        requestAhead(files, address, i + 2, Math.min(i + AHEAD, count));
        const part = await arriving;
        if (!live) return;
        if (part === STOPPED) return setView((v) => ({ ...v, failed: true }));
        state.parts = i + 1;
        setView((v) => ({ arrived: [...v.arrived, part as T], failed: false, decided }));
      }
      // Nothing was left to fetch: decided all the same.
      setView((v) => (v.decided === null ? { ...v, decided } : v));
    })();
    return () => {
      live = false;
      clearTimeout(slow);
    };
  }, [address, count, kept, attempt]);

  const retry = () => {
    setView((v) => ({ ...v, failed: false }));
    setAttempt((n) => n + 1);
  };
  return { ...view, complete: from - 1 + view.arrived.length >= count, retry };
}
