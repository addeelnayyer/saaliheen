// What the Supplication editor (#201, #202, #271) holds while an Admin edits:
// the fields as chosen, its spans as marked on the Word cards among them, the
// state last saved, and what PUT and DELETE
// /api/v1/supplications/{id} and POST /api/v1/supplications are sent and
// answer.

import type { Opening, Supplication, SupplicationKind, SupplicationSpan } from "@/supplications/supplications";
import { OTHER_WORDS_LABEL, STRINGS } from "../../../[lang]/strings";
import { ayahNumber, putSave, sendRequest, UNREACHABLE } from "../../save-request";

/** Each Opening as the editor names it, as the Supplications page's chips do. */
export const OPENING_LABEL: Record<Opening, string> = { rabbana: STRINGS.rabbana, rabbi: STRINGS.rabbi, other: STRINGS.otherOpening };

/** A kind as the editor names it: "Supplication", or the label of one of the Other words to Allah. */
export const kindLabel = (kind: SupplicationKind) => (kind === "supplication" ? "Supplication" : OTHER_WORDS_LABEL[kind]);

/** The editable fields as the form holds them: the run's Ayahs as typed. */
export interface Fields {
  speakerId: string;
  openings: Opening[];
  kind: SupplicationKind;
  ayahFrom: string;
  ayahTo: string;
  /** Its Supplication spans (#271), marked on the Word cards, in reading order. */
  spans: SupplicationSpan[];
}

/** `supplication`'s editable state as the form's fields. */
export const fieldsOf = ({ speakerId, openings, kind, ayahFrom, ayahTo, spans }: Supplication): Fields => ({
  speakerId,
  openings,
  kind,
  ayahFrom: String(ayahFrom),
  ayahTo: String(ayahTo),
  spans,
});

/** `openings` with `opening` taken out when it is in, or else put in. */
export const toggledOpening = (openings: Opening[], opening: Opening): Opening[] =>
  openings.includes(opening) ? openings.filter((o) => o !== opening) : [...openings, opening];

/** A span as the editor writes it, "7:23:1–7:23:2"; its one Word when it is one. */
export const spanText = ({ from, to }: SupplicationSpan) => (from === to ? from : `${from}–${to}`);

/** Whether `edited` differs from `saved`; the Openings in any order are the same Openings. */
export const changed = (edited: Fields, saved: Fields) =>
  JSON.stringify({ ...edited, openings: edited.openings.toSorted() }) !== JSON.stringify({ ...saved, openings: saved.openings.toSorted() });

/** `fields` in Surah `surah`, as a save or an add sends them. */
const sent = (surah: number, fields: Fields) => ({
  surah,
  ayahFrom: ayahNumber(fields.ayahFrom),
  ayahTo: ayahNumber(fields.ayahTo),
  speakerId: fields.speakerId,
  openings: fields.openings,
  kind: fields.kind,
  spans: fields.spans,
});

/** Where a save stands: refused for being made against an older version, with the latest Supplication beside the Admin's choices. */
export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "deleted" }
  | { kind: "refused"; error: string }
  | { kind: "stale"; error: string; latest: Supplication };

/** What a save's answer says: the saved Supplication, the latest one with the sentence to show, or the sentence alone. */
export type Answered = { supplication: Supplication } | { error: string; latest?: Supplication };

/** A save's answer, `status` and `body`, as the editor reads it; one that passed answers `passed`. */
function answered(status: number, body: unknown, passed = 200): Answered {
  const { supplication, error } = (body ?? {}) as { supplication?: Supplication; error?: string };
  if (status === passed && supplication) return { supplication };
  if (status === 409 && supplication && error) return { error, latest: supplication };
  return { error: error ?? UNREACHABLE };
}

/** Send a save of `fields` for Supplication `supplication`, against version `base`; what it answered. */
export async function sendSave({ id, surah }: Supplication, fields: Fields, base: number): Promise<Answered> {
  const answer = await putSave(`/api/v1/supplications/${id}`, JSON.stringify({ base, ...sent(surah, fields) }));
  return answer ? answered(answer.status, answer.body) : { error: UNREACHABLE };
}

/** The fields of a Supplication not yet added, in no Surah yet: its Openings and kind as most are, and no spans, marked once it has Word cards. */
export const NEW_FIELDS: Fields = { speakerId: "", openings: [], kind: "supplication", ayahFrom: "", ayahTo: "", spans: [] };

/** Send an add of `fields` in Surah `surah`; what it answered. */
export async function sendAdd(surah: number, fields: Fields): Promise<Answered> {
  const answer = await sendRequest("POST", "/api/v1/supplications", JSON.stringify(sent(surah, fields)));
  return answer ? answered(answer.status, answer.body, 201) : { error: UNREACHABLE };
}

/** Send a delete of Supplication `id` against version `base`: true when it passed, or what it answered. */
export async function sendDelete({ id }: Supplication, base: number): Promise<true | Exclude<Answered, { supplication: Supplication }>> {
  const answer = await sendRequest("DELETE", `/api/v1/supplications/${id}`, JSON.stringify({ base }));
  if (answer?.status === 204) return true;
  const { supplication, error } = (answer?.body ?? {}) as { supplication?: Supplication; error?: string };
  return { error: error ?? UNREACHABLE, latest: answer?.status === 409 ? supplication : undefined };
}
