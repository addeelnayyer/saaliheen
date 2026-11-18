// What a Surah screen shows before its Ayahs (#73): the Surah's banner (its
// Arabic and Latin names), a skeleton of its Ayahs while it downloads, and,
// when it is not on the device and there is no connection, why it is not
// there, in the Language.

import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SurahNotDownloaded, type Language, type SurahSkeleton } from "../quran-analysis";
import { useReader } from "../reader";
import { inLanguage, quranText, STRINGS, useColors } from "../theme";
import { useLoaded, type FailureMessage } from "./loaded";

/** The Surah's Arabic name over its number and Latin name. */
export function SurahBanner({ surah }: { surah: Pick<SurahSkeleton, "number" | "nameArabic" | "nameLatin"> }) {
  const { script } = useReader();
  const colors = useColors();
  return (
    <View style={[styles.banner, { backgroundColor: colors.tint }]}>
      <Text style={[quranText(script, 32), { color: colors.accent }]}>{surah.nameArabic}</Text>
      <Text style={[styles.latin, { color: colors.muted }]}>{`${surah.number}. ${surah.nameLatin}`}</Text>
    </View>
  );
}

/** One Ayah's placeholder: its number over the bars where its Word cards will be. */
function AyahPlaceholder({ number }: { number: number }) {
  const colors = useColors();
  return (
    <View accessibilityLabel={STRINGS.ayahDownloading(number)} style={[styles.ayah, { borderColor: colors.line }]}>
      <Text style={[styles.number, { color: colors.muted }]}>{STRINGS.ayah(number)}</Text>
      <View style={[styles.bar, { backgroundColor: colors.tint }]} />
      <View style={[styles.bar, styles.shortBar, { backgroundColor: colors.tint }]} />
    </View>
  );
}

/** Surah `number`'s skeleton while it downloads: its banner over one placeholder per Ayah, from the Surah index. */
export function SurahSkeletonList({ number }: { number: number }) {
  const { analysis } = useReader();
  const skeleton = useLoaded(useCallback(() => analysis.surahSkeleton(number), [analysis, number])).value;
  if (!skeleton) return null;
  return (
    <FlatList
      data={skeleton.ayahs}
      keyExtractor={String}
      ListHeaderComponent={<SurahBanner surah={skeleton} />}
      renderItem={({ item }) => <AyahPlaceholder number={item} />}
      initialNumToRender={8}
      windowSize={5}
      scrollEnabled={false}
      contentContainerStyle={surahListStyle}
    />
  );
}

/** Why a Surah failed to open, in `language` when it is not downloaded yet; null for any other failure. */
export const surahFailure = (error: unknown, language: Language): FailureMessage | null =>
  error instanceof SurahNotDownloaded ? { message: error.message, style: inLanguage(language, 15, 1) } : null;

/** The padding of a Surah's list of Ayahs, which its skeleton shares so the two line up. */
export const surahListStyle = { paddingHorizontal: 16, paddingBottom: 96 } as const;

const styles = StyleSheet.create({
  banner: { alignItems: "center", gap: 2, paddingTop: 18, paddingBottom: 20, paddingHorizontal: 16, borderRadius: 22, marginTop: 4 },
  latin: { fontSize: 13 },
  ayah: { paddingVertical: 16, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  number: { fontSize: 13 },
  bar: { height: 44, borderRadius: 12 },
  shortBar: { height: 18, width: "60%" },
});
