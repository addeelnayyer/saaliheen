// The Share page (#76; src/screens/share-page.tsx), at /share?path=<the Share
// page's path>: with `sharer=1` it was opened from inside the app (an Ayah's or
// a Passage heading's share button, or the Surah bar's "Share Ayahs") and
// carries the edit strip; without, from a Share page link (app/+native-intent.tsx).
// It is not a Surah screen, so it leaves the Reading places as they were.

import { namedShareOfPath } from "@saaliheen/share";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { QuranAnalysis } from "../../src/quran-analysis";
import { useReader } from "../../src/reader";
import { openSharePage, type SharePage } from "../../src/share";
import { Loaded, useLoaded } from "../../src/screens/loaded";
import { SharePageView } from "../../src/screens/share-page";
import { STRINGS, useColors } from "../../src/theme";

/** The Share page at `path`, or null when it names none, or Ayahs that may not be shared. */
async function opened(analysis: QuranAnalysis, path: string, sharer: boolean) {
  const request = namedShareOfPath(path);
  return { page: request ? await openSharePage(analysis, request, { sharer }) : null };
}

function NotFound() {
  const colors = useColors();
  return <Text style={[styles.notFound, { color: colors.muted }]}>{STRINGS.shareNotFound}</Text>;
}

export default function ShareRoute() {
  const { path = "", sharer } = useLocalSearchParams<{ path?: string; sharer?: string }>();
  const { analysis } = useReader();
  const loaded = useLoaded(useCallback(() => opened(analysis, path, sharer === "1"), [analysis, path, sharer]));
  /** The Share page an edit strip choice opened, over the one the address named. */
  const [chosen, setChosen] = useState<SharePage | null>(null);
  const open = (next: Promise<SharePage>) => void next.then(setChosen);
  return (
    <>
      <Stack.Screen options={{ title: STRINGS.shareAyahs }} />
      <Loaded loaded={loaded}>{({ page }) => (page ? <SharePageView page={chosen ?? page} open={open} /> : <NotFound />)}</Loaded>
    </>
  );
}

const styles = StyleSheet.create({
  notFound: { fontSize: 15, textAlign: "center", padding: 24 },
});
