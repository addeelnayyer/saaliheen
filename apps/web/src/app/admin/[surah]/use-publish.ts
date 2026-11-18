"use client";

// The one Publish of the Passage editor (#45, #100, #153, #171): sends the
// Admin's Passage and Phrase edits, made on the Surah's Passage version, and
// their Allah reference changes, made on the version of its Allah references,
// to POST /api/v1/passages/{surah}, which writes them all to Neon in one
// transaction, and says how it went. The editor's Surah is Neon's as this hook
// last knew it: after a Publish, the published Surah; after "Someone published
// first", the latest, on whose versions no Unpublished changes are kept (the
// outdated ones stay set aside under the old versions).

import { useState } from "react";
import type { Edit } from "@/admin/passage-edits";
import type { PublishedSurah } from "@/passages/publish";

/** How a Publish went: written; refused as made on an older version; refused, and why; or it never reached the server. */
export type PublishResult = { kind: "published" } | { kind: "stale" } | { kind: "refused"; error: string } | { kind: "unreached" };

/** What the bar says of the last Publish; null before any. */
export type Feedback = PublishResult | null;

/** What the endpoint answers: a Surah, or a refusal and, on a clash, the latest Surah. */
interface Answered extends Partial<PublishedSurah> {
  error?: string;
  latest?: PublishedSurah;
}

/** The Surah an answer carries, its Allah references as the editor keeps them. */
const surahOf = (body: PublishedSurah): PublishedSurah => ({
  version: body.version,
  passages: body.passages,
  phrases: body.phrases,
  allahReferences: { version: body.allahReferences.version, locations: body.allahReferences.locations },
});

/** A Publish's result, and the Surah it leaves the editor knowing when it changes it. */
interface Sent {
  result: PublishResult;
  known?: PublishedSurah;
}

/** What an answer with `status` and `body` gives. */
function resultOf(status: number, body: Answered): Sent {
  if (status === 200) return { result: { kind: "published" }, known: surahOf(body as PublishedSurah) };
  if (status === 409 && body.latest) return { result: { kind: "stale" }, known: surahOf(body.latest) };
  return { result: { kind: "refused", error: body.error ?? `the server answered ${status}.` } };
}

/** What a Publish sends: the Passage and Phrase edits and the Allah reference changes, each made on `known`. */
const bodyOf = (known: PublishedSurah, edits: Edit[], taps: string[]) => ({
  base: known.version,
  edits,
  ...(taps.length ? { allahReferences: { base: known.allahReferences.version, changes: taps } } : {}),
});

/** Publish `edits` and `taps` to Surah `surah`, made on `known`; whatever goes wrong, a result to show, never a throw. */
async function sent(surah: number, known: PublishedSurah, edits: Edit[], taps: string[]): Promise<Sent> {
  try {
    const res = await fetch(`/api/v1/passages/${surah}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodyOf(known, edits, taps)),
    });
    return resultOf(res.status, (await res.json().catch(() => ({}))) as Answered);
  } catch {
    return { result: { kind: "unreached" } };
  }
}

/** Surah `surah` as Neon held it when last known, starting from `opened`, and the one Publish for changes made on it. */
export function usePublish(surah: number, opened: PublishedSurah) {
  const [latest, setLatest] = useState(opened);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [publishing, setPublishing] = useState(false);

  /** Publish `edits` and `taps`; `clear` drops them from the browser once they are written. */
  const publish = async (edits: Edit[], taps: string[], clear: () => void) => {
    setPublishing(true);
    setFeedback(null);
    const { result, known } = await sent(surah, latest, edits, taps);
    if (result.kind === "published") clear();
    if (known) setLatest(known);
    setFeedback(result);
    setPublishing(false);
  };
  return { latest, feedback, publishing, publish };
}
