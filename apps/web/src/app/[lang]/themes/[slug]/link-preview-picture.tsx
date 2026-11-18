// A Theme page's Link preview picture (#132), drawn with next/og in
// Saaliheen's frame (../../link-preview-frame.tsx): the Theme's number of
// Ayahs and its English name, on both Languages' Theme pages, with no Arabic
// (ADR 0007). The page's opengraph-image and twitter-image files re-export
// this module, so each Theme page has its own picture address; its alt text
// comes from generateImageMetadata, which knows the address. The Theme is read
// from Neon (#170), never at build (ADR 0026): Next.js asks generateImageMetadata
// at build for a Language alone, with no slug, and it answers no picture then.
// Each picture is drawn on its first request and then cached.

import { ImageResponse } from "next/og";
import { findTheme } from "@/themes/on-pages";
import { orUnavailable, UNAVAILABLE } from "@/themes/unavailable";
import { FramedPicture, PICTURE_SIZE } from "../../link-preview-frame";
import { pictureAlt, pictureHead } from "./link-preview";

/**
 * The one picture of a Theme page, with its alt text; none when the address
 * names no Theme, as at build, or when Neon cannot answer, so the Theme page
 * is still its error page rather than failing (src/themes/unavailable.ts).
 */
export async function generateImageMetadata({ params }: { params?: { slug?: string } }) {
  const slug = params?.slug;
  const theme = slug ? await orUnavailable(() => findTheme(slug)) : undefined;
  return theme && theme !== UNAVAILABLE ? [{ id: "preview", alt: pictureAlt(theme), size: PICTURE_SIZE, contentType: "image/png" }] : [];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const theme = await findTheme((await params).slug);
  if (!theme) return new Response("Not Found", { status: 404 });
  return new ImageResponse(<FramedPicture head={pictureHead(theme)} />, PICTURE_SIZE);
}
