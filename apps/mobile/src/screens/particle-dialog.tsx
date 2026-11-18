// The Particle dialog (#255, website: particle-dialog.tsx), opened from a Word
// card's Particle tag as the Root dialog is from a Root tag: a centred sheet
// over a scrim, its head — a "Particle" label, the particle in the chosen
// Script and Memorized?, which marks it as a Known particle by its kind and
// text — pinned while its occurrence count and its Spellings, most frequent
// first, scroll beneath. Each Spelling is in the chosen Script with its meaning
// in the Language and its Word locations, each of which goes to that Word. It
// opens on the tapped Word (#326): its Spelling and Word location tinted, as
// the Root dialog's are, and its Spelling scrolled into view once, when the
// particle file arrives. The particle file is kept with the Surah, so the
// dialog opens with no connection.

import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { KNOWN_WORDS_WORDS, particleKey } from "../known-words";
import { useReader, useScales } from "../reader";
import { quranText, STRINGS, useColors } from "../theme";
import type { ParticleTag } from "./ayah";
import { CloseButton } from "./close-button";
import { Loaded, useLoaded } from "./loaded";
import { MarkedScrollView, SpellingList } from "./root-dialog";
import { SwitchRow } from "./settings-sheet";

interface Props {
  tag: ParticleTag;
  /** The tapped Word's location, whose Spelling and Word location the dialog marks (#326). */
  word?: string;
  onClose: () => void;
  /** Goes to the Word at a Word location ("1:5:3"). */
  onGoTo: (location: string) => void;
}

export function ParticleDialog({ tag, word, onClose, onGoTo }: Props) {
  const { analysis, script, language, known, markKnown } = useReader();
  const scales = useScales();
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const load = useCallback(() => analysis.particleDialog(tag.id, { script, language, word }), [analysis, tag.id, script, language, word]);
  const loaded = useLoaded(load);
  const [scrolled, setScrolled] = useState(false);
  const key = particleKey(tag);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={STRINGS.close} />
        <View style={[styles.sheet, { width: Math.min(600, width - 32), maxHeight: Math.min(height * 0.82, 760), backgroundColor: colors.paper }]}>
          <View style={[styles.head, { borderBottomColor: scrolled ? colors.line : "transparent" }]}>
            <View style={styles.headRow}>
              <Text style={[styles.label, { color: colors.muted }]}>{STRINGS.particleLabel}</Text>
              <CloseButton onClose={onClose} />
            </View>
            <Text accessibilityRole="header" style={[quranText(script, 44, scales.arabic), styles.particle, { color: colors.accent }]}>
              {tag.arabic}
            </Text>
            <SwitchRow label={KNOWN_WORDS_WORDS.memorized} value={known(key)} onChange={(on) => markKnown(key, on)} />
          </View>
          <Loaded loaded={loaded}>
            {(particle) => (
              <MarkedScrollView onScroll={(y) => setScrolled(y > 0)}>
                <Text style={[styles.stat, { backgroundColor: colors.tint, color: colors.ink }]}>{STRINGS.particleCount(particle.occurrences)}</Text>
                <Text style={[styles.title, { color: colors.ink }]}>{STRINGS.spellingsTitle}</Text>
                <SpellingList spellings={particle.spellings} marked={particle.marked} language={language} onGoTo={onGoTo} />
              </MarkedScrollView>
            )}
          </Loaded>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheet: { borderRadius: 22, overflow: "hidden", minHeight: 200 },
  head: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 13 },
  particle: { textAlign: "right" },
  stat: { fontSize: 14, borderRadius: 12, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 4 },
  title: { fontWeight: "600", fontSize: 15, marginTop: 4 },
});
