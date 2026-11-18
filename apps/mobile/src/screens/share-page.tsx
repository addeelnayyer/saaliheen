// The Share page in the app (#76; website: share/share-page.tsx): the
// reference, the Passage title when the Shared Ayahs are exactly a Passage,
// and the Shared Ayahs in the page's Script and Language, set out Ayah by Ayah
// or Flowing. Opened from inside the app it carries the edit strip and Share,
// which hands the phone's share sheet the reference and the Share page's link.
// Opened from a link it shows the Shared Ayahs alone.

import { ScrollView, Share, StyleSheet, Text, View, Pressable } from "react-native";
import { useScales } from "../reader";
import type { SharedAyahView, SharePage as Page, ShareSheet } from "../share";
import { alignFor, inLanguage, quranText, STRINGS, useColors } from "../theme";
import { EditStrip } from "./edit-strip";

/** The phone's share sheet: React Native's Share, sent or dismissed (Android says only "sent"). */
const phoneShareSheet: ShareSheet = {
  async share(content) {
    const { action } = await Share.share(content);
    return action === Share.dismissedAction ? "dismissed" : "shared";
  },
};

/** Right-aligned for Urdu, left for English. */

/** One Shared Ayah: its Arabic, its number and its Ayah translation. */
function AyahByAyah({ page, ayah }: { page: Page; ayah: SharedAyahView }) {
  const scales = useScales();
  const colors = useColors();
  return (
    <View style={[styles.ayah, { borderBottomColor: colors.line }]}>
      <Text style={[quranText(page.script, 28, scales.arabic), styles.arabic, { color: colors.ink }]}>
        {ayah.words.join(" ")} <Text style={[styles.number, { color: colors.accent }]}>{ayah.number}</Text>
      </Text>
      <Text style={[inLanguage(page.lang, 15.5, scales.meaning), { color: colors.ink, textAlign: alignFor(page.lang) }]}>{ayah.translation}</Text>
    </View>
  );
}

/** The Shared Ayahs as one paragraph of Arabic, each Ayah closed by its number, over one paragraph of their Ayah translations. */
function Flowing({ page }: { page: Page }) {
  const scales = useScales();
  const colors = useColors();
  return (
    <View style={styles.ayah}>
      <Text style={[quranText(page.script, 28, scales.arabic), styles.arabic, { color: colors.ink }]}>
        {page.ayahs.map((a) => (
          <Text key={a.number}>
            {a.words.join(" ")} <Text style={[styles.number, { color: colors.accent }]}>{a.number}</Text>{" "}
          </Text>
        ))}
      </Text>
      <Text style={[inLanguage(page.lang, 15.5, scales.meaning), { color: colors.ink, textAlign: alignFor(page.lang) }]}>
        {page.ayahs.map((a) => `(${a.number}) ${a.translation}`).join(" ")}
      </Text>
    </View>
  );
}

/** "Share": hands the share sheet the reference and the link; the page stays as it was, sent or dismissed. */
function ShareButton({ page }: { page: Page }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void page.share(phoneShareSheet)}
      style={({ pressed }) => [styles.share, { backgroundColor: pressed ? colors.hi : colors.accent }]}
    >
      <Text style={[styles.shareText, { color: colors.onAccent }]}>{STRINGS.share}</Text>
    </Pressable>
  );
}

/** The Share page `page`; `open` shows the Share page an edit strip choice leads to. */
export function SharePageView({ page, open }: { page: Page; open: (next: Promise<Page>) => void }) {
  const scales = useScales();
  const colors = useColors();
  const strip = page.editStrip;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      {strip && <EditStrip strip={strip} layout={page.layout} open={open} />}
      {strip && <ShareButton page={page} />}
      <Text accessibilityRole="header" style={[styles.reference, { color: colors.accent }]}>
        {page.reference}
      </Text>
      {page.passageTitle !== null && (
        <Text style={[inLanguage(page.lang, 20, scales.meaning), styles.centred, { color: colors.ink }]}>{page.passageTitle}</Text>
      )}
      {page.layout === "flowing" ? <Flowing page={page} /> : page.ayahs.map((a) => <AyahByAyah key={a.number} page={page} ayah={a} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  reference: { fontSize: 15, fontWeight: "600", letterSpacing: 0.3, textAlign: "center", paddingTop: 16 },
  centred: { textAlign: "center" },
  ayah: { gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  arabic: { textAlign: "right" },
  number: { fontSize: 13, fontWeight: "600" },
  share: { alignSelf: "flex-end", borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8 },
  shareText: { fontSize: 15, fontWeight: "600" },
});
