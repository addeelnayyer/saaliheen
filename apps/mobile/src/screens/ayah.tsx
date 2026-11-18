// An Ayah of the Surah screen — its number with "listen from here" beside it
// (#114), its Word cards flowing right to left closed by its number in a star,
// and its Ayah translation — and the Passage heading above a Passage's first
// Ayah, with a Section mark above both (#194). A tap on a Word card carries a playing Recitation on from that Word; a
// tap on its Root tag opens the Root dialog instead, and on the Particle tag a
// Word with no Root has (#255) the Particle dialog. While Hide Word meanings
// is on (#247), a Word card's meaning is left off, its space kept, until the
// reader reveals it (src/word-meanings.ts). While Known words colour is on
// (#253, #255), the Word card of a Known Root or Known particle is tinted green (src/known-words.ts). Laid out as the website's
// ayah.tsx and word-card.tsx (surah.module.css at phone width). An Ayah's and
// a Passage heading's share buttons open their Share page (#76).

import { memo, type Ref } from "react";
import { Pressable, StyleSheet, Text, View, type TextStyle } from "react-native";
import type { AyahView, Language, PassageHeading, Script, SectionMarkView, WordCard as Word } from "../quran-analysis";
import { useReader, useScales } from "../reader";
import { wordCardLook } from "../known-words";
import { alignFor, inLanguage, quranText, STRINGS, TYPEFACE, useColors, type Colors } from "../theme";
import { showsMeaning, type RevealedMeanings } from "../word-meanings";
import { ShareButton } from "./share-buttons";

export type RootTag = NonNullable<Word["root"]>;
export type ParticleTag = NonNullable<Word["particle"]>;

/** Right-aligned for Urdu, left for English. */

/** What an Ayah's Word cards do when tapped. */
interface WordActions {
  /** A tap on a Word card's Root tag, with that Word's location (#323). */
  onOpenRoot: (root: RootTag, word: string) => void;
  /** A tap on a Word card's Particle tag, with that Word's location (#326). */
  onOpenParticle: (particle: ParticleTag, word: string) => void;
  /** A tap on the Word card at a Word location, away from its Root tag. */
  onTapWord: (location: string) => void;
}

/** A hidden Word meaning (#247) is not read out; styles.hiddenMeaning keeps its space, so the cards do not move when it is revealed. */
const UNREAD = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

/**
 * A Word card: its Arabic in the Script, its Word meaning in the Language
 * unless `meaningShown` is false, and its Root tag, or its Particle tag;
 * marked while it is the Recited Word, and then `cardRef`'s.
 */
function WordCard({
  word,
  recited,
  meaningShown,
  cardRef,
  onOpenRoot,
  onOpenParticle,
  onTapWord,
}: WordActions & { word: Word; recited: boolean; meaningShown: boolean; cardRef?: Ref<View> }) {
  const { script, language, allahReferenceColour, knownWordsColour, known } = useReader();
  const scales = useScales();
  const colors = useColors();
  const { root, particle } = word;
  const look = wordCardLook(word, { knownWordsColour, known, allahReferenceColour, recited }, colors);
  return (
    <Pressable
      ref={recited ? cardRef : undefined}
      onPress={() => onTapWord(word.location)}
      style={[styles.wordCard, { backgroundColor: look.background, borderColor: look.border }]}
    >
      <Text style={[quranText(script, 28, scales.arabic), { color: look.arabic }]}>{word.arabic}</Text>
      <Text
        {...(meaningShown ? null : UNREAD)}
        style={[inLanguage(language, 13, scales.meaning, 1), styles.centred, { color: look.meaning }, !meaningShown && styles.hiddenMeaning]}
      >
        {word.meaning || STRINGS.noMeaning}
      </Text>
      {root && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${STRINGS.rootLabel} ${root.letters}`}
          onPress={() => onOpenRoot(root, word.location)}
          style={({ pressed }) => [styles.rootTag, { backgroundColor: pressed ? colors.hi : colors.chip }]}
        >
          <Text style={[quranText(script, 17), { color: colors.accent }]}>{root.letters}</Text>
          <Text style={[styles.rootArrow, { color: colors.accent }]}>↗</Text>
        </Pressable>
      )}
      {particle && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${STRINGS.particleLabel} ${particle.arabic}`}
          onPress={() => onOpenParticle(particle, word.location)}
          style={({ pressed }) => [styles.rootTag, { backgroundColor: pressed ? colors.hi : colors.chip }]}
        >
          <Text style={[quranText(script, 17), { color: colors.accent }]}>{particle.arabic}</Text>
          <Text style={[styles.rootArrow, { color: colors.accent }]}>↗</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

/** "Listen from here" beside an Ayah's number: plays the Recitation from that Ayah. */
function ListenFrom({ number, onListenFrom, colors }: { number: number; onListenFrom: (ayah: number) => void; colors: Colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={STRINGS.listenFrom(number)}
      hitSlop={8}
      onPress={() => onListenFrom(number)}
      style={({ pressed }) => [styles.listen, { backgroundColor: pressed ? colors.hi : colors.chip }]}
    >
      <Text style={[styles.listenIcon, { color: colors.accent }]}>▶</Text>
    </Pressable>
  );
}

/** The Ayah's end: its number in a small eight-pointed star. */
function AyahEnd({ number, colors }: { number: number; colors: Colors }) {
  return (
    <View style={styles.end} accessible={false}>
      <View style={[styles.star, { borderColor: colors.accent }]} />
      <View style={[styles.star, styles.turned, { borderColor: colors.accent }]} />
      <Text style={[styles.endNumber, { color: colors.accent }]}>{number}</Text>
    </View>
  );
}

interface AyahProps {
  /** The Surah the Ayah is in. */
  surah: number;
  ayah: AyahView;
  /** The Language the Ayah was read in. */
  language: Language;
  /** The Recited Word's location while it is in this Ayah, which is then marked faintly; else null. */
  recitedWord: string | null;
  /** Takes the Recited Word's card while it is in this Ayah, for the screen to follow it. */
  cardRef?: Ref<View>;
  /** Whether Hide Word meanings is on (#247), and the Word meanings the reader revealed on this screen. */
  hiddenMeanings: boolean;
  revealed: RevealedMeanings;
  onListenFrom: (ayah: number) => void;
  /** The Ayah's share button: opens its Share page. */
  onShare: (ayah: number) => void;
}

export const Ayah = memo(function Ayah({
  surah,
  ayah,
  language,
  recitedWord,
  cardRef,
  hiddenMeanings,
  revealed,
  onListenFrom,
  onShare,
  onOpenRoot,
  onOpenParticle,
  onTapWord,
}: AyahProps & WordActions) {
  const scales = useScales();
  const colors = useColors();
  return (
    <View style={[styles.ayah, { borderBottomColor: colors.line }, recitedWord !== null && { backgroundColor: colors.recitedAyah }]}>
      <View style={styles.head}>
        <Text style={[styles.ayahHead, { color: colors.accent, backgroundColor: colors.chip }]}>{STRINGS.ayah(ayah.number)}</Text>
        <ListenFrom number={ayah.number} onListenFrom={onListenFrom} colors={colors} />
        <ShareButton label={STRINGS.shareAyah(`${surah}:${ayah.number}`)} onPress={() => onShare(ayah.number)} />
      </View>
      <View style={styles.wordCards}>
        {ayah.wordCards.map((word) => (
          <WordCard
            key={word.location}
            word={word}
            recited={word.location === recitedWord}
            meaningShown={showsMeaning(hiddenMeanings, revealed, word.location)}
            cardRef={cardRef}
            onOpenRoot={onOpenRoot}
            onOpenParticle={onOpenParticle}
            onTapWord={onTapWord}
          />
        ))}
        <AyahEnd number={ayah.number} colors={colors} />
      </View>
      {ayah.translation !== null && (
        <Text style={[inLanguage(language, 15.5, scales.meaning), styles.translation, { color: colors.ink, textAlign: alignFor(language) }]}>
          {ayah.translation}
        </Text>
      )}
    </View>
  );
});

/** A Passage heading: the Passage title in the Language and its Ayah range, on a tinted band, with its share button. */
export function PassageHeadingBand({ surah, heading, language, onShare }: { surah: number; heading: PassageHeading; language: Language; onShare: () => void }) {
  const scales = useScales();
  const colors = useColors();
  const title = language === "ur" ? inLanguage("ur", 24, scales.meaning) : { fontSize: 24 * scales.meaning, fontWeight: "600" as const };
  return (
    <View accessibilityRole="header" style={[styles.passage, { backgroundColor: colors.tint }]}>
      <Text style={[title, styles.centred, { color: colors.accent }]}>{heading.title}</Text>
      <View style={styles.head}>
        <Text style={[styles.passageRange, { fontSize: 13 * scales.meaning, color: colors.muted }]}>{heading.range}</Text>
        <ShareButton label={STRINGS.sharePassage(`${surah}:${heading.range}`)} onPress={onShare} />
      </View>
    </View>
  );
}

/**
 * Each sign moved back to its disc's middle in each Script (#194, website:
 * surah.module.css .markSign's --sign-low and --sign-right): the Quran faces'
 * line box is not their ink, so a sign centred by its 17-point line box sits
 * low (ع furthest, its tail descending) and ع a little right. The faces are
 * the website's, and these are its offsets, measured there on the built site.
 */
const SIGN_CENTRED: Record<Script, Record<SectionMarkView["sign"], TextStyle>> = {
  uthmani: { "۞": { transform: [{ translateX: -0.5 }, { translateY: -2 }] }, ع: { transform: [{ translateX: -1.375 }, { translateY: -4.5 }] } },
  indopak: { "۞": { transform: [{ translateY: -3.25 }] }, ع: { transform: [{ translateX: -2.75 }, { translateY: -6.625 }] } },
};

/**
 * A Section mark (#194, website: surah.module.css .sectionMark): a rule across
 * the column with a pill medallion holding its sign, on an accent disc in the
 * reader's Quran font, and its label. Read out by its label alone; the sign is
 * hidden from screen readers.
 */
export function SectionMarkBand({ mark, script }: { mark: SectionMarkView; script: Script }) {
  const colors = useColors();
  const rule = [styles.markRule, { backgroundColor: colors.accent }];
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={mark.label} style={styles.mark}>
      <View style={rule} />
      <View style={[styles.medal, { borderColor: colors.accent }]}>
        <View style={[styles.markDisc, { backgroundColor: colors.accent }]}>
          <Text importantForAccessibility="no" style={[styles.markSign, SIGN_CENTRED[script][mark.sign], { fontFamily: TYPEFACE[script], color: colors.onAccent }]}>
            {mark.sign}
          </Text>
        </View>
        <Text style={[styles.markLabel, { color: colors.accent }]}>{mark.label}</Text>
      </View>
      <View style={rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 18, paddingBottom: 4 },
  markRule: { flex: 1, height: StyleSheet.hairlineWidth * 2, opacity: 0.45 },
  medal: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingLeft: 4, paddingRight: 12 },
  markDisc: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  markSign: { fontSize: 17, lineHeight: 17, textAlign: "center" },
  markLabel: { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.25 },
  ayah: { gap: 14, paddingTop: 22, paddingBottom: 26, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  listen: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  listenIcon: { fontSize: 10 },
  ayahHead: { alignSelf: "flex-start", fontSize: 12.5, fontWeight: "500", borderRadius: 999, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 2 },
  wordCards: { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "flex-start", rowGap: 6, columnGap: 4 },
  wordCard: { alignItems: "center", minWidth: 60, maxWidth: "100%", paddingHorizontal: 6, paddingTop: 5, paddingBottom: 7, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  centred: { textAlign: "center" },
  hiddenMeaning: { opacity: 0 },
  rootTag: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, marginTop: 4 },
  rootArrow: { fontSize: 11, opacity: 0.75, transform: [{ scaleX: -1 }] },
  end: { alignSelf: "center", width: 34, height: 34, marginHorizontal: 6, alignItems: "center", justifyContent: "center" },
  star: { position: "absolute", top: 6, left: 6, right: 6, bottom: 6, borderRadius: 3, borderWidth: 1.5, opacity: 0.55 },
  turned: { transform: [{ rotate: "45deg" }] },
  endNumber: { fontSize: 11, fontWeight: "600", fontVariant: ["tabular-nums"] },
  translation: { paddingHorizontal: 8 },
  passage: { marginTop: 22, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: "center", gap: 2 },
  passageRange: { fontWeight: "500", letterSpacing: 0.4 },
});
