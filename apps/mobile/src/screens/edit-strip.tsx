// The edit strip (#76; website: share/edit-strip.tsx): the sharer's controls
// over a Share page opened from inside the app. Its lists choose the Surah,
// the from Ayah and the to Ayah, offering only allowed Shared Ayahs
// (src/share.ts), and for a run its Share layouts choose Ayah by Ayah or
// Flowing. Each choice opens that Share page in place, keeping the Language
// and Script.

import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { chipRowOffset, EDIT_STRIP_CHIP, type EditStrip as Strip, type SharePage, type ShareLayout } from "../share";
import { STRINGS, useColors } from "../theme";
import { Segmented } from "./settings-sheet";

/** One choice of a list: its value and what its chip says. */
interface Choice {
  n: number;
  text: string;
}

const CHIP_GAP = EDIT_STRIP_CHIP.gap;

interface ChoiceRowProps {
  label: string;
  value: number;
  choices: Choice[];
  choose: (n: number) => void;
  width: number;
}

/**
 * A labelled, sideways-scrolling row of chips, the chosen one filled with the
 * accent and kept wholly in view. It scrolls once it knows its own length:
 * scrolled before, FlatList takes the row as 0 long and leaves the chosen
 * chip half past the row's start.
 */
function ChoiceRow({ label, value, choices, choose, width }: ChoiceRowProps) {
  const colors = useColors();
  const list = useRef<FlatList<Choice>>(null);
  const [rowLength, setRowLength] = useState(0);
  const at = Math.max(0, choices.findIndex((c) => c.n === value));
  const offset = chipRowOffset(at, choices.length, width, rowLength);
  useEffect(() => {
    if (rowLength > 0) list.current?.scrollToOffset({ offset, animated: false });
  }, [offset, rowLength]);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <FlatList
        ref={list}
        horizontal
        data={choices}
        keyExtractor={(c) => String(c.n)}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onLayout={(e) => setRowLength(e.nativeEvent.layout.width)}
        renderItem={({ item }) => <Chip choice={item} chosen={item.n === value} choose={choose} width={width} />}
      />
    </View>
  );
}

function Chip({ choice, chosen, choose, width }: { choice: Choice; chosen: boolean; choose: (n: number) => void; width: number }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      onPress={() => choose(choice.n)}
      style={[styles.chip, { width: width - CHIP_GAP, backgroundColor: chosen ? colors.accent : colors.chip }]}
    >
      <Text numberOfLines={1} style={[styles.chipText, { color: chosen ? colors.onAccent : colors.ink }]}>
        {choice.text}
      </Text>
    </Pressable>
  );
}

const numbered = (ns: number[]) => ns.map((n) => ({ n, text: String(n) }));

/** The edit strip over a Share page; `open` shows the Share page each choice leads to. */
export function EditStrip({ strip, layout, open }: { strip: Strip; layout: ShareLayout | null; open: (next: Promise<SharePage>) => void }) {
  const colors = useColors();
  const surahs = strip.surahs.map((s) => ({ n: s.number, text: `${s.number}. ${s.nameLatin}` }));
  return (
    <View accessibilityRole="toolbar" accessibilityLabel={STRINGS.chooseAyahsToShare} style={[styles.strip, { borderBottomColor: colors.line }]}>
      <ChoiceRow label={STRINGS.surah} value={strip.surah} choices={surahs} choose={(n) => open(strip.chooseSurah(n))} width={EDIT_STRIP_CHIP.surah} />
      <ChoiceRow label={STRINGS.fromAyah} value={strip.from} choices={numbered(strip.fromAyahs)} choose={(n) => open(strip.chooseFrom(n))} width={EDIT_STRIP_CHIP.ayah} />
      <ChoiceRow label={STRINGS.toAyah} value={strip.to} choices={numbered(strip.toAyahs)} choose={(n) => open(strip.chooseTo(n))} width={EDIT_STRIP_CHIP.ayah} />
      {strip.layouts.length > 0 && (
        <Segmented
          label={STRINGS.shareLayout}
          options={[
            ["ayah-by-ayah", STRINGS.ayahByAyah],
            ["flowing", STRINGS.flowing],
          ]}
          value={layout ?? "ayah-by-ayah"}
          onChange={(l) => open(strip.chooseLayout(l))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  field: { gap: 4 },
  label: { fontSize: 12.5, fontWeight: "600", letterSpacing: 0.25 },
  chip: { marginRight: CHIP_GAP, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 8, alignItems: "center" },
  chipText: { fontSize: 13, fontVariant: ["tabular-nums"] },
});
