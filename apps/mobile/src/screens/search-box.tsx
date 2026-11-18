// A search box on the tint (website: the index's and the Known words page's
// search): the Surah index's one search over its tabs, and the Known words
// page's Roots tab search (#253).

import { StyleSheet, TextInput } from "react-native";
import { useColors } from "../theme";

export function SearchBox({ query, onChange, placeholder, label }: { query: string; onChange: (query: string) => void; placeholder: string; label: string }) {
  const colors = useColors();
  return (
    <TextInput
      value={query}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      accessibilityLabel={label}
      accessibilityRole="search"
      autoCorrect={false}
      autoCapitalize="none"
      clearButtonMode="while-editing"
      returnKeyType="search"
      style={[styles.search, { backgroundColor: colors.tint, color: colors.ink }]}
    />
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, fontSize: 15 },
});
