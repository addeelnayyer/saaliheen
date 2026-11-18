// Quran Chat's answer as it is written and read (#78, ADR 0057), shared by the
// website's server that asks Claude (apps/web/src/quran-chat/answer.ts), its
// page that shows the answer, and the mobile app's Quran Chat screen (#81): the events an answer streams as, the marker Claude
// answers alone with when it declines, what a declined question is told, and
// the citations an answer's text holds. Claude cites an Ayah as [18:83], a run
// of Ayahs as [18:83–84], and a Tafsir entry as [Tafsir 18:83–84].

import { written, type Language } from "@saaliheen/passages";

/**
 * One line of a streamed answer, as newline-delimited JSON: first the
 * Conversation it is asked in (#79), then its text as it arrives, a decline,
 * its end, or what stopped it.
 */
export type AnswerEvent =
  | { type: "conversation"; id: string }
  | { type: "text"; text: string }
  | { type: "declined"; text: string }
  | { type: "end" }
  | { type: "error"; error: string };

/** What Claude answers, alone, to a question asking for a ruling or a sectarian judgement. */
export const DECLINED_MARKER = "[declined]";

/** What a declined question is told, in each Language: Quran Chat gives no rulings, a Scholar does. */
export const DECLINED: Record<Language, string> = {
  en: "Quran Chat does not give rulings or judge between schools of thought. Please ask a Scholar you trust.",
  ur: "قرآن چیٹ شرعی احکام نہیں بتاتا اور نہ مسالک کے درمیان فیصلہ کرتا ہے۔ براہِ کرم کسی ایسے عالم سے پوچھیے جن پر آپ کو اعتماد ہو۔",
};

/** The line crediting each Language's edition of al-Mukhtasar wherever its Tafsir is shown: beneath a Passage's Tafsir, and beneath an answer citing it. */
export const TAFSIR_CREDITS: Record<Language, string> = {
  en: "Tafsir: al-Mukhtasar fi Tafsir al-Quran al-Karim, by the Tafsir Center for Quranic Studies, English edition (QUL)",
  ur: "Tafsir: al-Mukhtasar fi Tafsir al-Quran al-Karim, by the Tafsir Center for Quranic Studies, Urdu edition (mokhtasr.com)",
};

/** A piece of an answer's text: words, or a citation of an Ayah (or run of Ayahs) or of a Tafsir entry. */
export type AnswerPart =
  | { kind: "text"; text: string }
  | { kind: "ayah" | "tafsir"; surah: number; firstAyah: number; lastAyah: number; text: string };

/** The longest question Quran Chat takes, in characters. */
export const QUESTION_CHARACTERS = 2_000;

/** A citation, as Claude writes it: an optional "Tafsir ", then surah:ayah, then an optional en dash or hyphen and last Ayah. */
const CITATION = /\[(Tafsir )?(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?\]/g;

/** Ayahs `first` to `last` of Surah `surah` as they are cited: `18:83`, or `18:83–84` for a run. */
const ayahsCited = (surah: number, first: number, last: number) => `${surah}:${written({ from: first, till: Math.max(first, last) })}`;

/** A source as Claude is told to cite it, and as its citation is shown: `18:83–84`, or `Tafsir 18:83–84`. */
export const cite = (tafsir: boolean, surah: number, first: number, last: number) => `${tafsir ? "Tafsir " : ""}${ayahsCited(surah, first, last)}`;

/** Whether a citation names an Ayah there could be: a Surah of the 114, an Ayah from 1. */
const couldBe = (surah: number, firstAyah: number) => surah >= 1 && surah <= 114 && firstAyah >= 1;

/**
 * `text` as the parts it is read as: words between citations, and each
 * citation. A `[` still open at its end is a citation still arriving, left out
 * until it closes; a citation of a Surah or Ayah there cannot be is words.
 */
export function answerParts(text: string): AnswerPart[] {
  const open = text.lastIndexOf("[");
  const whole = open >= 0 && !text.includes("]", open) ? text.slice(0, open) : text;
  const parts: AnswerPart[] = [];
  let at = 0;
  for (const match of whole.matchAll(CITATION)) {
    const [surah, firstAyah] = [Number(match[2]), Number(match[3])];
    if (!couldBe(surah, firstAyah)) continue;
    if (match.index > at) parts.push({ kind: "text", text: whole.slice(at, match.index) });
    const lastAyah = Math.max(Number(match[4] ?? firstAyah), firstAyah);
    const tafsir = match[1] !== undefined;
    parts.push({ kind: tafsir ? "tafsir" : "ayah", surah, firstAyah, lastAyah, text: cite(tafsir, surah, firstAyah, lastAyah) });
    at = match.index + match[0].length;
  }
  if (at < whole.length) parts.push({ kind: "text", text: whole.slice(at) });
  return parts;
}

/** `parts` as paragraphs, split at the blank lines in their words; a paragraph of only spaces is left out. */
export function answerParagraphs(parts: AnswerPart[]): AnswerPart[][] {
  const paragraphs: AnswerPart[][] = [[]];
  for (const part of parts) {
    if (part.kind !== "text") paragraphs.at(-1)!.push(part);
    else
      part.text.split(/\n\s*\n/).forEach((text, n) => {
        if (n > 0) paragraphs.push([]);
        paragraphs.at(-1)!.push({ kind: "text", text });
      });
  }
  return paragraphs.filter((paragraph) => paragraph.some((part) => part.kind !== "text" || part.text.trim()));
}
