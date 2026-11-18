// How a list that loads its parts only when asked (#288), a Root page's
// Spelling, fetches its part files: none until the first is wanted, then one
// more each time `more` is called, in order. Unlike use-parts.ts, which loads
// a whole page's parts as soon as it opens, nothing is fetched ahead. A part
// that takes longer than PART_MS, or fails, stops loading until Retry; parts
// already arrived stay. The parts
// are kept only while the page is open, as a Theme page's are (ADR 0014); each
// is fetched once, and a fetch that fails is forgotten, so Retry fetches it
// again.

import { useEffect, useRef, useState } from "react";
import { inTime } from "./use-parts";

/** What has arrived so far, and how to ask for more. */
export interface PartsOnDemand<T> {
  /** Each part arrived so far, in order, from part 1. */
  arrived: T[];
  /** Whether a wanted part is on its way. */
  loading: boolean;
  /** Whether every part has arrived. */
  complete: boolean;
  /** Whether loading has stopped short: a wanted part took too long, or failed. */
  failed: boolean;
  /** Asks for the first part, unless it is already asked for. */
  first: () => void;
  /** Asks for the next part. */
  more: () => void;
  /** Asks again for the part that failed. */
  retry: () => void;
}

/** The `count` parts served at `address`; `arrivedWith`, when given, is part 1 as the page arrived with it. */
export function usePartsOnDemand<T>(address: string, count: number, arrivedWith?: T): PartsOnDemand<T> {
  const [arrived, setArrived] = useState<T[]>(arrivedWith === undefined ? [] : [arrivedWith]);
  const [wanted, setWanted] = useState(arrived.length);
  const [failed, setFailed] = useState(false);
  const files = useRef(new Map<number, Promise<T>>());
  const next = arrived.length + 1;
  const loading = next <= wanted && next <= count && !failed;

  useEffect(() => {
    if (!loading) return;
    let live = true;
    let slow: ReturnType<typeof setTimeout> | undefined;
    inTime(files.current, address, next, (timer) => (slow = timer)).then(
      (part) => live && setArrived((a) => (a.length === next - 1 ? [...a, part] : a)),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
      clearTimeout(slow);
    };
  }, [address, next, loading]);

  return {
    arrived,
    loading,
    complete: arrived.length >= count,
    failed,
    first: () => setWanted((w) => Math.max(w, 1)),
    more: () => setWanted(next),
    retry: () => setFailed(false),
  };
}
