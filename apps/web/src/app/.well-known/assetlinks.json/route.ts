// /.well-known/assetlinks.json (#76, ADR 0048): the app Android lets handle
// the site's links, from ANDROID_SHA256 as it is set when the request comes,
// never as it was at build.

import { connection } from "next/server";
import { assetLinks } from "@/app-links";

export async function GET() {
  await connection();
  return Response.json(assetLinks(process.env.ANDROID_SHA256));
}
