// Quran Chat's screen (#81), opened from Explore's card: what Quran Chat
// (src/quran-chat.ts) holds, laid out as the website's Quran Chat page lays it
// out. The Conversation open, each question over its answer, a citation opening
// its Ayah in Read as a look-up; then the question field and Ask, what the
// Question limits say, and the Account's Conversations with New Conversation,
// each reopened by its title or deleted. Signed out, it asks the reader to sign
// in, on Me. Questions are asked in the reader's Language.

import { QUESTION_CHARACTERS } from "@saaliheen/quran-chat";
import { router } from "expo-router";
import { memo, useEffect, useState, useSyncExternalStore } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { citationOpens, openQuranChat, QURAN_CHAT_WORDS as WORDS, type Citation, type QuestionShown, type QuranChat, type QuranChatState } from "../../src/quran-chat";
import { useReader, useScales } from "../../src/reader";
import { alignFor as align, inLanguage, useColors } from "../../src/theme";

/** Opens `citation`'s Surah in Read at its first Ayah, as a look-up. */
function openCitation(citation: Citation) {
  const { surah, word } = citationOpens(citation);
  router.navigate({ pathname: "/surah/[number]", params: { number: String(surah), word } });
}

/** Quran Chat while this screen is open, closed as it leaves; undefined until it is opened. */
function useQuranChat(): QuranChat | undefined {
  const { account } = useReader();
  const [chat, setChat] = useState<QuranChat>();
  useEffect(() => {
    const opened = openQuranChat({ account });
    setChat(opened);
    return () => opened.close();
  }, [account]);
  return chat;
}

/** A question of the Conversation open, then its answer: its paragraphs, each citation a link, and what is said beneath it. Made again only as its own answer changes. */
const QuestionAndAnswer = memo(function QuestionAndAnswer({ shown }: { shown: QuestionShown }) {
  const colors = useColors();
  const scales = useScales();
  const { question, language, answer } = shown;
  const text = [inLanguage(language, 16, scales.meaning), { color: colors.ink, textAlign: align(language) }];
  return (
    <View style={styles.shown}>
      <Text style={[inLanguage(language, 16, scales.meaning), styles.asked, { color: colors.ink, backgroundColor: colors.chip, textAlign: align(language) }]}>
        {question}
      </Text>
      <View accessibilityLabel={WORDS.answer} accessibilityState={{ busy: answer.answering }} style={styles.answer}>
        {answer.paragraphs.map((paragraph, p) => (
          <Text key={p} style={text}>
            {paragraph.map((part, i) =>
              part.kind === "text" ? (
                part.text
              ) : (
                <Text key={i}>
                  (
                  <Text accessibilityRole="link" onPress={() => openCitation(part)} style={[styles.cite, { color: colors.accent }]}>
                    {part.text}
                  </Text>
                  )
                </Text>
              ),
            )}
          </Text>
        ))}
        {answer.says && <Text style={[styles.small, { color: colors.muted }]}>{answer.says}</Text>}
        {answer.credit && <Text style={[styles.credit, { color: colors.muted, textAlign: align(language) }]}>{answer.credit}</Text>}
      </View>
    </View>
  );
});

/** A button in the website's words: filled for Ask, outlined otherwise. */
function Button({ label, onPress, disabled = false, filled = false, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; filled?: boolean; accessibilityLabel?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, filled ? { backgroundColor: colors.accent } : { borderColor: colors.line, borderWidth: 1 }, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, { color: filled ? colors.paper : colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

/** Signed in: the Conversation open, the question field, the Question limits, and the Conversations. */
function Asking({ chat, state }: { chat: QuranChat; state: QuranChatState }) {
  const colors = useColors();
  const { language } = useReader();
  const [question, setQuestion] = useState("");

  const ask = () => {
    setQuestion("");
    void chat.ask(question, language).then((outcome) => {
      // Given back to ask again, unless the reader has typed another since.
      if (typeof outcome === "object") setQuestion((typed) => typed || outcome.givenBack);
    });
  };

  return (
    <>
      {state.questions.length > 0 && (
        <View accessibilityLabel={WORDS.thisConversation} style={styles.questions}>
          {state.questions.map((shown, n) => (
            <QuestionAndAnswer key={n} shown={shown} />
          ))}
        </View>
      )}
      {state.gone && <Text style={[styles.small, { color: colors.muted }]}>{state.gone}</Text>}
      <TextInput
        accessibilityLabel={WORDS.yourQuestion}
        placeholder={WORDS.yourQuestion}
        placeholderTextColor={colors.muted}
        value={question}
        onChangeText={setQuestion}
        multiline
        maxLength={QUESTION_CHARACTERS}
        editable={!state.notice?.reached}
        style={[inLanguage(language, 16, 1), styles.field, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.tint, textAlign: align(language) }]}
      />
      <Button label={state.busy ? WORDS.asking : WORDS.ask} filled disabled={!state.canAsk || !question.trim()} onPress={ask} />
      {state.notice && (
        <Text accessibilityLiveRegion="polite" style={[styles.small, { color: state.notice.reached ? colors.accent : colors.muted }]}>
          {state.notice.text}
        </Text>
      )}
      <View style={styles.conversationsHead}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.ink }]}>
          {WORDS.conversations}
        </Text>
        <Button label={WORDS.newConversation} disabled={state.questions.length === 0} onPress={() => chat.startNew()} />
      </View>
      {state.conversationsSay && <Text style={[styles.small, { color: colors.muted }]}>{state.conversationsSay}</Text>}
      {state.conversations?.map((c) => (
        <View key={c.id} style={[styles.listed, { borderColor: colors.line }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: c.id === state.conversationId }}
            onPress={() => void chat.reopen(c.id)}
            style={styles.title}
          >
            <Text style={[styles.titleText, { color: c.id === state.conversationId ? colors.accent : colors.ink }]} numberOfLines={2}>
              {c.title}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={WORDS.deleteConversation(c.title)} hitSlop={8} onPress={() => void chat.remove(c.id)}>
            <Text style={[styles.delete, { color: colors.muted }]}>×</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}

export default function QuranChatScreen() {
  const colors = useColors();
  const chat = useQuranChat();
  const state = useSyncExternalStore(
    (listener) => chat?.subscribe(listener) ?? (() => {}),
    () => chat?.state(),
  );
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lead, { color: colors.muted }]}>{WORDS.lead}</Text>
        {state?.signedIn === false && (
          <>
            <Text style={[styles.lead, { color: colors.ink }]}>{WORDS.needsAccount}</Text>
            <Button label={WORDS.signIn} filled onPress={() => router.navigate("/me")} />
          </>
        )}
        {chat && state?.signedIn && <Asking chat={chat} state={state} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { padding: 16, gap: 12 },
  lead: { fontSize: 15, lineHeight: 21 },
  questions: { gap: 20 },
  shown: { gap: 8 },
  asked: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  answer: { gap: 10 },
  cite: { fontWeight: "600" },
  small: { fontSize: 13, lineHeight: 18 },
  credit: { fontSize: 11.5, fontStyle: "italic" },
  field: { minHeight: 88, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: "top" },
  button: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.45 },
  conversationsHead: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { fontSize: 17, fontWeight: "600" },
  listed: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  title: { flex: 1 },
  titleText: { fontSize: 15 },
  delete: { fontSize: 22, paddingHorizontal: 4 },
});
