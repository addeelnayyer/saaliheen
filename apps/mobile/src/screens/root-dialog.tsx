// The Root dialog (website: root-dialog.tsx, root-dialog.module.css): a centred
// sheet over a scrim, its head — the Root's letters and transliteration, and
// Memorized? (#253), which marks the Root as a Known Root or unmarks it — pinned
// while its counts and Lemmas scroll beneath. Each Lemma opens to its Spellings
// in the chosen Script, with meanings in the Language and their Word locations,
// each of which goes to that Word. It opens on the tapped Word (#323): its
// Lemma, Spelling and Word location tinted, the Lemma open at first and tinted
// still when closed, and its Spelling scrolled into view once, when the Root's
// file arrives.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { Language, RootDialog as Root, RootDialogLemma, RootDialogMark, RootDialogSpelling, SpellingMark } from "../quran-analysis";
import { useReader, useScales } from "../reader";
import { KNOWN_WORDS_WORDS, rootKey } from "../known-words";
import { inLanguage, quranText, STRINGS, useColors, type Colors } from "../theme";
import { CloseButton } from "./close-button";
import type { RootTag } from "./ayah";
import { Loaded, useLoaded } from "./loaded";
import { SwitchRow } from "./settings-sheet";

interface Props {
  tag: RootTag;
  /** The tapped Word's location, whose Lemma, Spelling and Word location the dialog marks (#323). */
  word?: string;
  onClose: () => void;
  /** Goes to the Word at a Word location ("18:83:2"). */
  onGoTo: (location: string) => void;
}

/** Where a view is in the scrolling content, top to bottom. */
interface Span {
  top: number;
  bottom: number;
}

const spanIn = (content: View, view: View) =>
  new Promise<Span>((resolve, reject) => view.measureLayout(content, (_x, y, _width, height) => resolve({ top: y, bottom: y + height }), reject));

/**
 * Where to scroll a view `height` tall, still at the top, to bring the marked
 * Spelling into it: nowhere while it is in view, else just far enough to show
 * its bottom, which keeps its Lemma row in view too when both fit; a Spelling
 * taller than the view shows from its top, or lower still if the marked Word
 * location is below.
 */
function scrollTargetFor(height: number, spelling: Span, location: Span) {
  if (spelling.bottom <= height) return null;
  if (spelling.bottom - spelling.top <= height) return spelling.bottom - height;
  return Math.max(spelling.top, location.bottom - height);
}

/** Called with the marked Spelling's view and its marked Word location's once they are laid out. */
type OnMarkLaidOut = (spelling: View, location: View) => void;

/** What a Spelling holding the tapped Word tells once laid out; nothing outside a Root or Particle dialog. */
const MarkLaidOut = createContext<OnMarkLaidOut | undefined>(undefined);

/**
 * A Root or Particle dialog's scrolling body, which scrolls the marked
 * Spelling into view once both it and the scroll view are laid out, whichever
 * comes second, and never again for this dialog (#323, #326).
 */
export function MarkedScrollView({ onScroll, children }: { onScroll: (offset: number) => void; children: ReactNode }) {
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const viewHeight = useRef(0);
  const mark = useRef<[spelling: View, location: View] | null>(null);
  const broughtIntoView = useRef(false);
  const bringMarkIntoView = useCallback(async () => {
    if (broughtIntoView.current || !mark.current || !content.current || !viewHeight.current) return;
    broughtIntoView.current = true;
    const [spelling, location] = await Promise.all(mark.current.map((view) => spanIn(content.current!, view)));
    const y = scrollTargetFor(viewHeight.current, spelling, location);
    if (y !== null) scroll.current?.scrollTo({ y, animated: false });
  }, []);
  const onMarkLaidOut = useCallback<OnMarkLaidOut>(
    (spelling, location) => {
      mark.current = [spelling, location];
      void bringMarkIntoView();
    },
    [bringMarkIntoView],
  );
  return (
    <ScrollView
      ref={scroll}
      style={styles.scroll}
      onLayout={(e) => {
        viewHeight.current = e.nativeEvent.layout.height;
        void bringMarkIntoView();
      }}
      onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={64}
    >
      <View ref={content} style={styles.body}>
        <MarkLaidOut.Provider value={onMarkLaidOut}>{children}</MarkLaidOut.Provider>
      </View>
    </ScrollView>
  );
}

/** The tint of the tapped Word's Lemma row and Spelling. */
const markedLook = (colors: Colors) => [styles.marked, { backgroundColor: colors.rootWord }];

export function RootDialog({ tag, word, onClose, onGoTo }: Props) {
  const { analysis, script, language, known, markKnown } = useReader();
  const scales = useScales();
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const load = useCallback(() => analysis.rootDialog(tag.id, { script, language, word }), [analysis, tag.id, script, language, word]);
  const loaded = useLoaded(load);
  const [scrolled, setScrolled] = useState(false);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={STRINGS.close} />
        <View style={[styles.sheet, { width: Math.min(600, width - 32), maxHeight: Math.min(height * 0.82, 760), backgroundColor: colors.paper }]}>
          <View style={[styles.head, { borderBottomColor: scrolled ? colors.line : "transparent" }]}>
            <View style={styles.headRow}>
              <Text style={[styles.label, { color: colors.muted }]}>{STRINGS.rootLabel}</Text>
              <CloseButton onClose={onClose} />
            </View>
            <View style={styles.headRow}>
              <Text style={[styles.translit, { color: colors.muted }]}>{loaded.value?.transliteration ?? ""}</Text>
              <Text accessibilityRole="header" style={[quranText(script, 44, scales.arabic), styles.letters, { color: colors.accent }]}>
                {tag.letters}
              </Text>
            </View>
            <SwitchRow label={KNOWN_WORDS_WORDS.memorized} value={known(rootKey(tag.letters))} onChange={(on) => markKnown(rootKey(tag.letters), on)} />
          </View>
          <Loaded loaded={loaded}>
            {(root) => (
              <MarkedScrollView onScroll={(y) => setScrolled(y > 0)}>
                <RootBody root={root} language={language} onGoTo={onGoTo} />
              </MarkedScrollView>
            )}
          </Loaded>
        </View>
      </View>
    </Modal>
  );
}

function RootBody({ root, language, onGoTo }: { root: Root; language: Language; onGoTo: (location: string) => void }) {
  const colors = useColors();
  return (
    <>
      <Text style={[styles.stat, { backgroundColor: colors.tint, color: colors.ink }]}>{STRINGS.rootCounts(root.occurrences, root.uniqueWords)}</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{STRINGS.lemmasTitle}</Text>
      {root.lemmas.map((lemma, i) => (
        <LemmaRow key={`${lemma.text ?? "none"}-${i}`} lemma={lemma} marked={root.marked?.lemma === i ? root.marked : null} language={language} onGoTo={onGoTo} />
      ))}
    </>
  );
}

/** A Lemma, its count and representative meaning; pressed, its Spellings. Tinted, open or closed, when it is the tapped Word's (`marked`). */
function LemmaRow({
  lemma,
  marked,
  language,
  onGoTo,
}: {
  lemma: RootDialogLemma;
  marked: RootDialogMark | null;
  language: Language;
  onGoTo: (location: string) => void;
}) {
  const { script } = useReader();
  const scales = useScales();
  const colors = useColors();
  const [open, setOpen] = useState(lemma.openAtFirst);
  return (
    <View style={[styles.lemma, { borderBottomColor: colors.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={marked ? STRINGS.thisWordsLemma : undefined}
        onPress={() => setOpen(!open)}
        style={[styles.row, marked && markedLook(colors)]}
      >
        <Text style={[styles.chevron, { color: colors.muted }, open && styles.flipped]}>▾</Text>
        <View style={styles.meanColumn}>
          <Text style={[inLanguage(language, 14, scales.meaning, 1), { color: colors.ink }]}>{lemma.meaning || STRINGS.noMeaning}</Text>
          <Text style={[styles.count, { color: colors.accent, backgroundColor: colors.chip }]}>{STRINGS.times(lemma.occurrences)}</Text>
        </View>
        <Text style={[quranText(script, 24, scales.arabic), styles.arabic, { color: colors.ink }]}>{lemma.text ?? STRINGS.noLemma}</Text>
      </Pressable>
      {open && (
        <View style={[styles.spellings, { borderLeftColor: colors.chip }]}>
          <SpellingList spellings={lemma.spellings} marked={marked} language={language} onGoTo={onGoTo} />
        </View>
      )}
    </View>
  );
}

/** A Lemma's Spellings, or a particle's (#255), the one holding the tapped Word marked at its Word location. */
export function SpellingList({
  spellings,
  marked,
  language,
  onGoTo,
}: {
  spellings: RootDialogSpelling[];
  marked: SpellingMark | null;
  language: Language;
  onGoTo: (location: string) => void;
}) {
  return spellings.map((spelling, i) => (
    <SpellingItem
      key={spelling.locations[0]}
      spelling={spelling}
      marked={marked?.spelling === i ? marked.location : undefined}
      language={language}
      onGoTo={onGoTo}
    />
  ));
}

/**
 * A Spelling in the chosen Script, its meaning, and a link to each of its Word
 * locations; the Particle dialog's too (#255). When it holds the tapped Word,
 * at Word location `marked`, it and that location are tinted (#323, #326), and
 * the dialog's MarkLaidOut hears where they are once laid out.
 */
function SpellingItem({
  spelling,
  marked,
  language,
  onGoTo,
}: {
  spelling: RootDialogSpelling;
  marked?: string;
  language: Language;
  onGoTo: (location: string) => void;
}) {
  const { script } = useReader();
  const scales = useScales();
  const colors = useColors();
  const view = useRef<View>(null);
  const markedLocation = useRef<View>(null);
  const onMarkLaidOut = useContext(MarkLaidOut);
  return (
    <View ref={view} style={[styles.spelling, marked && markedLook(colors)]}>
      <View style={styles.spellingRow}>
        <Text style={[inLanguage(language, 14, scales.meaning, 1), styles.meanColumn, { color: colors.ink }]}>{spelling.meaning || STRINGS.noMeaning}</Text>
        <Text style={[quranText(script, 22, scales.arabic), styles.arabic, { color: colors.ink }]}>{spelling.text}</Text>
      </View>
      <View style={styles.refs}>
        {spelling.locations.map((location) => {
          const here = location === marked;
          return (
            <Pressable
              key={location}
              ref={here ? markedLocation : undefined}
              accessibilityRole="link"
              accessibilityState={here ? { selected: true } : undefined}
              onPress={() => onGoTo(location)}
              onLayout={here ? () => view.current && markedLocation.current && onMarkLaidOut?.(view.current, markedLocation.current) : undefined}
              style={[styles.ref, { borderColor: colors.line }, here && { backgroundColor: colors.rootWord }]}
            >
              <Text style={[styles.refText, { color: colors.accent }]}>{location}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheet: { borderRadius: 22, overflow: "hidden", minHeight: 200 },
  head: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 13 },
  translit: { fontSize: 15, flexShrink: 1 },
  letters: { textAlign: "right" },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: 14, paddingBottom: 20, paddingTop: 10, gap: 14 },
  stat: { fontSize: 14, borderRadius: 12, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 4 },
  title: { fontWeight: "600", fontSize: 15, marginTop: 4 },
  lemma: { borderBottomWidth: StyleSheet.hairlineWidth },
  marked: { borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, paddingHorizontal: 2 },
  chevron: { fontSize: 12 },
  flipped: { transform: [{ rotate: "180deg" }] },
  meanColumn: { flex: 1, alignItems: "flex-start", gap: 2, textAlign: "left" },
  count: { fontSize: 12.5, borderRadius: 999, overflow: "hidden", paddingHorizontal: 9, fontVariant: ["tabular-nums"] },
  arabic: { textAlign: "right", maxWidth: "50%" },
  spellings: { paddingLeft: 8, paddingTop: 2, paddingBottom: 10, marginBottom: 8, borderLeftWidth: 2 },
  spelling: { paddingVertical: 4, paddingHorizontal: 2, gap: 2 },
  spellingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  refs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ref: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8 },
  refText: { fontSize: 12.5, lineHeight: 20, fontVariant: ["tabular-nums"] },
});
