// The update prompt (#73): shown when this app's version is below the
// manifest's minAppVersion. The app checks the manifest at launch and whenever
// the connection comes back; each check also refreshes the kept Surahs whose
// hash changed (src/quran-analysis.ts, checkForUpdates).

import { addNetworkStateListener } from "expo-network";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { QuranAnalysis } from "../quran-analysis";
import { useReader } from "../reader";
import { STRINGS, useColors } from "../theme";

/** Whether the update prompt shows: checked at launch and each time the device comes back online. */
function useUpdatePrompt(analysis: QuranAnalysis) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const check = () =>
      void analysis.checkForUpdates().then(
        ({ updatePrompt }) => setShown(updatePrompt),
        () => undefined,
      );
    check();
    let connected: boolean | undefined;
    const subscription = addNetworkStateListener(({ isConnected }) => {
      const cameBack = isConnected === true && connected === false;
      connected = isConnected;
      if (cameBack) check();
    });
    return () => subscription.remove();
  }, [analysis]);
  return { shown, dismiss: () => setShown(false) };
}

export function UpdatePrompt() {
  const { analysis } = useReader();
  const { shown, dismiss } = useUpdatePrompt(analysis);
  const colors = useColors();
  return (
    <Modal visible={shown} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View accessibilityRole="alert" style={[styles.card, { backgroundColor: colors.paper }]}>
          <Text style={[styles.title, { color: colors.ink }]}>{STRINGS.updateTitle}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{STRINGS.updateBody}</Text>
          <Pressable accessibilityRole="button" onPress={dismiss} style={[styles.button, { backgroundColor: colors.chip }]}>
            <Text style={{ color: colors.accent }}>{STRINGS.notNow}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 22, padding: 22, gap: 12, maxWidth: 420, width: "100%" },
  title: { fontSize: 19, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22 },
  button: { alignSelf: "flex-end", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
});
