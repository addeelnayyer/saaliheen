// /.well-known/apple-app-site-association (#76, ADR 0048): which of the site's
// links iOS opens in the app, from APPLE_TEAM_ID as it is set when the request
// comes, never as it was at build. JSON, with no redirect, as iOS requires.

import { connection } from "next/server";
import { appleAppSiteAssociation } from "@/app-links";

export async function GET() {
  await connection();
  return Response.json(appleAppSiteAssociation(process.env.APPLE_TEAM_ID));
}
