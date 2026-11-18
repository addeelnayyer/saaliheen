// What the Supplication editor's Speakers (#202) send and read: POST
// /api/v1/supplications/speakers, and PUT and DELETE
// /api/v1/supplications/speakers/{id}, each against the version the Speaker
// was opened at but for an add.

import type { SpeakerFields } from "@/supplications/speaker-save";
import type { Speaker } from "@/supplications/supplications";
import { sendRequest, UNREACHABLE } from "../../save-request";

export type { SpeakerFields };

export const NEW_SPEAKER: SpeakerFields = { nameEn: "", nameUr: "", includesProphet: false };

export const fieldsOfSpeaker = ({ nameEn, nameUr, includesProphet }: Speaker): SpeakerFields => ({ nameEn, nameUr, includesProphet });

/** Whether `edited` differs from `saved`. */
export const speakerChanged = (edited: SpeakerFields, saved: SpeakerFields) =>
  edited.nameEn !== saved.nameEn || edited.nameUr !== saved.nameUr || edited.includesProphet !== saved.includesProphet;

/** What a Speaker's add, save or delete answered: the Speaker, the latest one with the sentence to show, or the sentence alone. */
export type SpeakerAnswered = { speaker: Speaker } | { error: string; latest?: Speaker };

async function sent(method: "PUT" | "POST" | "DELETE", path: string, body: unknown, passed: number): Promise<SpeakerAnswered> {
  const answer = await sendRequest(method, path, JSON.stringify(body));
  if (!answer) return { error: UNREACHABLE };
  const { speaker, error } = (answer.body ?? {}) as { speaker?: Speaker; error?: string };
  if (answer.status === passed && speaker) return { speaker };
  if (answer.status === 409 && speaker && error) return { error, latest: speaker };
  return { error: error ?? UNREACHABLE };
}

/** Add a Speaker of `fields`. */
export const sendSpeakerAdd = (fields: SpeakerFields) => sent("POST", "/api/v1/supplications/speakers", fields, 201);

/** Save `fields` of Speaker `id` against version `base`. */
export const sendSpeakerSave = (id: string, fields: SpeakerFields, base: number) =>
  sent("PUT", `/api/v1/supplications/speakers/${id}`, { ...fields, base }, 200);

/** Delete Speaker `id` against version `base`: true when it passed, or what it answered. */
export async function sendSpeakerDelete(id: string, base: number): Promise<true | Exclude<SpeakerAnswered, { speaker: Speaker }>> {
  const answer = await sendRequest("DELETE", `/api/v1/supplications/speakers/${id}`, JSON.stringify({ base }));
  if (answer?.status === 204) return true;
  const { speaker, error } = (answer?.body ?? {}) as { speaker?: Speaker; error?: string };
  return { error: error ?? UNREACHABLE, latest: answer?.status === 409 ? speaker : undefined };
}
