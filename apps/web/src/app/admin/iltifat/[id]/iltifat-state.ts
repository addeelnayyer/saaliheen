// What the Iltifat editor (#142) holds while an Admin edits: the fields as
// typed, the state last saved, and what PUT /api/v1/iltifat/{id} is sent and
// answers.

import type { Iltifat } from "@/iltifat/iltifat";
import { inReadingOrder, type MarkedWord, type Side } from "@/iltifat/marked-words";
import { ayahNumber, putSave, UNREACHABLE } from "../../save-request";

/** The editable fields as the form holds them: the run's Ayahs as typed. */
export interface Fields {
  reason: string;
  ayahFrom: string;
  ayahTo: string;
  disputed: boolean;
  /** Its Marked Words (#143), sent back with every save. */
  markedWords: MarkedWord[];
}

/** `iltifat`'s editable state as the form's fields. */
export const fieldsOf = ({ reason, ayahFrom, ayahTo, disputed, markedWords }: Iltifat): Fields => ({
  reason,
  ayahFrom: String(ayahFrom),
  ayahTo: String(ayahTo),
  disputed,
  markedWords,
});

/** `words` with the Word at `location` taken out when it is marked, on either side, or else marked on `side`; in reading order. */
export function toggledMark(words: MarkedWord[], location: string, side: Side): MarkedWord[] {
  const kept = words.filter((w) => w.location !== location);
  return kept.length < words.length ? kept : inReadingOrder([...words, { location, side }]);
}

/** Whether `edited` differs from `saved`. */
export const changed = (edited: Fields, saved: Fields) => JSON.stringify(edited) !== JSON.stringify(saved);

/** The body of a save of `fields` against version `base`. */
const saveBody = (fields: Fields, base: number) =>
  JSON.stringify({
    base,
    reason: fields.reason,
    ayahFrom: ayahNumber(fields.ayahFrom),
    ayahTo: ayahNumber(fields.ayahTo),
    disputed: fields.disputed,
    markedWords: fields.markedWords,
  });

/** Where a save stands. */
export type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "refused"; error: string };

/** What a save's answer says: the saved Iltifat, or the sentence to show. */
type Answered = { iltifat: Iltifat } | { error: string };

/** A save's answer, `status` and `body`, as the editor reads it. */
function answered(status: number, body: unknown): Answered {
  const { iltifat, error } = (body ?? {}) as { iltifat?: Iltifat; error?: string };
  if (status === 200 && iltifat) return { iltifat };
  return { error: error ?? UNREACHABLE };
}

/** Send a save of Iltifat `id`; what it answered. */
export async function sendSave(id: number, fields: Fields, base: number): Promise<Answered> {
  const answer = await putSave(`/api/v1/iltifat/${id}`, saveBody(fields, base));
  return answer ? answered(answer.status, answer.body) : { error: UNREACHABLE };
}
