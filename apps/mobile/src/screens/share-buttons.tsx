// What opens a Share page from a Surah screen (#76; website: ayah-share.tsx,
// surah-bar.tsx): an Ayah's and a Passage heading's share buttons, and the
// Surah bar's "Share Ayahs", which opens it on 1:1–7 as the website does. Each
// opens the Share page with the edit strip, in the reader's Language and Script.

import { sharePath } from "@saaliheen/share";
import { router } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useReader } from "../reader";
import { SHARE_AYAHS_START } from "../share";
import { STRINGS, useColors } from "../theme";

/** Opens the Share page of Ayahs `from`..`to` of Surah `surah`, with the edit strip, in the reader's Language and Script. */
export function useOpenSharePage() {
  const { language, script } = useReader();
  return useCallback(
    (surah: number, from: number, to: number) => {
      const path = sharePath({ lang: language, script, surah, from, to, layout: null });
      router.push({ pathname: "/share", params: { path, sharer: "1" } });
    },
    [language, script],
  );
}

/** A share button, read out as `label`. */
export function ShareButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.share, { backgroundColor: pressed ? colors.hi : colors.chip }]}
    >
      <Text style={[styles.shareIcon, { color: colors.accent }]}>↗</Text>
    </Pressable>
  );
}

/** The Surah bar's "Share Ayahs". */
export function ShareAyahsButton() {
  const colors = useColors();
  const open = useOpenSharePage();
  const { surah, from, to } = SHARE_AYAHS_START;
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => open(surah, from, to)} style={styles.shareAyahs}>
      <Text style={[styles.shareAyahsText, { color: colors.accent }]}>{STRINGS.shareAyahs}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  share: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  shareIcon: { fontSize: 13, fontWeight: "600" },
  shareAyahs: { paddingHorizontal: 8 },
  shareAyahsText: { fontSize: 15, fontWeight: "600" },
});
