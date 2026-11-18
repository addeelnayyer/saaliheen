// The Surah screen (website: surah-screen.tsx): the Surah's name over its
// Ayahs, each Passage heading above its Passage's first Ayah, in the reader's
// Script and Language. A Root tag opens the Root dialog, a Particle tag the
// Particle dialog (#255); a Word location in either
// goes to that Word's Ayah, here or in its own Surah. Opened with `word`, the
// screen starts at that Word's Ayah. The play control plays the Recitation from
// the Ayah at the top of the screen (#112), marking the Recited Word's card;
// beside each Ayah's number a reader listens from that Ayah, a tap on a Word
// card carries a playing Recitation on from it, and the screen follows the
// Recited Word until the reader scrolls by hand (#114).
// Opened from a Juz row with `ayah` (#193), it starts at the Juz's first Ayah.
// The reader's chosen Section marks (#194) stand above their Ayahs and above
// any Passage heading there; changing the choice reads the Surah again.
// Opening a Surah stops a Recitation of another Surah, whose screen may stay
// open beneath this one (#113).
// Each screen is a visit to the device's Reading places (#74): opened without
// `word` it starts at the Surah's Reading place and, whenever scrolling stops,
// moves it to the Ayah at the top; a look-up (opened at a Word location, or one
// followed in it) leaves the Reading places as they were.
// A Surah opens from the device once downloaded (#73): while it downloads the
// screen shows a skeleton of its Ayahs, and opened offline before it was ever
// downloaded it says why it is not there, in the Language.
// The tab bar gets out of the way while the reader reads down, comes back on
// scrolling up, and stays away while the Recitation bar is on screen (#192).
// An Ayah's and a Passage heading's share buttons, and the Surah bar's "Share
// Ayahs", open a Share page with the edit strip (#76); sharing is not reading,
// so it leaves the Reading places as they were.
// While the Tafsir is switched on (#236), each Passage's Tafsir follows its
// last Ayah, in the Language.
// While Hide Word meanings is on (#247), a tap on a Word card with no
// Recitation playing shows or hides its meaning (src/word-meanings.ts); the
// meanings revealed are this screen's, so leaving the Surah (for another
// screen or tab, even one it stays open beneath), or switching the setting,
// hides them again.

import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { Language, Script, SurahScreen } from "../../../src/quran-analysis";
import { useReader } from "../../../src/reader";
import type { SurahVisit } from "../../../src/reading-places";
import { plays, surahOpened } from "../../../src/recitation";
import { Ayah, PassageHeadingBand, SectionMarkBand, type ParticleTag, type RootTag } from "../../../src/screens/ayah";
import { Loaded, useLoaded } from "../../../src/screens/loaded";
import { RecitationControls, useAyahAtTop, useFollowing, useRecitation } from "../../../src/screens/recitation";
import { ParticleDialog } from "../../../src/screens/particle-dialog";
import { RootDialog } from "../../../src/screens/root-dialog";
import { SettingsButton } from "../../../src/screens/settings-sheet";
import { ShareAyahsButton, useOpenSharePage } from "../../../src/screens/share-buttons";
import { SurahBanner, surahFailure, surahListStyle, SurahSkeletonList } from "../../../src/screens/surah-waiting";
import { TafsirBand } from "../../../src/screens/tafsir";
import { useSurahTabBar } from "../../../src/screens/tab-bar";
import { NONE_REVEALED, tapWordCard } from "../../../src/word-meanings";

type Item = SurahScreen["items"][number];

/** A Word location's Surah and Ayah numbers ("18:83:2" → 18, 83). */
const surahAndAyah = (location: string) => location.split(":").map(Number) as [number, number];

/** Where Ayah `ayah` is in `items`, or -1. */
const indexOfAyah = (items: Item[], ayah: number) => items.findIndex((item) => item.kind === "ayah" && item.number === ayah);

/** Where the screen starts in `items`: the Ayah it opens at, or -1 when that is Ayah 1 (the top) or not known yet. */
const startIndexOf = (items: Item[] | undefined, visit: SurahVisit | null) =>
  items && visit && visit.opensAt > 1 ? indexOfAyah(items, visit.opensAt) : -1;

/** Each item's key: a Section mark by its label, which is unique within its Surah, and a Passage's Tafsir by its first entry's range. */
function keyOf(item: Item) {
  switch (item.kind) {
    case "ayah":
      return `ayah-${item.number}`;
    case "passage-heading":
      return `passage-${item.range}`;
    case "tafsir":
      return `tafsir-${item.entries[0].range}`;
    default:
      return `mark-${item.label}`;
  }
}

/** A Passage heading's Ayahs: its range, "83–88", or one number for a one-Ayah Passage. */
const passageAyahs = (range: string) => {
  const [from, till = from] = range.split("–").map(Number);
  return [from, till] as const;
};

/** What stands between Ayahs: a Passage heading, with its share button, a Section mark (#194), or a Passage's Tafsir (#236). */
function Band({ surah, item, language, script }: { surah: number; item: Exclude<Item, { kind: "ayah" }>; language: Language; script: Script }) {
  const openShare = useOpenSharePage();
  if (item.kind === "tafsir") return <TafsirBand tafsir={item} language={language} />;
  if (item.kind !== "passage-heading") return <SectionMarkBand mark={item} script={script} />;
  return <PassageHeadingBand surah={surah} heading={item} language={language} onShare={() => openShare(surah, ...passageAyahs(item.range))} />;
}

/** The Surah bar's buttons: "Share Ayahs" (#76), and the Settings sheet's. */
function SurahBarButtons() {
  return (
    <View style={styles.barButtons}>
      <ShareAyahsButton />
      <SettingsButton />
    </View>
  );
}

/** `ayah` as an Ayah number, or undefined when not given. */
const ayahParam = (ayah: string | undefined) => (ayah === undefined ? undefined : Number(ayah));

/**
 * This screen's visit to the device's Reading places: Surah `number`, a
 * look-up when opened at Word location `word`, opened at Ayah `ayah` from a
 * Juz row (#193).
 */
function useSurahVisit(number: number, word: string | undefined, ayah: string | undefined) {
  const { readingPlaces } = useReader();
  return useLoaded(useCallback(() => readingPlaces.open(number, { word, ayah: ayahParam(ayah) }), [readingPlaces, number, word, ayah])).value;
}

export default function SurahRoute() {
  const params = useLocalSearchParams<{ number: string; word?: string; ayah?: string }>();
  const number = Number(params.number);
  const { analysis, script, language, ayahTranslation, sectionMarks, hideWordMeanings } = useReader();
  const load = useCallback(
    () => analysis.surah(number, { script, language, ayahTranslation }),
    // The Section marks choice is kept by the Quran Analysis, which reads it as the Surah opens; read the Surah again when it changes.
    [analysis, number, script, language, ayahTranslation, sectionMarks],
  );
  const loaded = useLoaded(load);
  const [rootTag, setRootTag] = useState<{ tag: RootTag; word: string } | null>(null);
  const openRoot = useCallback((tag: RootTag, word: string) => setRootTag({ tag, word }), []);
  const [particleTag, setParticleTag] = useState<{ tag: ParticleTag; word: string } | null>(null);
  const openParticle = useCallback((tag: ParticleTag, word: string) => setParticleTag({ tag, word }), []);
  const list = useRef<FlatList<Item>>(null);
  const started = useRef(false);
  const [laidOut, setLaidOut] = useState(false);
  const visit = useSurahVisit(number, params.word, params.ayah);
  const startAt = startIndexOf(loaded.value?.items, visit);
  /** The Surah's name as the Surah index gives it, for the Surah bar and the lock screen; empty until it loads. */
  const nameLatin = loaded.value?.nameLatin ?? "";
  useEffect(() => surahOpened(number), [number]);
  const recitation = useRecitation(number, nameLatin);
  /** The Ayah at the top of the screen, below the Surah bar, which the play control plays from. */
  const { viewOf, ayahAtTopNow } = useAyahAtTop();
  const { recitedWord, markedAyah, followed } = recitation.view;
  const items = loaded.value?.items;
  const ayahIndex = useCallback((ayah: number) => indexOfAyah(items ?? [], ayah), [items]);
  const following = useFollowing(list, followed, ayahIndex);
  const { scrolledByHand } = recitation;
  const openShare = useOpenSharePage();
  const shareAyah = useCallback((ayah: number) => openShare(number, ayah, ayah), [openShare, number]);
  const followTabBar = useSurahTabBar(recitation.view.bar !== null);
  const [revealed, setRevealed] = useState(NONE_REVEALED);
  useEffect(() => setRevealed(NONE_REVEALED), [hideWordMeanings]);
  useFocusEffect(useCallback(() => () => setRevealed(NONE_REVEALED), []));
  // The tap reads the screen as it is now from a ref, so onTapWord stays the same and the Ayahs are not drawn again on every Recited Word.
  const tapping = useRef({ hidden: hideWordMeanings, revealed, plays: plays(recitation.view.bar?.offers) });
  useEffect(() => {
    tapping.current = { hidden: hideWordMeanings, revealed, plays: plays(recitation.view.bar?.offers) };
  });
  const { tapWord } = recitation;
  const onTapWord = useCallback((location: string) => setRevealed(tapWordCard(location, { ...tapping.current, tapWord })), [tapWord]);
  const extraData = useMemo(() => [recitedWord, revealed, hideWordMeanings], [recitedWord, revealed, hideWordMeanings]);
  const onScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    following.onScroll(event);
    followTabBar(event.nativeEvent.contentOffset.y);
  };

  const scrollTo = useCallback((index: number) => {
    list.current?.scrollToIndex({ index, animated: true, viewOffset: 8 });
  }, []);

  /** Opens the screen at its Ayah once the list is laid out and the visit is known. */
  useEffect(() => {
    if (started.current || !laidOut || startAt < 0) return;
    started.current = true;
    scrollTo(startAt);
  }, [laidOut, startAt, scrollTo]);

  /** Scrolling stopped: the Ayah at the top becomes the Reading place, unless this is a look-up. */
  const settled = useCallback(() => {
    if (visit) void ayahAtTopNow().then(visit.scrolledTo);
  }, [visit, ayahAtTopNow]);

  const goTo = useCallback(
    (location: string) => {
      setRootTag(null);
      setParticleTag(null);
      const [surah, ayah] = surahAndAyah(location);
      const index = surah === number ? ayahIndex(ayah) : -1;
      if (index < 0) {
        router.push({ pathname: "/surah/[number]", params: { number: String(surah), word: location } });
        return;
      }
      void visit?.wentTo(location);
      // Going to an Ayah is the reader's move, so the screen stops following the Recited Word.
      scrolledByHand();
      scrollTo(index);
    },
    [number, ayahIndex, scrollTo, scrolledByHand, visit],
  );

  return (
    <>
      <Stack.Screen options={{ title: nameLatin, headerRight: SurahBarButtons }} />
      <Loaded
        loaded={loaded}
        pending={<SurahSkeletonList number={number} />}
        failed={(error) => surahFailure(error, language)}
      >
        {(surah) => (
          <>
            <FlatList
              ref={list}
              data={surah.items}
              keyExtractor={keyOf}
              ListHeaderComponent={<SurahBanner surah={surah} />}
              extraData={extraData}
              renderItem={({ item }) =>
                item.kind === "ayah" ? (
                  <View ref={viewOf(item.number)} collapsable={false}>
                    <Ayah
                      surah={number}
                      ayah={item}
                      language={language}
                      recitedWord={item.number === markedAyah ? recitedWord : null}
                      cardRef={following.cardRef}
                      hiddenMeanings={hideWordMeanings}
                      revealed={revealed}
                      onListenFrom={recitation.listenFrom}
                      onShare={shareAyah}
                      onOpenRoot={openRoot}
                      onOpenParticle={openParticle}
                      onTapWord={onTapWord}
                    />
                  </View>
                ) : (
                  <Band surah={number} item={item} language={language} script={script} />
                )
              }
              onLayout={() => setLaidOut(true)}
              onScroll={onScroll}
              scrollEventThrottle={100}
              onScrollBeginDrag={scrolledByHand}
              onMomentumScrollEnd={settled}
              onScrollEndDrag={settled}
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                list.current?.scrollToOffset({ offset: averageItemLength * index, animated: false });
                setTimeout(() => scrollTo(index), 100);
              }}
              initialNumToRender={8}
              windowSize={9}
              contentContainerStyle={surahListStyle}
            />
            <RecitationControls
              view={recitation.view}
              actions={recitation}
              onPlayFromTop={() => void ayahAtTopNow().then(recitation.playFrom)}
              onBarTop={following.onBarTop}
            />
          </>
        )}
      </Loaded>
      {rootTag && <RootDialog tag={rootTag.tag} word={rootTag.word} onClose={() => setRootTag(null)} onGoTo={goTo} />}
      {particleTag && <ParticleDialog tag={particleTag.tag} word={particleTag.word} onClose={() => setParticleTag(null)} onGoTo={goTo} />}
    </>
  );
}

const styles = StyleSheet.create({
  barButtons: { flexDirection: "row", alignItems: "center", gap: 4 },
});
