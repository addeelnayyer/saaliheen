// Whether the tab bar shows (#192). The tabs' layout draws it from here; a
// Surah screen hides it while the reader reads down and while the Recitation
// bar is on screen, by src/destinations.ts's followTabBar, and shows it again
// when the reader leaves the screen. It leaves and returns without sliding, so
// Reduce Motion is respected.

import { useFocusEffect } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { followTabBar } from "../destinations";

// Two contexts, so a Surah screen, which only sets it, does not re-render each time it flips.
const ShownContext = createContext(true);
const SetShownContext = createContext<(shown: boolean) => void>(() => {});

/** Whether the tab bar shows, for the tabs' layout. */
export const useTabBarShown = () => useContext(ShownContext);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(true);
  return (
    <SetShownContext.Provider value={setShown}>
      <ShownContext.Provider value={shown}>{children}</ShownContext.Provider>
    </SetShownContext.Provider>
  );
}

/**
 * A Surah screen's hold on the tab bar: the returned callback follows the list's offset,
 * and `recitationBarOnScreen` keeps it hidden while the Recitation bar shows.
 */
export function useSurahTabBar(recitationBarOnScreen: boolean) {
  const setShown = useContext(SetShownContext);
  const follower = useMemo(() => followTabBar(), []);
  useEffect(() => {
    follower.recitationBar(recitationBarOnScreen);
    setShown(follower.shown);
  }, [follower, recitationBarOnScreen, setShown]);
  useFocusEffect(
    useCallback(() => {
      setShown(follower.shown);
      return () => setShown(true);
    }, [follower, setShown]),
  );
  return useCallback(
    (y: number) => {
      follower.scrolledTo(y);
      setShown(follower.shown);
    },
    [follower, setShown],
  );
}
