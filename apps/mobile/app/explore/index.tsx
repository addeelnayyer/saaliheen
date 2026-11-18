// The Explore tab (#192): every way into the Quran besides reading in order,
// each with its name and one line in the reader's Language, the same as the
// website's Explore. Quran Chat opens the app's own screen (#81); the app has
// no screens of its own for the others yet, so each opens its website page in
// the reader's Language (docs/adr/0029).

import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { dataOrigin } from "../../src/config";
import { explore, type ExploreCard } from "../../src/destinations";
import type { Language } from "../../src/quran-analysis";
import { useReader } from "../../src/reader";
import { inLanguage, useColors } from "../../src/theme";

function Card({ card, language }: { card: ExploreCard; language: Language }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${card.name}. ${card.line}`}
      onPress={() => ("website" in card.opens ? void Linking.openURL(card.opens.website) : router.push(card.opens.screen))}
      style={[styles.card, { backgroundColor: colors.tint, borderColor: colors.line }]}
    >
      <Text style={[styles.name, { color: colors.ink }]}>{card.name}</Text>
      <Text style={[inLanguage(language, 14, 1), { color: colors.muted }]}>{card.line}</Text>
    </Pressable>
  );
}

export default function Explore() {
  const { language } = useReader();
  const screen = explore(dataOrigin(), language);
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {screen.cards.map((card) => (
        <Card key={card.name} card={card} language={language} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  name: { fontSize: 17, fontWeight: "600" },
});
