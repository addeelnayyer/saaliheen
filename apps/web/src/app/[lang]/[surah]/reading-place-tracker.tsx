"use client";

// Moves the Reading place as the reader reads one Surah page: to the Ayah at
// the top of the screen when the page opens and whenever scrolling stops. It
// first lands where its page says the opening lands (`landing` in
// ../reading-place.ts): a look-up's Word or shared Ayah, where Back or Forward
// left the visit, or the Reading place. While the URL has a fragment (a
// `#s:a:w` Word location or a shared Ayah's `#s:a`) the page is a look-up and
// the Reading place stays where it was. A Surah opened in parts (#24) mounts
// this only once the Ayahs it lands on are on the page, and adds Ayahs below
// while it is tracking; the Ayahs are a live list, so they keep up. The Ayah at
// the top is also reported as it changes, for a Surah opened in parts to note
// where its visit was left; nothing more is stored for that than here. The
// Ayah at the top, look-ups included, is also the Ayah being read that the
// Surah bar's Passage title follows (ayah-in-view.tsx, #43). Which Ayah is at
// the top, in Study or Flowing, is ayah-at-top.ts's rule.

import { useEffect, useEffectEvent, useLayoutEffect, useState } from "react";
import {
  ayahSections,
  adoptFragmentAsTarget,
  currentFragment,
  landing,
  readingPlaceIn,
  readReadingPlaces,
  storeReadingPlace,
  type ReadingPlace,
} from "../reading-place";
import { recordReading } from "../synced-reading-places";
import { ayahNumberAtTop, landOn } from "./ayah-at-top";
import { useNoteAyahInView } from "./ayah-in-view";
import { pageIsFollowing } from "./followed-scroll";

/** How long scrolling must be still before it counts as stopped. */
const SETTLE_MS = 150;

const lookingUp = () => currentFragment() !== "";

/** Lands on the element with id `id` (`landOn`), if the page has one; returns what stops it. */
function landOnId(id: string | null): (() => void) | undefined {
  const element = id ? document.getElementById(id) : null;
  return element ? landOn(element) : undefined;
}

export function ReadingPlaceTracker({
  surah,
  landOn: target,
  onAyahAtTop,
}: {
  surah: number;
  /** The id of the element the page lands on as it opens, decided once by its page (`landing`); null for none. */
  landOn: string | null;
  /** Hears the Ayah at the top of the screen outside a look-up, at most once a frame. */
  onAyahAtTop?: (ayah: number) => void;
}) {
  // Before paint, so a Surah opened in parts never shows its first Ayahs before moving to the one it lands on.
  // A jump to another look-up on the same page (a Root dialog's Word location,
  // a Passage heading's link, a new `#s:a`) lands on it the same way; the browser
  // alone does not keep it there as the Ayahs around it lay out.
  useLayoutEffect(() => {
    adoptFragmentAsTarget();
    let stop = landOnId(target);
    const onHashChange = () => {
      stop?.();
      stop = landOnId(currentFragment());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      stop?.();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [target]);

  const report = useEffectEvent((ayah: number) => onAyahAtTop?.(ayah));
  const noteInView = useNoteAyahInView();
  const show = useEffectEvent((ayah: number) => noteInView(surah, ayah));

  useEffect(() => {
    const ayahs = ayahSections();
    // The Ayah at the top is noted once per scrolled frame outside a look-up and
    // stored once scrolling stops, so a look-up opened mid-scroll cannot lose it.
    let seen: number | null = null;
    // The Ayah last stored: an Ayah is read when it is reached, so leaving the
    // page where the last scroll stored it stores it no newer (#71).
    let stored: number | null = null;
    // Whether the reader has scrolled outside a look-up since the last save.
    // Something else may have moved the Reading place since then, the
    // Recitation playing on (#111) or another tab: a scroll that stops back at
    // the Ayah last stored has reached it again, so it is read again.
    let scrolled = false;
    const placeHere = () => readingPlaceIn(readReadingPlaces(), surah)?.ayah ?? null;
    // Look-ups included, the Surah bar hears it as the Ayah being read.
    const note = () => {
      const ayah = ayahNumberAtTop(ayahs);
      if (!ayah) return;
      show(ayah);
      if (lookingUp()) return;
      report(ayah);
      // Where the page following the Recited Word (#109) leaves it is not read:
      // listening has already moved the Reading place to the Recited Word's Ayah.
      if (!pageIsFollowing()) seen = ayah;
    };
    // Stored in this browser and, signed in, sent to the Account; as the page
    // goes, only stored: the next page sends it with the rest (#71).
    const save = (record: (place: ReadingPlace) => void = recordReading) => {
      if (scrolled && placeHere() !== stored) stored = null;
      scrolled = false;
      if (!seen || seen === stored) return;
      stored = seen;
      record({ surah, ayah: seen });
    };
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      scrolled ||= !lookingUp() && !pageIsFollowing();
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        note();
      });
      clearTimeout(timer);
      timer = setTimeout(() => save(), SETTLE_MS);
    };
    const onLeave = () => {
      note();
      save(storeReadingPlace);
    };

    note();
    save();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onLeave);
    return () => {
      // A client navigation (index, Previous/Next, Language) fires no pagehide:
      // keep what the last scroll noted before this page goes.
      if (frame) note();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      save(storeReadingPlace);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [surah]);

  return null;
}

/**
 * The tracker of the whole Surah page, which has every Ayah in its HTML: it
 * lands where `landing` says, decided once as the page starts running (only
 * the browser knows the URL's fragment and the Reading place). The page is
 * only ever rendered in the browser on its own address (a load, or Back and
 * Forward to it), so the URL is already its own.
 */
export function SurahPageTracker({ surah, ayahCount }: { surah: number; ayahCount: number }) {
  const [landOn] = useState(() => (typeof window === "undefined" ? null : landing(surah, ayahCount).id));
  return <ReadingPlaceTracker surah={surah} landOn={landOn} />;
}
