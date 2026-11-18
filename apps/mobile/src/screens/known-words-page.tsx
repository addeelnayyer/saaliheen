// The Known words page (#253, #255, website: me/known-words), opened from Me:
// its head counts the Known Roots and the Known particles; its Roots tab lists
// every Root in Arabic letter order, and its Particles tab, after Roots, every
// particle most frequent first in the chosen Script, each row with its first
// meanings in the Language and Memorized?, with a search by Arabic letters or
// meaning (src/known-words.ts). The Root list is /data/v1/roots.json and the
// particle list /data/v1/particles.json, each kept on the phone once
// downloaded.

import { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KNOWN_WORDS_WORDS,
  knownParticlesTab,
  knownRootsTab,
  knownWordsCount,
  rootKey,
  type KnownParticleRow,
  type KnownRootRow,
  type ListedParticleIn,
  type ListedRootIn,
} from "../known-words";
import type { Language } from "../quran-analysis";
import { useReader, useScales } from "../reader";
import { inLanguage, quranText, useColors } from "../theme";
import { CloseButton } from "./close-button";
import { NothingFound } from "./index-rows";
import { Loaded, useLoaded } from "./loaded";
import { SearchBox } from "./search-box";

type Tab = "roots" | "particles";

export function KnownWordsPage({ onClose }: { onClose: () => void }) {
  const { analysis, language } = useReader();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Each list loads alone, so a Root list kept before particles came (#253)
  // still opens its tab with no connection.
  const loadRoots = useCallback(() => analysis.rootList(language), [analysis, language]);
  const loadParticles = useCallback(() => analysis.particleList(language), [analysis, language]);
  const roots = useLoaded(loadRoots);
  const particles = useLoaded(loadParticles);
  const [tab, setTab] = useState<Tab>("roots");
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: colors.paper, paddingBottom: insets.bottom }]}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
            {KNOWN_WORDS_WORDS.knownWords}
          </Text>
          <CloseButton onClose={onClose} />
        </View>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {(["roots", "particles"] as const).map((name) => (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === name }}
              onPress={() => setTab(name)}
              style={[styles.tab, { borderBottomColor: tab === name ? colors.accent : "transparent" }]}
            >
              <Text style={[styles.tabText, { color: tab === name ? colors.accent : colors.muted }]}>{KNOWN_WORDS_WORDS[name]}</Text>
            </Pressable>
          ))}
        </View>
        {roots.value && particles.value ? <Count roots={roots.value} particles={particles.value} /> : null}
        {tab === "roots" ? (
          <Loaded loaded={roots}>{(value) => <RootsTab roots={value} language={language} />}</Loaded>
        ) : (
          <Loaded loaded={particles}>{(value) => <ParticlesTab particles={value} language={language} />}</Loaded>
        )}
      </View>
    </Modal>
  );
}

/** The page's head: how many Roots and particles are Known words. */
function Count({ roots, particles }: { roots: ListedRootIn[]; particles: ListedParticleIn[] }) {
  const { known } = useReader();
  const colors = useColors();
  const count = useMemo(() => knownWordsCount(roots, particles, known), [roots, particles, known]);
  return <Text style={[styles.count, { color: colors.muted }]}>{count}</Text>;
}

function RootsTab({ roots, language }: { roots: ListedRootIn[]; language: Language }) {
  const { known } = useReader();
  const [search, setSearch] = useState("");
  const tab = useMemo(() => knownRootsTab(roots, known, search), [roots, known, search]);
  return (
    <>
      <SearchBox query={search} onChange={setSearch} placeholder={KNOWN_WORDS_WORDS.search} label={KNOWN_WORDS_WORDS.search} />
      <FlatList
        data={tab.rows}
        keyExtractor={(row) => row.letters}
        renderItem={({ item }) => <RootRow row={item} language={language} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        ListEmptyComponent={tab.none ? <NothingFound message={tab.none} /> : null}
      />
    </>
  );
}

function ParticlesTab({ particles, language }: { particles: ListedParticleIn[]; language: Language }) {
  const { script, known } = useReader();
  const [search, setSearch] = useState("");
  const tab = useMemo(() => knownParticlesTab(particles, script, known, search), [particles, script, known, search]);
  return (
    <>
      <SearchBox query={search} onChange={setSearch} placeholder={KNOWN_WORDS_WORDS.search} label={KNOWN_WORDS_WORDS.search} />
      <FlatList
        data={tab.rows}
        keyExtractor={(row) => `${row.key.kind} ${row.key.text}`}
        renderItem={({ item }) => <ParticleRow row={item} language={language} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        ListEmptyComponent={tab.none ? <NothingFound message={tab.none} /> : null}
      />
    </>
  );
}

/** A Root's row: its letters, its first meanings, and Memorized?. */
function RootRow({ row, language }: { row: KnownRootRow; language: Language }) {
  const { markKnown } = useReader();
  return <Row arabic={row.letters} meanings={row.meanings} known={row.known} language={language} onChange={(on) => markKnown(rootKey(row.letters), on)} />;
}

/** A particle's row: its text in the chosen Script, its first meanings, and Memorized?. */
function ParticleRow({ row, language }: { row: KnownParticleRow; language: Language }) {
  const { markKnown } = useReader();
  return <Row arabic={row.arabic} meanings={row.meanings} known={row.known} language={language} onChange={(on) => markKnown(row.key, on)} />;
}

function Row({ arabic, meanings, known, language, onChange }: { arabic: string; meanings: string; known: boolean; language: Language; onChange: (on: boolean) => void }) {
  const { script } = useReader();
  const scales = useScales();
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Switch accessibilityLabel={`${KNOWN_WORDS_WORDS.memorized} ${arabic}`} value={known} onValueChange={onChange} trackColor={{ true: colors.accent }} />
      <Text numberOfLines={2} style={[inLanguage(language, 14, scales.meaning, 1), styles.meanings, { color: colors.muted }]}>
        {meanings}
      </Text>
      <Text style={[quranText(script, 24, scales.arabic), styles.arabic, { color: colors.accent }]}>{arabic}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: "600" },
  tabs: { flexDirection: "row", gap: 20, marginHorizontal: 16, marginTop: 12 },
  tab: { paddingBottom: 6, borderBottomWidth: 2 },
  tabText: { fontSize: 15, fontWeight: "600" },
  count: { marginHorizontal: 16, marginVertical: 6, fontSize: 13, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  meanings: { flex: 1, textAlign: "left" },
  arabic: { textAlign: "right" },
});
