// The Settings sheet (website: settings-drawer.tsx, reader-settings.tsx):
// Arabic script, the Ayah translation switch, the Allah reference colour
// switch (#151), the Known words colour switch (#253), the Hide Word meanings switch (#247), and Arabic size and Meaning size
// with Smaller, Larger and Reset sizes, and Section marks (#194). The Language is chosen in Me (#192),
// which shows these same settings with the controls exported here.

import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Script, SectionMarksChoice, SizeSetting } from "../quran-analysis";
import { useReader } from "../reader";
import { inLanguage, STRINGS, useColors, type Colors } from "../theme";
import { CloseButton } from "./close-button";

/** A row of choices, the chosen one filled with the accent. */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <View accessibilityRole="radiogroup" style={[styles.segments, { backgroundColor: colors.tint }]}>
        {options.map(([option, name]) => {
          const chosen = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              onPress={() => onChange(option)}
              style={[styles.segment, chosen && { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.segmentText, option === "ur" && styles.urdu, { color: chosen ? colors.onAccent : colors.ink }]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepButton({ label, glyph, enabled, onPress, colors }: { label: string; glyph: string; enabled: boolean; onPress: () => void; colors: Colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.step, { backgroundColor: colors.chip, opacity: enabled ? 1 : 0.4 }]}
    >
      <Text style={[styles.stepText, { color: colors.accent }]}>{glyph}</Text>
    </Pressable>
  );
}

/** One size: its name, Smaller, its percent and Larger. */
export function SizeRow({ setting, label }: { setting: SizeSetting; label: string }) {
  const { sizes, limits, changeSize } = useReader();
  const colors = useColors();
  return (
    <View style={[styles.field, styles.sizeRow]}>
      <Text style={[styles.sizeLabel, { color: colors.ink }]}>{label}</Text>
      <StepButton label={STRINGS.smaller} glyph="A−" enabled={limits[setting].smaller} onPress={() => changeSize(setting, "smaller")} colors={colors} />
      <Text style={[styles.percent, { color: colors.ink }]}>{STRINGS.percent(sizes[setting])}</Text>
      <StepButton label={STRINGS.larger} glyph="A+" enabled={limits[setting].larger} onPress={() => changeSize(setting, "larger")} colors={colors} />
    </View>
  );
}

const SCRIPTS: [Script, string][] = [
  ["uthmani", STRINGS.uthmani],
  ["indopak", STRINGS.indopak],
];

/** The Arabic script choice. */
export function ScriptChoice() {
  const { script, setScript } = useReader();
  return <Segmented label={STRINGS.scriptLabel} options={SCRIPTS} value={script} onChange={setScript} />;
}

const SECTION_MARKS: [SectionMarksChoice, string][] = [
  ["hizb", STRINGS.hizbQuarters],
  ["ruku", STRINGS.rukus],
];

/** The Section marks choice (#194): Hizb quarters or Rukus, kept on this device only. */
export function SectionMarksChoiceRow() {
  const { sectionMarks, setSectionMarks } = useReader();
  return <Segmented label={STRINGS.sectionMarks} options={SECTION_MARKS} value={sectionMarks} onChange={setSectionMarks} />;
}

/** The Ayah translation switch. */
export function AyahTranslationSwitch() {
  const { ayahTranslation, setAyahTranslation } = useReader();
  return <SwitchRow label={STRINGS.translation} value={ayahTranslation} onChange={setAyahTranslation} />;
}

/** The Allah reference colour switch (#151): on by default, kept on the device. */
export function AllahReferenceColourSwitch() {
  const { allahReferenceColour, setAllahReferenceColour } = useReader();
  return <SwitchRow label={STRINGS.allahReferenceColour} value={allahReferenceColour} onChange={setAllahReferenceColour} />;
}

/** The Known words colour switch (#253): off by default, kept on the device, never synced. */
export function KnownWordsColourSwitch() {
  const { knownWordsColour, setKnownWordsColour } = useReader();
  return <SwitchRow label={STRINGS.knownWordsColour} value={knownWordsColour} onChange={setKnownWordsColour} />;
}

/** The Hide Word meanings switch (#247): off by default, kept on the device, never synced. */
export function HideWordMeaningsSwitch() {
  const { hideWordMeanings, setHideWordMeanings } = useReader();
  return <SwitchRow label={STRINGS.hideWordMeanings} value={hideWordMeanings} onChange={setHideWordMeanings} />;
}

/** A labelled on/off switch. */
export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (on: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.field, styles.switchRow]}>
      <Text style={[styles.sizeLabel, { color: colors.ink }]}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const reader = useReader();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={STRINGS.close} />
        <View style={[styles.sheet, { backgroundColor: colors.paper, paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{STRINGS.settings}</Text>
            <CloseButton onClose={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <ScriptChoice />
            <AyahTranslationSwitch />
            <AllahReferenceColourSwitch />
            <KnownWordsColourSwitch />
            <HideWordMeaningsSwitch />
            <SizeRow setting="arabicSize" label={STRINGS.arabicSize} />
            <SizeRow setting="meaningSize" label={STRINGS.meaningSize} />
            <Pressable accessibilityRole="button" onPress={reader.resetSizes} style={[styles.reset, { backgroundColor: colors.tint }]}>
              <Text style={{ color: colors.accent }}>{STRINGS.resetSizes}</Text>
            </Pressable>
            <SectionMarksChoiceRow />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "85%", paddingTop: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: "600" },
  body: { padding: 16, gap: 18 },
  field: { gap: 6 },
  label: { fontSize: 13 },
  segments: { flexDirection: "row", borderRadius: 999, padding: 3 },
  segment: { flex: 1, alignItems: "center", borderRadius: 999, paddingVertical: 6 },
  segmentText: { fontSize: 14 },
  urdu: inLanguage("ur", 15, 1),
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sizeRow: { flexDirection: "row", alignItems: "center" },
  sizeLabel: { flex: 1, fontSize: 15 },
  step: { width: 40, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 14, fontWeight: "600" },
  percent: { width: 56, textAlign: "center", fontSize: 14, fontVariant: ["tabular-nums"] },
  settingsButton: { paddingHorizontal: 6, paddingVertical: 2 },
  settingsGlyph: { fontSize: 17, fontWeight: "600" },
  reset: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
});

/** The header's Settings button and the Settings sheet it opens. */
export function SettingsButton() {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={STRINGS.settings} onPress={() => setOpen(true)} hitSlop={8} style={styles.settingsButton}>
        <Text style={[styles.settingsGlyph, { color: colors.accent }]}>Aa</Text>
      </Pressable>
      {open && <SettingsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
