// The app's frame: the Script typefaces (and Dubai for Urdu) loaded before
// anything is shown, the reader's choices, and the
// tabs Read, Explore and Me (#192), each word under its icon, the app opening on Read; and the update
// prompt over them when this app's version is no longer supported (#73).

import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import digitalKhattIndoPak from "../assets/fonts/DigitalKhattIndoPak.otf";
import dubai from "../assets/fonts/Dubai-Regular.ttf";
import uthmanicHafs from "../assets/fonts/UthmanicHafs_V22.ttf";
import { opensOn, tabs, type Destination } from "../src/destinations";
import { ReaderProvider } from "../src/reader";
import { TabBarProvider, useTabBarShown } from "../src/screens/tab-bar";
import { TAB_ICON_BOX, TabIcon } from "../src/screens/tab-icon";
import { UpdatePrompt } from "../src/screens/update-prompt";
import { TYPEFACE, useColors } from "../src/theme";

/** Each tab's route: Read is the group of the Surah index and the Surah screens, Explore the stack of its cards and Quran Chat. */
const ROUTE: Record<Destination, string> = { read: "(read)", explore: "explore", me: "me" };

/** The app opens on Read. */
export const unstable_settings = { initialRouteName: ROUTE[opensOn()] };

/** The tab bar, Read, Explore and Me, hidden while a Surah screen asks it to be. */
function DestinationTabs() {
  const colors = useColors();
  const shown = useTabBarShown();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { color: colors.ink },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIconStyle: TAB_ICON_BOX,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        tabBarStyle: shown ? { backgroundColor: colors.paper, borderTopColor: colors.line } : { display: "none" },
      }}
    >
      {tabs().map(({ destination, label, icon }) => (
        <Tabs.Screen
          key={destination}
          name={ROUTE[destination]}
          options={{
            title: label,
            tabBarLabel: label,
            tabBarAccessibilityLabel: label,
            tabBarIcon: ({ focused, color }) => <TabIcon icon={icon} focused={focused} color={color} />,
            // Read and Explore are stacks, each with its own header.
            headerShown: destination === "me",
          }}
        />
      ))}
    </Tabs>
  );
}

export default function Layout() {
  const [loaded, error] = useFonts({
    [TYPEFACE.uthmani]: uthmanicHafs,
    [TYPEFACE.indopak]: digitalKhattIndoPak,
    [TYPEFACE.urdu]: dubai,
  });
  if (error) throw error;
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ReaderProvider>
        <TabBarProvider>
          <StatusBar style="auto" />
          <DestinationTabs />
          <UpdatePrompt />
        </TabBarProvider>
      </ReaderProvider>
    </SafeAreaProvider>
  );
}
