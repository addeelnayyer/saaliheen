// The rows of the Surah index (#193; website: surah-index.tsx and the
// prototype in DELIVERY/mockup.html): the Reading places to continue, a
// Surah row (number, Latin name, Meccan or Medinan, Ayah count, Arabic name),
// a Juz row (number, where it runs, its name in the reader's Script, and a dot
// when it holds the latest Reading place), and what a tab says when the search
// finds nothing in it.

import { parseReadingPlace } from "@saaliheen/reading-places";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { SurahIndexEntry } from "../quran-analysis";
import { useReader } from "../reader";
import type { JuzIndexEntry } from "../surah-index";
import { quranText, STRINGS, useColors } from "../theme";

/** "36:28" as its Surah and Ayah numbers, as route params. */
const opensAt = (id: string) => {
  const { surah, ayah } = parseReadingPlace(id)!;
  return { number: String(surah), ayah: String(ayah) };
};

/** A row's number in its diamond, with a dot under it when `here`. */
function RowNumber({ n, here = false }: { n: number; here?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.numberColumn}>
      <View style={[styles.number, { backgroundColor: colors.tint }]}>
        <Text style={[styles.numberText, { color: colors.accent }]}>{n}</Text>
      </View>
      {here && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
    </View>
  );
}

export function SurahRow({ surah }: { surah: SurahIndexEntry }) {
  const { script } = useReader();
  const colors = useColors();
  const madani = surah.revelationPlace === "madani";
  const place = madani ? STRINGS.madani : STRINGS.makki;
  return (
    <Link href={{ pathname: "/surah/[number]", params: { number: String(surah.number) } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${surah.number}. ${surah.nameLatin}, ${place}, ${STRINGS.ayahCount(surah.ayahCount)}`}>
        <View style={styles.row}>
          <RowNumber n={surah.number} />
          <View style={styles.names}>
            <Text style={[styles.latin, { color: colors.ink }]}>{surah.nameLatin}</Text>
            <View style={styles.meta}>
              <Text style={[styles.tag, { color: madani ? colors.madani : colors.accent, backgroundColor: madani ? colors.madaniBg : colors.chip }]}>{place}</Text>
              <Text style={[styles.muted, { color: colors.muted }]}>{STRINGS.ayahCount(surah.ayahCount)}</Text>
            </View>
          </View>
          <Text style={[quranText(script, 24), { color: colors.accent }]}>{surah.nameArabic}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

/** A Juz row: opens the Surah where the Juz starts, at its first Ayah. */
export function JuzRow({ juz, here }: { juz: JuzIndexEntry; here: boolean }) {
  const { script } = useReader();
  const colors = useColors();
  const title = STRINGS.juz(juz.number);
  const label = [title, juz.runs, here ? STRINGS.latestReadingPlace : null].filter(Boolean).join(", ");
  return (
    <Link href={{ pathname: "/surah/[number]", params: opensAt(juz.firstAyah) }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label}>
        <View style={styles.row}>
          <RowNumber n={juz.number} here={here} />
          <View style={styles.names}>
            <Text style={[styles.latin, { color: colors.ink }]}>{title}</Text>
            <Text style={[styles.muted, { color: colors.muted }]}>{juz.runs}</Text>
          </View>
          <Text style={[quranText(script, 22), styles.juzName, { color: colors.accent }]} numberOfLines={1}>
            {juz.name}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

/** A Reading place to continue, as the index shows it. */
export interface Continuable {
  surah: SurahIndexEntry;
  ayah: number;
}

/** One Reading place: opens its Surah, which opens at the Reading place. */
function ReadingPlaceChip({ surah, ayah }: Continuable) {
  const colors = useColors();
  return (
    <Link href={{ pathname: "/surah/[number]", params: { number: String(surah.number) } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${STRINGS.continueReading} ${surah.number}. ${STRINGS.ayahOf(surah.nameLatin, ayah)}`}
        style={[styles.place, { backgroundColor: colors.chip }]}
      >
        <Text style={[styles.placeName, { color: colors.ink }]}>{surah.nameLatin}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>{STRINGS.continueAt(surah.number, ayah)}</Text>
      </Pressable>
    </Link>
  );
}

/** The Reading places, newest first, in one row that scrolls sideways; nothing when the device has none. */
export function ReadingPlaces({ places }: { places: Continuable[] }) {
  if (places.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={STRINGS.continueReading} contentContainerStyle={styles.places}>
      {places.map((place) => (
        <ReadingPlaceChip key={place.surah.number} {...place} />
      ))}
    </ScrollView>
  );
}

/** What a tab says when the search finds nothing in it. */
export function NothingFound({ message }: { message: string }) {
  const colors = useColors();
  return <Text style={[styles.empty, { color: colors.muted }]}>{message}</Text>;
}

export function Separator() {
  const colors = useColors();
  return <View style={[styles.separator, { backgroundColor: colors.line }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4 },
  numberColumn: { width: 36, alignItems: "center", gap: 4 },
  number: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }] },
  numberText: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"], transform: [{ rotate: "-45deg" }] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  names: { flex: 1, gap: 2 },
  latin: { fontSize: 15, fontWeight: "500" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { fontSize: 11, borderRadius: 999, overflow: "hidden", paddingHorizontal: 8 },
  muted: { fontSize: 13 },
  juzName: { maxWidth: "45%" },
  places: { gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  place: { minWidth: 150, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  placeName: { fontSize: 14.5, fontWeight: "600" },
  empty: { fontSize: 15, textAlign: "center", paddingVertical: 32, paddingHorizontal: 8 },
  separator: { height: StyleSheet.hairlineWidth },
});
