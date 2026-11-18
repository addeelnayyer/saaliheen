// A Passage's Tafsir after its last Ayah (#236): its Tafsir entries in order,
// each under its Ayah range, then the edition's credit line, on a tinted band
// like the Passage heading's. The entries are in the Language, Urdu right to
// left in the Urdu typeface, with their bold and italic kept; the credit line
// is the edition's own words, in English.

import { StyleSheet, Text, View } from "react-native";
import type { Language, PassageTafsir, TafsirRun } from "../quran-analysis";
import { useScales } from "../reader";
import { alignFor, inLanguage, useColors } from "../theme";

/** A run's bold and italic. */
const runStyle = ({ bold, italic }: TafsirRun) => ({ fontWeight: bold ? ("700" as const) : undefined, fontStyle: italic ? ("italic" as const) : undefined });

/** A Passage's Tafsir as a band after its last Ayah: each entry under its Ayah range, in `language`, then the credit line. */
export function TafsirBand({ tafsir, language }: { tafsir: PassageTafsir; language: Language }) {
  const scales = useScales();
  const colors = useColors();
  const align = alignFor(language);
  return (
    <View style={[styles.tafsir, { backgroundColor: colors.tint }]}>
      {tafsir.entries.map((entry) => (
        <View key={entry.range} style={styles.entry}>
          <Text style={[styles.range, { fontSize: 12.5 * scales.meaning, color: colors.accent, textAlign: align }]}>{entry.label}</Text>
          <Text style={[inLanguage(language, 15, scales.meaning), { color: colors.ink, textAlign: align }]}>
            {entry.runs.map((run, k) => (
              <Text key={k} style={runStyle(run)}>
                {run.text}
              </Text>
            ))}
          </Text>
        </View>
      ))}
      <Text style={[styles.credit, { color: colors.muted, textAlign: align }]}>{tafsir.credit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tafsir: { marginTop: 14, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, gap: 14 },
  entry: { gap: 4 },
  range: { fontWeight: "600", letterSpacing: 0.3 },
  credit: { fontSize: 11.5, fontStyle: "italic" },
});
