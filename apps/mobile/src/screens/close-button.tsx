// The round × that closes the Root dialog and the Settings sheet.

import { Pressable, StyleSheet, Text } from "react-native";
import { STRINGS, useColors } from "../theme";

export function CloseButton({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={STRINGS.close} onPress={onClose} style={[styles.close, { backgroundColor: colors.tint }]}>
      <Text style={[styles.closeText, { color: colors.ink }]}>×</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 20, lineHeight: 22 },
});
