// The icon over a tab's word (#192): an open book for Read, a compass for
// Explore, a person for Me, stroked in the tab's tint with the website's own
// paths (src/destinations.ts). The current tab's icon sits on a pill, as the
// issue's prototype draws it. Decorative: the tab is named by its word. The
// pill appears and leaves without animating, so Reduce Motion is respected.

import { StyleSheet, View, type ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { tabIconPath, type TabIcon as Icon } from "../destinations";
import { useColors } from "../theme";

/** The box the tab bar gives each icon: the prototype's pill, a 24-point icon with 28 points either side and 2 above and below. */
export const TAB_ICON_BOX = { width: 80, height: 28 } as const;

export function TabIcon({ icon, focused, color }: { icon: Icon; focused: boolean; color: ColorValue }) {
  const colors = useColors();
  return (
    <View
      style={[styles.pill, focused && { backgroundColor: colors.chip }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d={tabIconPath(icon)} stroke={color} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { ...TAB_ICON_BOX, alignItems: "center", justifyContent: "center", borderRadius: 999 },
});
