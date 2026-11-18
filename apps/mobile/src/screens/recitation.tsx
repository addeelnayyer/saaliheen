// Listening to a Surah on its screen (#112, #114): the play control, the
// Recitation bar while it is on, what the screen marks, and the screen
// following the Recited Word until the reader scrolls by hand. The device's audio is
// expo-audio's player, adapted to the RecitationAudio that src/recitation.ts
// drives; everything it decides (what plays, from where, which Word is the
// Recited Word, when it stops) is that module's. On a phone the adapter also
// lets the audio play on in the background, puts it on the lock screen and the
// notification, and tells the Recitation when they play or pause it and when the
// app comes back on the screen (#113).

import { setAudioModeAsync, useAudioPlayer, type AudioPlayer, type AudioStatus } from "expo-audio";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AppState, Pressable, StyleSheet, Text, useWindowDimensions, View, type FlatList } from "react-native";
import { dataOrigin, deviceStorage } from "../config";
import {
  ayahAtTop,
  ayahOf,
  scrollToFollow,
  SPEEDS,
  startRecitation,
  type AyahOnScreen,
  type CardOnScreen,
  type PlayingRecitation,
  type RecitationAudio,
  type RecitationBar,
} from "../recitation";
import { STRINGS, useColors } from "../theme";

/** How often the player reports where it is, in ms: often enough to mark each Word as it is said. */
const FOLLOW_EVERY_MS = 100;

/**
 * Whether the player is playing, as a lock screen or a notification leaves it:
 * playing, paused, or null while it waits for its audio (buffering), which is
 * neither.
 */
const playingOf = (status: AudioStatus) => {
  if (status.playing) return true;
  return status.timeControlStatus === "paused" && !status.isBuffering ? false : null;
};

/** Calls `listener` with each status `player` reports; the returned function stops it. */
function onStatus(player: AudioPlayer, listener: (status: AudioStatus) => void) {
  const subscription = player.addListener("playbackStatusUpdate", listener);
  return () => subscription.remove();
}

/** Calls `listener` when the player starts or stops playing, by the app's hand or the lock screen's. */
function onPlayingChange(player: AudioPlayer, listener: (playing: boolean) => void) {
  let last: boolean | null = player.playing;
  return onStatus(player, (status) => {
    const now = playingOf(status);
    if (now === null || now === last) return;
    last = now;
    listener(now);
  });
}

/** Calls `listener` when the app comes back on the screen. */
function onActive(listener: () => void) {
  const subscription = AppState.addEventListener("change", (state) => state === "active" && listener());
  return () => subscription.remove();
}

/** expo-audio's `player` as the RecitationAudio a Recitation drives; positions in ms. */
function recitationAudio(player: AudioPlayer): RecitationAudio {
  /** Whether the player is on the lock screen: activated once, then only its metadata changes. */
  let onLockScreen = false;
  return {
    load: (url) => player.replace({ uri: url }),
    seekTo: (ms) => void player.seekTo(ms / 1000),
    play: () => player.play(),
    pause: () => player.pause(),
    setSpeed: (speed) => player.setPlaybackRate(speed),
    onProgress: (listener) => onStatus(player, (status) => listener(status.currentTime * 1000)),
    onEnd: (listener) => onStatus(player, (status) => status.didJustFinish && listener()),
    // Reported on every status update; the Recitation acts only on a change.
    onWaiting: (listener) => onStatus(player, (status) => listener(status.isBuffering)),
    onFailure: (listener) => onStatus(player, (status) => status.error !== null && listener()),
    keepPlayingInBackground: () =>
      void setAudioModeAsync({ shouldPlayInBackground: true, playsInSilentMode: true, interruptionMode: "doNotMix" }).catch(() => undefined),
    showOnLockScreen: (nowPlaying) => {
      if (onLockScreen) player.updateLockScreenMetadata(nowPlaying);
      else player.setActiveForLockScreen(true, nowPlaying);
      onLockScreen = true;
    },
    clearLockScreen: () => {
      onLockScreen = false;
      player.clearLockScreenControls();
    },
    onPlayPause: (listener) => onPlayingChange(player, listener),
    currentPosition: () => player.currentTime * 1000,
    onReturnToApp: onActive,
  };
}

/** What the screen shows of a Recitation: its bar (null when off) and its marks. */
export type RecitationView = Pick<PlayingRecitation, "bar" | "recitedWord" | "markedAyah" | "followed" | "offersWayBack">;

const OFF: RecitationView = { bar: null, recitedWord: null, markedAyah: null, followed: null, offersWayBack: false };

/** While the Recitation file is on its way: the bar on screen, saying it is loading, its buttons waiting for it. */
const STARTING: RecitationView = {
  ...OFF,
  bar: { offers: "pause", says: "loading", previousAyah: "disabled", nextAyah: "disabled", speed: 1, speeds: SPEEDS },
};

const viewOf = ({ bar, recitedWord, markedAyah, followed, offersWayBack }: PlayingRecitation): RecitationView => ({
  bar,
  recitedWord,
  markedAyah,
  followed,
  offersWayBack,
});

/**
 * The Recitation of Surah `surah` (named `surahName` in the Surah index) on its
 * screen: what it shows, the play control's press, and the bar's buttons.
 * Leaving the Surah stops its Recitation and takes it off the lock screen, before
 * useAudioPlayer releases the player, and its audio and listeners with it.
 */
export function useRecitation(surah: number, surahName: string) {
  const player = useAudioPlayer(null, { updateInterval: FOLLOW_EVERY_MS });
  const audio = useMemo(() => recitationAudio(player), [player]);
  const playing = useRef<PlayingRecitation | null>(null);
  const [view, setView] = useState<RecitationView>(OFF);
  // A layout effect's cleanup runs before the player's release.
  useLayoutEffect(() => () => playing.current?.stop(), []);

  /** Stops listening to the Recitation before this one, if any. */
  const unsubscribe = useRef<(() => void) | null>(null);
  /** Whether a Recitation is starting: its file is on its way. */
  const starting = useRef(false);

  const playFrom = useCallback(
    async (topAyah: number) => {
      if (starting.current) return;
      starting.current = true;
      setView(STARTING);
      // Resolves either way: saying "unavailable right now" when the Recitation cannot play.
      const recitation = await startRecitation({ origin: dataOrigin(), audio, device: deviceStorage, surah, topAyah, surahName });
      starting.current = false;
      unsubscribe.current?.();
      playing.current = recitation;
      unsubscribe.current = recitation.subscribe(() => setView(viewOf(recitation)));
      setView(viewOf(recitation));
    },
    [audio, surah, surahName],
  );

  /** "Listen from here" beside Ayah `ayah`: moves the Recitation there while it is on, else starts one there. */
  const listenFrom = useCallback(
    (ayah: number) => {
      const recitation = playing.current;
      if (recitation?.bar) recitation.listenFrom(ayah);
      else void playFrom(ayah);
    },
    [playFrom],
  );
  const tapWord = useCallback((location: string) => playing.current?.tapWord(location), []);
  const scrolledByHand = useCallback(() => playing.current?.scrolledByHand(), []);

  return {
    view,
    playFrom,
    listenFrom,
    tapWord,
    scrolledByHand,
    pause: () => playing.current?.pause(),
    play: () => playing.current?.play(),
    backToRecitedWord: () => playing.current?.backToRecitedWord(),
    previousAyah: () => playing.current?.previousAyah(),
    nextAyah: () => playing.current?.nextAyah(),
    stop: () => playing.current?.stop(),
    chooseSpeed: (speed: number) => void playing.current?.chooseSpeed(speed),
    tryAgain: () => void playing.current?.tryAgain(),
  };
}

/** What the Recitation bar's buttons do: useRecitation's. */
export type RecitationActions = Pick<
  ReturnType<typeof useRecitation>,
  "pause" | "play" | "previousAyah" | "nextAyah" | "stop" | "chooseSpeed" | "tryAgain" | "backToRecitedWord"
>;

/** Where a view is in the window, in px. */
const placeOf = (view: View) =>
  new Promise<CardOnScreen>((resolve) => view.measureInWindow((_x, y, _width, height) => resolve({ top: y, bottom: y + height })));

/**
 * The Surah screen following the Recited Word (#114): whenever `followed`
 * changes, it scrolls `list` to bring the Recited Word's card clear of the
 * Surah bar and the Recitation bar, as src/recitation.ts's scrollToFollow
 * says. `cardRef` is the rendered card's ref; while that card is not rendered
 * (its Ayah far off the screen) the list scrolls to its Ayah, `indexOfAyah` of
 * it, instead. `onScroll` keeps the list's offset; `onBarTop` takes where the
 * Recitation bar's top is in the window.
 */
export function useFollowing<T>(list: RefObject<FlatList<T> | null>, followed: string | null, indexOfAyah: (ayah: number) => number) {
  const surahBarHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  const offset = useRef(0);
  const barTop = useRef<number | null>(null);
  const cardRef = useRef<View | null>(null);

  useEffect(() => {
    if (followed === null) return;
    const card = cardRef.current;
    if (!card) {
      const index = indexOfAyah(ayahOf(followed));
      if (index >= 0) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      return;
    }
    void placeOf(card).then((place) => {
      const by = scrollToFollow(place, { top: surahBarHeight, bottom: barTop.current ?? height });
      if (by !== 0) list.current?.scrollToOffset({ offset: offset.current + by, animated: true });
    });
  }, [followed, list, indexOfAyah, surahBarHeight, height]);

  return {
    cardRef,
    onScroll: ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => void (offset.current = nativeEvent.contentOffset.y),
    onBarTop: (top: number) => void (barTop.current = top),
  };
}

/**
 * The Ayah at the top of the Surah screen, as src/recitation.ts's ayahAtTop
 * picks it from where the rendered Ayahs are now: the list scrolls under the
 * Surah bar, so what a reader sees starts below it. `viewOf(n)` is the ref of
 * Ayah n's view; `ayahAtTopNow()` measures them, and is Ayah 1 when none is seen.
 */
export function useAyahAtTop() {
  /** The Surah bar is the navigator's header; its height counts the status bar. */
  const surahBarHeight = useHeaderHeight();
  const { height } = useWindowDimensions();
  const views = useRef(new Map<number, View>()).current;
  const viewOf = useCallback(
    (number: number) => (view: View | null) => {
      if (view) views.set(number, view);
      else views.delete(number);
    },
    [views],
  );
  const ayahAtTopNow = useCallback(async () => {
    const ayahs: AyahOnScreen[] = await Promise.all([...views].map(async ([number, view]) => ({ number, ...(await placeOf(view)) })));
    return ayahAtTop(ayahs, { top: surahBarHeight, bottom: height }) ?? 1;
  }, [views, surahBarHeight, height]);
  return { viewOf, ayahAtTopNow };
}

/** The button back to the Recited Word, above the Recitation bar while the screen has stopped following it. */
function BackToRecitedWord({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.back, { backgroundColor: colors.accent }]}>
      <Text style={[styles.backLabel, { color: colors.onAccent }]}>{STRINGS.backToRecitedWord}</Text>
    </Pressable>
  );
}

/** The play control, while the Recitation is off: plays from the Ayah at the top of the screen. */
function PlayControl({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={STRINGS.listen} onPress={onPress} style={[styles.playControl, { backgroundColor: colors.accent }]}>
      <Text style={[styles.icon, { color: colors.onAccent }]}>▶</Text>
      <Text style={[styles.label, { color: colors.onAccent }]}>{STRINGS.listen}</Text>
    </Pressable>
  );
}

/** One of the Recitation bar's small buttons: `icon` shown, `label` read out, dimmed while disabled. */
function BarButton({ icon, label, disabled = false, onPress }: { icon: string; label: string; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.small, disabled && styles.disabled]}
    >
      <Text style={[styles.icon, { color: colors.ink }]}>{icon}</Text>
    </Pressable>
  );
}

/** The Recitation speed after `speed` among `speeds`, round to the slowest after the fastest: the bar's speed button steps through them. */
export const speedAfter = (speed: number, speeds: readonly number[]) => speeds[(speeds.indexOf(speed) + 1) % speeds.length];

/** The Recitation bar's main button: pause or play, or try again while the Recitation cannot play. */
function MainButton({ bar, actions }: { bar: RecitationBar; actions: RecitationActions }) {
  const colors = useColors();
  const { label, icon, onPress } = mainButtonOf(bar.offers, actions);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.toggle, { backgroundColor: colors.accent }]}>
      <Text style={[styles.icon, { color: colors.onAccent }]}>{icon}</Text>
    </Pressable>
  );
}

function mainButtonOf(offers: RecitationBar["offers"], actions: RecitationActions) {
  if (offers === "try again") return { label: STRINGS.tryAgain, icon: "↻", onPress: actions.tryAgain };
  if (offers === "pause") return { label: STRINGS.pause, icon: "❚❚", onPress: actions.pause };
  return { label: STRINGS.play, icon: "▶", onPress: actions.play };
}

/** What the Recitation bar says: loading, unavailable right now, else that it is the Recitation. */
const barTextOf = (says: RecitationBar["says"]) => {
  if (says === "loading") return STRINGS.recitationLoading;
  if (says === "unavailable right now") return STRINGS.recitationUnavailable;
  return STRINGS.recitation;
};

/** The Recitation bar while the Recitation is on: previous Ayah, pause or play (or try again), next Ayah, what it says, the Recitation speed and stop. */
function RecitationBarView({ bar, actions, onBarTop }: { bar: RecitationBar; actions: RecitationActions; onBarTop: (top: number) => void }) {
  const colors = useColors();
  const view = useRef<View>(null);
  const failed = bar.offers === "try again";
  return (
    <View
      ref={view}
      onLayout={() => view.current?.measureInWindow((_x, y) => onBarTop(y))}
      accessibilityLabel={STRINGS.recitationBar}
      style={[styles.bar, { backgroundColor: colors.paper, borderColor: colors.line }]}
    >
      {!failed && <BarButton icon="⏮" label={STRINGS.previousAyah} disabled={bar.previousAyah === "disabled"} onPress={actions.previousAyah} />}
      <MainButton bar={bar} actions={actions} />
      {!failed && <BarButton icon="⏭" label={STRINGS.nextAyah} disabled={bar.nextAyah === "disabled"} onPress={actions.nextAyah} />}
      <Text accessibilityLiveRegion="polite" numberOfLines={1} style={[styles.says, { color: colors.ink }]}>
        {barTextOf(bar.says)}
      </Text>
      {!failed && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={STRINGS.recitationSpeed(bar.speed)}
          onPress={() => actions.chooseSpeed(speedAfter(bar.speed, bar.speeds))}
          hitSlop={6}
          style={[styles.speed, { borderColor: colors.line }]}
        >
          <Text style={[styles.speedLabel, { color: colors.ink }]}>{STRINGS.times(bar.speed)}</Text>
        </Pressable>
      )}
      <BarButton icon="■" label={STRINGS.stop} onPress={actions.stop} />
    </View>
  );
}

/** The play control, while the Recitation is off, or the Recitation bar while it is on, with the button back to the Recited Word above it once the reader scrolls by hand. */
export function RecitationControls({
  view,
  actions,
  onPlayFromTop,
  onBarTop,
}: {
  view: RecitationView;
  actions: RecitationActions;
  onPlayFromTop: () => void;
  /** Takes where the Recitation bar's top is in the window, once it is laid out. */
  onBarTop: (top: number) => void;
}) {
  if (!view.bar) return <PlayControl onPress={onPlayFromTop} />;
  return (
    <>
      {view.offersWayBack && <BackToRecitedWord onPress={actions.backToRecitedWord} />}
      <RecitationBarView bar={view.bar} actions={actions} onBarTop={onBarTop} />
    </>
  );
}

const styles = StyleSheet.create({
  playControl: {
    position: "absolute",
    right: 16,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    paddingRight: 10,
  },
  back: { position: "absolute", alignSelf: "center", bottom: 24 + 52 + 10, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  backLabel: { fontSize: 13, fontWeight: "500" },
  small: { width: 32, height: 40, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.35 },
  says: { flex: 1, fontSize: 14, fontWeight: "500" },
  speed: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  speedLabel: { fontSize: 13, fontWeight: "500" },
  toggle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 15 },
  label: { fontSize: 15, fontWeight: "500" },
});
