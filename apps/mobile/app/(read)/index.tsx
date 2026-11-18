// The Read screen's Surah index (#193; website: the Read page). From the top:
// this device's Reading places, newest first, each opening its Surah at that
// Ayah (read again whenever the index comes back into view); the Surahs | Juz
// tabs, Surahs first; one search box for both tabs; and each tab's list in
// one column, side by side on a paging track (src/screens/index-tabs.tsx).
// The Juz follow the reader's Script (ADR 0021); a Juz row opens the Surah
// where the Juz starts, at its first Ayah, and the Juz holding the latest
// Reading place shows a dot.

import { foldNames } from "@saaliheen/dataset/index-search";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { indexTabs } from "../../src/destinations";
import type { SurahIndexEntry } from "../../src/quran-analysis";
import type { ReadingPlace } from "../../src/reading-places";
import { useReader } from "../../src/reader";
import { IndexPage, IndexTabs, IndexTrack, useIndexTrack } from "../../src/screens/index-tabs";
import { JuzRow, NothingFound, ReadingPlaces, Separator, SurahRow, type Continuable } from "../../src/screens/index-rows";
import { Loaded, useLoaded } from "../../src/screens/loaded";
import { SearchBox } from "../../src/screens/search-box";
import { juzHolding, searchRows, type JuzIndexEntry } from "../../src/surah-index";
import { STRINGS } from "../../src/theme";

const TABS = indexTabs();

/** The Reading places that name an Ayah of a Surah, with their Surahs. */
function continuable(places: ReadingPlace[], surahs: SurahIndexEntry[]): Continuable[] {
  return places.flatMap(({ surah: number, ayah }) => {
    const surah = surahs.find((s) => s.number === number);
    return surah && ayah <= surah.ayahCount ? [{ surah, ayah }] : [];
  });
}

/** This device's Reading places, read again each time the Surah index comes into view. */
function useReadingPlaces(): ReadingPlace[] {
  const { readingPlaces } = useReader();
  const [places, setPlaces] = useState<ReadingPlace[]>([]);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      void readingPlaces.list().then((listed) => current && setPlaces(listed));
      return () => {
        current = false;
      };
    }, [readingPlaces]),
  );
  return places;
}

/** What the search shows on each tab: the rows it finds, and what the tab says when it finds none. */
function useSearch(query: string, surahs: SurahIndexEntry[], juz: JuzIndexEntry[]) {
  const names = useMemo(() => foldNames(surahs), [surahs]);
  return useMemo(() => searchRows(query, surahs, juz, names), [query, surahs, juz, names]);
}

function IndexScreen({ surahs, juz }: { surahs: SurahIndexEntry[]; juz: JuzIndexEntry[] }) {
  const places = useReadingPlaces();
  const [query, setQuery] = useState("");
  const found = useSearch(query, surahs, juz);
  const track = useIndexTrack();
  const latest = useMemo(() => juzHolding(juz, places[0]), [juz, places]);
  const toContinue = useMemo(() => continuable(places, surahs), [places, surahs]);
  return (
    <View style={styles.screen}>
      <ReadingPlaces places={toContinue} />
      <IndexTabs tabs={TABS} counts={[surahs.length, juz.length]} track={track} />
      <SearchBox query={query} onChange={setQuery} placeholder={STRINGS.searchPlaceholder} label={STRINGS.searchIndex} />
      <IndexTrack track={track}>
        <IndexPage label={STRINGS.surahsTab} width={track.width}>
          <FlatList
            data={found.surahRows}
            keyExtractor={(s) => String(s.number)}
            renderItem={({ item }) => <SurahRow surah={item} />}
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={found.noSurah ? <NothingFound message={found.noSurah} /> : null}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.list}
          />
        </IndexPage>
        <IndexPage label={STRINGS.juzTab} width={track.width}>
          <FlatList
            data={found.juzRows}
            keyExtractor={(j) => String(j.number)}
            renderItem={({ item }) => <JuzRow juz={item} here={item.number === latest} />}
            extraData={latest}
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={found.noJuz ? <NothingFound message={found.noJuz} /> : null}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.list}
          />
        </IndexPage>
      </IndexTrack>
    </View>
  );
}

export default function SurahIndex() {
  const { analysis, script } = useReader();
  // The Juz tab stays empty rather than failing the index while juz.json cannot be read.
  const load = useCallback(() => {
    // surahs.json is read once, for the Surahs tab and to name where each Juz runs.
    const surahs = analysis.surahIndex();
    return Promise.all([surahs, analysis.juzIndex(script, surahs).catch(() => [])]);
  }, [analysis, script]);
  const loaded = useLoaded(load);
  return (
    <>
      <Stack.Screen options={{ title: STRINGS.brand }} />
      <Loaded loaded={loaded}>{([surahs, juz]) => <IndexScreen surahs={surahs} juz={juz} />}</Loaded>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
});
