// The Surah index's Surahs | Juz tabs (#193; website: the index's tablist):
// the lists sit side by side on a horizontal paging track, so a swipe moves
// the list with the finger and the tab underline slides with it; a tap on a
// tab moves the track there, at once when the reader has Reduce Motion on.
// Each list keeps its own scroll, both staying mounted on the track.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { IndexTab } from "../surah-index";
import { STRINGS, useColors } from "../theme";

/** The side gutter the tabs and search box keep, as the list's rows do. */
const GUTTER = 16;
/** The underline's width under the selected tab. */
const INK_WIDTH = 56;

/** Whether the reader has Reduce Motion on, following changes to it. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => current && setReduce(on));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

/** The track: where it is scrolled to (for the underline), which tab it rests on, and moving it to a tab. */
export function useIndexTrack() {
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const trackRef = useRef<ScrollView>(null);
  const [selected, setSelected] = useState(0);
  const reduceMotion = useReduceMotion();
  const select = useCallback(
    (tab: number) => {
      setSelected(tab);
      trackRef.current?.scrollTo({ x: tab * width, animated: !reduceMotion });
    },
    [width, reduceMotion],
  );
  const settled = useCallback((x: number) => setSelected(Math.round(x / Math.max(1, width))), [width]);
  return { width, scrollX, trackRef, selected, select, settled };
}

type Track = ReturnType<typeof useIndexTrack>;

function Tab({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabText, { color: selected ? colors.ink : colors.muted }]}>
        {label}
        <Text style={[styles.count, { color: colors.muted }]}>{` ${count}`}</Text>
      </Text>
    </Pressable>
  );
}

/** The tablist: one tab per list with its count, and the underline following the track. */
export function IndexTabs({ tabs, counts, track }: { tabs: readonly IndexTab[]; counts: number[]; track: Track }) {
  const colors = useColors();
  const half = (track.width - 2 * GUTTER) / tabs.length;
  const translateX = useMemo(
    () => track.scrollX.interpolate({ inputRange: [0, Math.max(1, track.width)], outputRange: [0, half], extrapolate: "clamp" }),
    [track.scrollX, track.width, half],
  );
  return (
    <View accessibilityRole="tablist" accessibilityLabel={STRINGS.indexTabs} style={[styles.tabs, { borderBottomColor: colors.line }]}>
      {tabs.map((tab, k) => (
        <Tab key={tab} label={tab === "Surahs" ? STRINGS.surahsTab : STRINGS.juzTab} count={counts[k]} selected={track.selected === k} onPress={() => track.select(k)} />
      ))}
      <Animated.View pointerEvents="none" style={[styles.ink, { width: half, transform: [{ translateX }] }]}>
        <View style={[styles.inkBar, { backgroundColor: colors.accent }]} />
      </Animated.View>
    </View>
  );
}

/** The paging track holding one page per tab, each the window's width. */
export function IndexTrack({ track, children }: { track: Track; children: ReactNode }) {
  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { x: track.scrollX } } }], { useNativeDriver: true }), [track.scrollX]);
  return (
    <Animated.ScrollView
      ref={track.trackRef}
      horizontal
      pagingEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(event) => track.settled(event.nativeEvent.contentOffset.x)}
      style={styles.track}
    >
      {children}
    </Animated.ScrollView>
  );
}

/** One page of the track: a tab's list, labelled by its tab. */
export function IndexPage({ label, width, children }: { label: string; width: number; children: ReactNode }) {
  return (
    <View accessibilityLabel={label} style={{ width }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", marginHorizontal: GUTTER, marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: "center", paddingTop: 10, paddingBottom: 12 },
  tabText: { fontSize: 15, fontWeight: "600" },
  count: { fontSize: 13, fontWeight: "400" },
  ink: { position: "absolute", left: 0, bottom: -1, height: 3, alignItems: "center" },
  inkBar: { width: INK_WIDTH, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  track: { flex: 1 },
});
