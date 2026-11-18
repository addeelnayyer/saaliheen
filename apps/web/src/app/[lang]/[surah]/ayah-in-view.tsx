"use client";

// The Ayah being read on a Surah screen: the Ayah at the top of the screen as
// the Reading place tracker last saw it (reading-place-tracker.tsx), look-ups
// included, for the Surah bar to show the current Passage's title (#43). One
// scroll watcher serves both; this only carries what it saw. Held as the
// Ayah's `surah:ayah`, so the screen of the next Surah, which may keep this
// state, never takes the last Surah's Ayah for its own.

import { createContext, useContext, useState, type ReactNode } from "react";
import { ayahId, parseReadingPlace } from "../reading-place";

const Seen = createContext<string | null>(null);
const NoteSeen = createContext<(id: string) => void>(() => {});

/** Holds the Ayah being read for everything on the Surah screen under it. */
export function AyahInViewProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<string | null>(null);
  return (
    <NoteSeen.Provider value={setSeen}>
      <Seen.Provider value={seen}>{children}</Seen.Provider>
    </NoteSeen.Provider>
  );
}

/** Notes the Ayah at the top of the screen of Surah `surah` as the one being read. */
export function useNoteAyahInView(): (surah: number, ayah: number) => void {
  const note = useContext(NoteSeen);
  return (surah, ayah) => note(ayahId({ surah, ayah }));
}

/** The Ayah of Surah `surah` being read, or null before one has been seen. */
export function useAyahInView(surah: number): number | null {
  const place = parseReadingPlace(useContext(Seen));
  return place?.surah === surah ? place.ayah : null;
}
