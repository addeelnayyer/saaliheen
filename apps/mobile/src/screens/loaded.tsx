// Something a screen reads from /data/v1: loading, loaded, or failed with a
// Retry button. A screen may show its own view while loading (a Surah's
// skeleton, #73) and for a failure it explains itself (SurahNotDownloaded).

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextStyle } from "react-native";
import { STRINGS, useColors } from "../theme";

type State<T> = { value: T; error: null } | { value: null; error: unknown } | { value: null; error: null };

/** What `load` gives, read again whenever `load` changes or Retry is pressed; what has loaded stays shown meanwhile. */
export function useLoaded<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ value: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((now) => (now.value === null ? { value: null, error: null } : now));
    load().then(
      (value) => current && setState({ value, error: null }),
      (error: unknown) => current && setState({ value: null, error }),
    );
    return () => {
      current = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

type LoadedProps<T> = {
  loaded: ReturnType<typeof useLoaded<T>>;
  children: (value: T) => ReactNode;
  /** What shows while loading; a spinner when left out. */
  pending?: ReactNode;
  /** The message `error` shows over Retry, or null for the general failure. */
  failed?: (error: unknown) => FailureMessage | null;
};

/** A failure's `message`, in `style` when given. */
export type FailureMessage = { message: string; style?: TextStyle };

/** `children` once `value` has loaded; until then `pending` (or a spinner), or the failure and Retry. */
export function Loaded<T>({ loaded, children, pending, failed }: LoadedProps<T>) {
  const colors = useColors();
  if (loaded.value !== null) return children(loaded.value);
  if (loaded.error === null) return pending ?? <ActivityIndicator style={styles.centre} color={colors.accent} />;
  return <Failed {...(failed?.(loaded.error) ?? { message: STRINGS.loadFailed })} retry={loaded.retry} />;
}

/** A failure's `message`, in `style` when given, over a Retry button. */
function Failed({ message, retry, style }: FailureMessage & { retry: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.centre}>
      <Text style={[styles.message, style, { color: colors.muted }]}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={[styles.retry, { backgroundColor: colors.chip }]}>
        <Text style={{ color: colors.accent }}>{STRINGS.retry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  message: { fontSize: 15, textAlign: "center" },
  retry: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
});
