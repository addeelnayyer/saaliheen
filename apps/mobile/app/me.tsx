// The Me tab (#192): Sign in, this device's Reading places, Known words (#253,
// opening the Known words page, src/screens/known-words-page.tsx), the Language
// (moved here from the Settings sheet), the other reader settings, then
// Credits, Privacy and Terms, in the website's order and words. Sign in opens
// the device's Sign in with Google or Apple sheet inside the app (#75, docs/adr/0048);
// signed in, Me shows the Account's email with Sign out and Delete Account,
// which asks to confirm in the website's words. The documents open the
// website's pages in the reader's Language (docs/adr/0029). The Language is
// kept where the reader's choices are (src/language.ts), so every screen
// follows it at once.

import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { AppAccount, SignInMethod } from "../src/account";
import { dataOrigin } from "../src/config";
import { accountMessage, ACCOUNT_WORDS, me, type MeEntry, type MeReadingPlace, type MeScreen, type MeSetting } from "../src/destinations";
import { useReader } from "../src/reader";
import { KnownWordsPage } from "../src/screens/known-words-page";
import {
  AllahReferenceColourSwitch,
  AyahTranslationSwitch,
  HideWordMeaningsSwitch,
  KnownWordsColourSwitch,
  ScriptChoice,
  SectionMarksChoiceRow,
  Segmented,
  SizeRow,
} from "../src/screens/settings-sheet";
import { STRINGS, useColors } from "../src/theme";

/**
 * Me as it is now, read again whenever the tab comes into view or the Language
 * changes. The Surah index, for the Reading places' names, is read once.
 */
function useMeScreen(): MeScreen | null {
  const { analysis, account, readingPlaces, language } = useReader();
  const [screen, setScreen] = useState<MeScreen | null>(null);
  const [synced, setSynced] = useState(0);
  const index = useMemo(() => analysis.surahIndex().catch(() => []), [analysis]);
  // Signing in or out, deleting the Account and each sync change what Me shows.
  useEffect(() => account.subscribe(() => setSynced((n) => n + 1)), [account]);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      void index
        .then((surahs) => {
          const surahName = (n: number) => surahs.find((s) => s.number === n)?.nameLatin ?? `Surah ${n}`;
          return me({ origin: dataOrigin(), device: account.storage, readingPlaces, surahName, account });
        })
        .then((next) => current && setScreen(next));
      return () => {
        current = false;
      };
      // The Language is a dependency so the website entries follow it.
    }, [index, account, readingPlaces, language, synced]),
  );
  return screen;
}

/** Shows what Me says after `action` ended as `outcome`, if anything. */
function tell(action: "signIn" | "deleteAccount", outcome: string) {
  const message = accountMessage(action, outcome);
  if (message) Alert.alert(message);
}

/** One button of the Account's entries. */
function AccountButton({ label, onPress, destructive = false }: { label: string; onPress: () => void; destructive?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, { borderColor: colors.line }]}>
      <Text style={[styles.rowText, { color: destructive ? colors.accent : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** Signed out: Sign in with Google, then with Apple, each opening the device's sheet. */
function SignIn({ entry }: { entry: Extract<MeEntry, { kind: "sign-in" }> }) {
  const { account } = useReader();
  const signIn = (method: SignInMethod) => void account.signIn(method).then((outcome) => tell("signIn", outcome));
  return (
    <Section label={entry.label}>
      {entry.methods.map(({ method, label }) => (
        <AccountButton key={method} label={label} onPress={() => signIn(method)} />
      ))}
    </Section>
  );
}

/** Asks to confirm deleting the Account, in the website's words, and deletes it if confirmed. */
function confirmDeleting(account: AppAccount, label: string) {
  Alert.alert(ACCOUNT_WORDS.deleteAccountTitle, ACCOUNT_WORDS.deleteAccountWarning, [
    { text: ACCOUNT_WORDS.cancel, style: "cancel" },
    { text: label, style: "destructive", onPress: () => void account.deleteAccount().then((outcome) => tell("deleteAccount", outcome)) },
  ]);
}

/** Signed in: who as, Sign out and Delete Account. */
function SignedIn({ entry }: { entry: Extract<MeEntry, { kind: "account" }> }) {
  const { account } = useReader();
  const colors = useColors();
  const [signOut, deleteAccount] = entry.actions;
  return (
    <Section label={entry.label}>
      <Text style={[styles.rowText, { color: colors.ink }]}>{`${ACCOUNT_WORDS.signedInAs} ${entry.signedInAs}`}</Text>
      <AccountButton label={signOut} onPress={() => void account.signOut()} />
      <AccountButton label={deleteAccount} destructive onPress={() => confirmDeleting(account, deleteAccount)} />
    </Section>
  );
}

/** One row that opens something: a website page or a Reading place. */
function OpenRow({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={[styles.row, { borderColor: colors.line }]}>
      <Text style={[styles.rowText, { color: colors.ink }]}>{label}</Text>
      <Text style={{ color: colors.muted }}>›</Text>
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.muted }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const openPlace = ({ surah }: MeReadingPlace) => router.navigate({ pathname: "/surah/[number]", params: { number: String(surah) } });

function ReadingPlaces({ entry }: { entry: Extract<MeEntry, { kind: "reading-places" }> }) {
  return (
    <Section label={entry.label}>
      {entry.places.map((place) => (
        <OpenRow key={place.surah} label={place.label} onPress={() => openPlace(place)} />
      ))}
    </Section>
  );
}

/** The row opening the Known words page. */
function KnownWords({ entry }: { entry: Extract<MeEntry, { kind: "known-words" }> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <OpenRow label={entry.label} onPress={() => setOpen(true)} />
      {open && <KnownWordsPage onClose={() => setOpen(false)} />}
    </>
  );
}

function LanguageChoice({ entry }: { entry: Extract<MeEntry, { kind: "language" }> }) {
  const { language, setLanguage } = useReader();
  return <Segmented label={entry.label} options={entry.choices} value={language} onChange={setLanguage} />;
}

/** Each setting's control. */
const SETTING: Record<MeSetting, () => ReactNode> = {
  script: () => <ScriptChoice />,
  translation: () => <AyahTranslationSwitch />,
  allahReferenceColour: () => <AllahReferenceColourSwitch />,
  knownWordsColour: () => <KnownWordsColourSwitch />,
  hideWordMeanings: () => <HideWordMeaningsSwitch />,
  arabicSize: () => <SizeRow setting="arabicSize" label={STRINGS.arabicSize} />,
  meaningSize: () => <SizeRow setting="meaningSize" label={STRINGS.meaningSize} />,
  sectionMarks: () => <SectionMarksChoiceRow />,
};

/** A row opening the website's page for `entry`. */
const openOnWebsite = (entry: { label: string; opens: string }) => (
  <OpenRow label={entry.label} onPress={() => void Linking.openURL(entry.opens)} />
);

/** One of Me's entries, drawn by its kind. */
const ENTRY: { [K in MeEntry["kind"]]: (entry: Extract<MeEntry, { kind: K }>) => ReactNode } = {
  "sign-in": (entry) => <SignIn entry={entry} />,
  account: (entry) => <SignedIn entry={entry} />,
  "reading-places": (entry) => <ReadingPlaces entry={entry} />,
  "known-words": (entry) => <KnownWords entry={entry} />,
  language: (entry) => <LanguageChoice entry={entry} />,
  setting: (entry) => SETTING[entry.setting](),
  document: openOnWebsite,
};

const drawEntry = (entry: MeEntry) => (ENTRY[entry.kind] as (e: MeEntry) => ReactNode)(entry);

export default function Me() {
  const screen = useMeScreen();
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {screen?.entries.map((entry) => (
        <View key={entry.label}>{drawEntry(entry)}</View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 18 },
  section: { gap: 4 },
  heading: { fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { fontSize: 15 },
});
