// The Read tab (#192): a stack of the Surah index and the Surah screens, with
// the Settings sheet's button in the header.

import { Stack } from "expo-router";
import { SettingsButton } from "../../src/screens/settings-sheet";
import { useColors } from "../../src/theme";

export default function ReadLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.paper },
        headerRight: () => <SettingsButton />,
      }}
    />
  );
}
