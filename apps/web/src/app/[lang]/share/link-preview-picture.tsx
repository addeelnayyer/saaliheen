// A Share page's Link preview picture (#57), drawn with next/og on its first
// request and then cached: Saaliheen's frame (../link-preview-frame.tsx)
// holding the text link-preview.ts chooses, all in English, with no Quranic
// Arabic (ADR 0007).
//
// The opengraph-image and twitter-image files of both Share page routes
// re-export this module, so each Share page has its own picture address; its
// alt text comes from generateImageMetadata, which knows the address.

import { ImageResponse } from "next/og";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { FramedPicture, PICTURE_SIZE } from "../link-preview-frame";
import { PASSAGE_HEADINGS } from "../release";
import { pictureAlt, pictureText } from "./link-preview";
import type { ShareAddress } from "@saaliheen/share";
import { sharedAyahsOf } from "./shared-ayahs";

/** The Shared Ayahs an image route's address names, or undefined when the Share page is not found. */
const sharedOf = (params: ShareAddress) => sharedAyahsOf(params, PASSAGE_HEADINGS);

/** Whether `params` name every part a Share page's address must. */
const isWhole = (params?: Partial<ShareAddress>): params is ShareAddress =>
  (["lang", "surah", "ayahs", "script"] as const).every((part) => params?.[part]);

/**
 * The one picture of a Share page, with its alt text; none when the page is
 * not found, or when Neon cannot answer for its Passages, so the Share page
 * is still its error page rather than failing. At build time Next.js asks with
 * no address (no Share page is built ahead), and gets none: each picture is
 * drawn on its first request.
 */
export async function generateImageMetadata({ params }: { params?: Partial<ShareAddress> }) {
  const shared = isWhole(params) ? await orUnavailable(() => sharedOf(params)) : undefined;
  return shared && shared !== UNAVAILABLE ? [{ id: "preview", alt: pictureAlt(pictureText(shared)), size: PICTURE_SIZE, contentType: "image/png" }] : [];
}

export default async function Image({ params }: { params: Promise<ShareAddress> }) {
  const shared = await sharedOf(await params);
  if (!shared) return new Response("Not Found", { status: 404 });
  const { surahName, ayahs, passageTitle, translation } = pictureText(shared);
  return new ImageResponse(<FramedPicture head={{ label: `${surahName} · ${ayahs}`, title: passageTitle }} body={translation} />, PICTURE_SIZE);
}
