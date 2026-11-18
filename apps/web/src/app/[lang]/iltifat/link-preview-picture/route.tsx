// The Iltifat overview's Link preview picture (#144), drawn with next/og in
// Saaliheen's frame (../../link-preview-frame.tsx): the number of Iltifat that
// are not Disputed, "Iltifat" and what an Iltifat is, the same in both
// Languages, with no Arabic (ADR 0007). The overview's metadata (../page.tsx)
// points both its Open Graph and its Twitter card picture here, with the alt
// text. It is a Route Handler, not an opengraph-image file as a direction
// page's: that file's alt text would come from generateImageMetadata, which
// Next.js also runs at build for each Language, when Neon may be out of
// reach. Drawn on each request, after connection(), so never at build.

import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { LANGUAGES } from "@/dataset/reader";
import { FramedPicture, PICTURE_SIZE } from "../../link-preview-frame";
import { readOverviewPreview } from "../link-preview";

export async function GET(_request: Request, { params }: RouteContext<"/[lang]/iltifat/link-preview-picture">) {
  const { lang } = await params;
  if (!(LANGUAGES as readonly string[]).includes(lang)) return new Response("Not Found", { status: 404 });
  await connection();
  const { head, body } = await readOverviewPreview();
  return new ImageResponse(<FramedPicture head={head} body={body} />, PICTURE_SIZE);
}
