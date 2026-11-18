// The Explore tab (#192): a stack of Explore's cards and the screens the app
// has of its own for them, Quran Chat's (#81).

import { Stack } from "expo-router";
import { useColors } from "../../src/theme";

export default function ExploreLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Explore" }} />
      <Stack.Screen name="quran-chat" options={{ title: "Quran Chat" }} />
    </Stack>
  );
}
