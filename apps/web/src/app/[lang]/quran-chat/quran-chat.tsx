"use client";

// Asking Quran Chat (#78, ADR 0057): signed in, the reader writes a question
// and the answer is shown as /api/v1/questions streams it, in the page's
// Language, each Ayah it cites a link to it on its Surah page, and the Tafsir
// credited beneath it when it cites an entry; a declined question shows why.
// Not signed in, the reader is asked to sign in. Fewer than five questions left
// today, the page says how many; with a Question limit reached (#80), it says
// which and when it resets, and offers no way to ask until then.
// Questions are asked in Conversations (#79): the first starts one, and each
// later one continues it, beneath the earlier ones, until the reader starts a
// New Conversation. The Account's Conversations are listed beneath, the one
// asked in most recently first, to reopen or delete, in any browser.

import Link from "next/link";
import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import { accountClient } from "@/account/client";
import type { Language } from "@/dataset/reader";
import {
  answerKept,
  answerParagraphs,
  answerParts,
  limitsNotice,
  QUESTION_CHARACTERS,
  readAnswerEvents,
  TAFSIR_CREDITS,
  type AnswerPart,
  type AnswerSoFar as Answer,
  type Conversation,
  type ConversationListed,
  type QuestionLimits,
} from "@saaliheen/quran-chat";
import { locationPath } from "../reading-place";
import { inLanguage, STRINGS } from "../strings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import styles from "./quran-chat.module.css";

/** A Conversation in the Account's list: its title on one line, cut short, the open one's in the accent. */
const CONVERSATION_TITLE =
  "block h-auto min-w-0 flex-1 cursor-pointer overflow-hidden rounded-[6px] px-2.5 py-2 text-start text-[length:inherit] font-normal leading-[inherit] text-ellipsis whitespace-nowrap text-foreground transition-none [unicode-bidi:plaintext] " +
  "hover:bg-transparent hover:text-foreground aria-[current=true]:font-semibold aria-[current=true]:text-primary";

export function QuranChat({ lang }: { lang: Language }) {
  const { data, isPending } = accountClient.useSession();
  if (isPending) return <p className={styles.lead}>{STRINGS.signingIn}</p>;
  if (!data) {
    return (
      <div className={styles.signIn}>
        <p>{STRINGS.quranChatNeedsAccount}</p>
        <Button asChild variant="filled" className="h-auto justify-self-start px-5 py-2 text-[14.5px] leading-[inherit]">
          <Link href={`/${lang}/sign-in`}>{STRINGS.signIn}</Link>
        </Button>
      </div>
    );
  }
  return <Asking lang={lang} />;
}

/** A question in the Conversation open, and its answer as it has arrived so far. */
interface QuestionShown {
  question: string;
  language: Language;
  answer: Answer;
}

/** The Conversation open: its id undefined until the first question starts it. */
interface OpenConversation {
  id?: string;
  questions: QuestionShown[];
}

/** `open` with its `n`th question's answer moved on by `next`. */
const withAnswer = (open: OpenConversation, n: number, next: (now: Answer) => Answer): OpenConversation => ({
  ...open,
  questions: open.questions.map((shown, i) => (i === n ? { ...shown, answer: next(shown.answer) } : shown)),
});

/** The Account's Conversations, the one asked in most recently first; "failed" when they cannot be had. */
async function accountConversations(): Promise<ConversationListed[] | "failed"> {
  try {
    const res = await fetch("/api/v1/conversations");
    if (!res.ok) throw new Error(`the Conversations answered ${res.status}`);
    return ((await res.json()) as { conversations: ConversationListed[] }).conversations;
  } catch {
    return "failed";
  }
}

/** What the page says of the Question limits: the limit reached and when it resets, or how few are left today. */
function limitsShown(limits: QuestionLimits | undefined) {
  const notice = limits && limitsNotice(limits);
  if (!notice) return undefined;
  return notice.reached
    ? { reached: notice.reached, text: STRINGS.limitReached(notice.reached, notice.limit, notice.resets), className: styles.limit }
    : { reached: undefined, text: STRINGS.questionsLeftToday(notice.left), className: styles.muted };
}

/** Read the signed-in Account's Question limits, and `show` them if they are read while `current` holds. */
async function readLimits(show: (limits: QuestionLimits) => void, current: () => boolean) {
  const res = await fetch("/api/v1/question-limits").catch(() => undefined);
  const read = res?.ok ? ((await res.json()) as QuestionLimits) : undefined;
  if (read && current()) show(read);
}

function Asking({ lang }: { lang: Language }) {
  const [question, setQuestion] = useState("");
  const [open, setOpen] = useState<OpenConversation>({ questions: [] });
  const [conversations, setConversations] = useState<ConversationListed[] | "failed">();
  /** A Conversation is being reopened: no question is asked until it is open, lest it go to the one before. */
  const [reopening, setReopening] = useState(false);
  /** The Conversation open was deleted, in another browser, as a question was asked in it. */
  const [gone, setGone] = useState(false);
  const [limits, setLimits] = useState<QuestionLimits>();
  const asking = useRef<AbortController>(undefined);
  useEffect(() => () => asking.current?.abort(), []);

  useEffect(() => {
    let mounted = true;
    void readLimits(setLimits, () => mounted);
    return () => {
      mounted = false;
    };
  }, []);

  /** List the Account's Conversations again; when they cannot be, keep any already listed. */
  const listed = (got: ConversationListed[] | "failed") => setConversations((now) => (got === "failed" && Array.isArray(now) ? now : got));
  const list = () => void accountConversations().then(listed);
  useEffect(() => {
    let current = true;
    void accountConversations().then((got) => current && setConversations(got));
    return () => {
      current = false;
    };
  }, []);

  /** Stop the answer being written, if one is, and open a new, empty Conversation. */
  const startNew = () => {
    asking.current?.abort();
    asking.current = undefined;
    setReopening(false);
    setGone(false);
    setOpen({ questions: [] });
  };

  const reopen = async (id: string) => {
    const controller = new AbortController();
    asking.current?.abort();
    asking.current = controller;
    setReopening(true);
    setGone(false);
    try {
      const res = await fetch(`/api/v1/conversations/${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`the Conversation answered ${res.status}`);
      const kept = (await res.json()) as Conversation;
      if (controller.signal.aborted) return;
      setOpen({ id, questions: kept.questions.map((q) => ({ question: q.question, language: q.language, answer: answerKept(q) })) });
    } catch {
      if (!controller.signal.aborted) list();
    } finally {
      if (asking.current === controller) {
        asking.current = undefined;
        setReopening(false);
      }
    }
  };

  const remove = async (id: string) => {
    if (open.id === id) startNew();
    const res = await fetch(`/api/v1/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
    if (res?.ok || res?.status === 404) {
      setConversations((now) => (Array.isArray(now) ? now.filter((c) => c.id !== id) : now));
      // Reopened while it was being deleted: it is gone all the same.
      setOpen((now) => (now.id === id ? { questions: [] } : now));
    }
  };

  const busy = open.questions.at(-1)?.answer.done === false;

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    const asked = question.trim();
    if (!asked || busy || reopening) return;
    setGone(false);
    asking.current?.abort();
    const controller = (asking.current = new AbortController());
    const n = open.questions.length;
    setOpen((now) => ({ ...now, questions: [...now.questions, { question: asked, language: lang, answer: { text: "", done: false } }] }));
    setQuestion("");
    const show = (next: (now: Answer) => Answer) => {
      if (!controller.signal.aborted) setOpen((now) => withAnswer(now, n, next));
    };
    try {
      const res = await fetch("/api/v1/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: asked, language: lang, ...(open.id && { conversation: open.id }) }),
        signal: controller.signal,
      });
      if (res.status === 404 && open.id) {
        // Deleted in another browser: the next question starts a new Conversation, and this one is asked again in it.
        if (controller.signal.aborted) return;
        startNew();
        setQuestion(asked);
        setGone(true);
        list();
        return;
      }
      // A limit reached: the question is not asked, and the limits read again say which.
      if (res.status === 429) {
        if (controller.signal.aborted) return;
        setOpen((now) => ({ ...now, questions: now.questions.slice(0, n) }));
        setQuestion(asked);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Quran Chat answered ${res.status}`);
      await readAnswerEvents(res.body, (e) => {
        if (e.type === "conversation") {
          if (!controller.signal.aborted) setOpen((now) => ({ ...now, id: e.id }));
        } else if (e.type === "text") show((now) => ({ ...now, text: now.text + e.text }));
        else if (e.type === "declined") show((now) => ({ ...now, declined: e.text }));
        else if (e.type === "error") show((now) => ({ ...now, failed: true }));
      });
      show((now) => ({ ...now, done: true }));
    } catch {
      show((now) => ({ ...now, failed: true, done: true }));
    } finally {
      void readLimits(setLimits, () => !controller.signal.aborted);
    }
    list();
  };

  const notice = limitsShown(limits);
  const reached = !!notice?.reached;
  return (
    <>
      {open.questions.length > 0 && (
        <ol className={styles.questions} aria-label={STRINGS.thisConversation}>
          {open.questions.map((shown, n) => (
            <li key={n} className={styles.shown}>
              <p className={styles.asked} {...inLanguage(shown.language)}>
                {shown.question}
              </p>
              <AnswerShown lang={shown.language} answer={shown.answer} />
            </li>
          ))}
        </ol>
      )}
      {gone && <p className={styles.muted}>{STRINGS.conversationGone}</p>}
      {/* Busy until the Question limits are read, which say whether a question may be asked. */}
      <form className={styles.ask} onSubmit={ask} aria-busy={limits === undefined}>
        <label className={styles.field}>
          {STRINGS.yourQuestion}
          <Textarea
            className="min-h-0 resize-y rounded-lg bg-card px-3 py-2.5 text-[length:inherit] font-normal leading-[inherit] text-foreground shadow-none transition-none disabled:cursor-default disabled:opacity-100 [&:lang(ur)]:font-[family-name:var(--f-ur)]"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={3}
            maxLength={QUESTION_CHARACTERS}
            disabled={reached}
            {...inLanguage(lang)}
          />
        </label>
        <Button
          variant="filled"
          className="h-auto justify-self-end px-[22px] py-2 text-[length:inherit] leading-[inherit] disabled:cursor-default disabled:opacity-55"
          type="submit"
          disabled={busy || reopening || reached || !question.trim()}
        >
          {busy ? STRINGS.asking : STRINGS.ask}
        </Button>
      </form>
      {notice && (
        <p className={notice.className} role="status">
          {notice.text}
        </p>
      )}
      <section className={styles.conversations} aria-labelledby="conversations">
        <div className={styles.conversationsHead}>
          <h2 id="conversations" className={styles.heading}>
            {STRINGS.conversations}
          </h2>
          <Button
            variant="ghost"
            className="h-auto cursor-pointer rounded-full border border-primary px-4 py-1.5 text-[14px] leading-[inherit] text-primary transition-none hover:bg-transparent hover:text-primary disabled:cursor-default disabled:opacity-55"
            onClick={() => startNew()}
            disabled={open.questions.length === 0}
          >
            {STRINGS.newConversation}
          </Button>
        </div>
        {conversations === "failed" ? (
          <p className={styles.error}>{STRINGS.conversationsFailed}</p>
        ) : conversations?.length === 0 ? (
          <p className={styles.muted}>{STRINGS.noConversations}</p>
        ) : (
          <ul className={styles.list}>
            {conversations?.map((c) => (
              <li key={c.id} className={styles.listed}>
                <Button
                  variant="ghost"
                  className={CONVERSATION_TITLE}
                  aria-current={c.id === open.id ? "true" : undefined}
                  onClick={() => void reopen(c.id)}
                >
                  {c.title}
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto cursor-pointer rounded-sm px-2.5 py-1.5 text-[18px] leading-none font-normal text-muted-foreground transition-none hover:bg-transparent hover:text-destructive"
                  aria-label={STRINGS.deleteConversation(c.title)}
                  onClick={() => void remove(c.id)}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** A citation as a link to its first Ayah on its Surah page. */
function Citation({ lang, part }: { lang: Language; part: Exclude<AnswerPart, { kind: "text" }> }) {
  return (
    <>
      (
      <Link className={styles.cite} href={locationPath(lang, `${part.surah}:${part.firstAyah}`)} prefetch={false} dir="ltr">
        {part.text}
      </Link>
      )
    </>
  );
}

/** Not shown again while the reader types their next question. */
const AnswerShown = memo(function AnswerShown({ lang, answer }: { lang: Language; answer: Answer }) {
  const parts = answerParts(answer.text);
  const shown = answerParagraphs(parts);
  const usesTafsir = !answer.declined && parts.some((part) => part.kind === "tafsir");
  return (
    <article className={styles.answer} aria-label={STRINGS.answer} aria-busy={!answer.done}>
      {answer.declined ? (
        <p className={styles.text} {...inLanguage(lang)}>
          {answer.declined}
        </p>
      ) : (
        shown.map((paragraph, n) => (
          <p key={n} className={styles.text} {...inLanguage(lang)}>
            {paragraph.map((part, i) => (part.kind === "text" ? part.text : <Citation key={i} lang={lang} part={part} />))}
          </p>
        ))
      )}
      {!answer.done && !answer.text && !answer.declined && <p className={styles.muted}>{STRINGS.asking}</p>}
      {answer.unanswered && <p className={styles.muted}>{STRINGS.noAnswerKept}</p>}
      {answer.failed && (
        <p className={styles.error} role="alert">
          {STRINGS.answerFailed}
        </p>
      )}
      {usesTafsir && <p className={styles.credit}>{TAFSIR_CREDITS[lang]}</p>}
    </article>
  );
});
