// An Iltifat direction page's Link preview picture (#144), drawn with next/og
// in Saaliheen's frame (../../link-preview-frame.tsx): the direction's number
// of Iltifat, its name and its one-line description, the same on both
// Languages' pages, with no Arabic (ADR 0007). The page's opengraph-image and
// twitter-image files re-export this module, so each direction page has its
// own picture address; its alt text comes from generateImageMetadata, which
// knows the address. At build, Next.js asks it for the pictures of a Language
// alone, with no direction: it gives none then, so the build reads no Neon.

import { ImageResponse } from "next/og";
import { isIltifatDirection } from "@/iltifat/iltifat";
import { FramedPicture, PICTURE_SIZE } from "../../link-preview-frame";
import { readDirectionPreview } from "../link-preview";

/** The one picture of a direction page, with its alt text; none when the address names no Iltifat direction. */
export async function generateImageMetadata({ params }: { params?: { direction?: string } }) {
  const direction = params?.direction;
  if (!direction || !isIltifatDirection(direction)) return [];
  const { alt } = await readDirectionPreview(direction);
  return [{ id: "preview", alt, size: PICTURE_SIZE, contentType: "image/png" }];
}

export default async function Image({ params }: { params: Promise<{ direction: string }> }) {
  const { direction } = await params;
  if (!isIltifatDirection(direction)) return new Response("Not Found", { status: 404 });
  const { head, body } = await readDirectionPreview(direction);
  return new ImageResponse(<FramedPicture head={head} body={body} />, PICTURE_SIZE);
}
