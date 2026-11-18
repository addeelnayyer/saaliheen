// Sign out of the admin area (#67): POST /admin/sign-out signs the browser's
// Account out through Better Auth's own sign-out, then sends the browser to
// /admin, which, signed out, is the Sign-in page's Admin entry.

import { getAuth } from "@/account/auth";
import { AUTH_BASE_PATH } from "@/account/settings";

export async function POST(request: Request) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  const signOut = new Request(new URL(`${AUTH_BASE_PATH}/sign-out`, request.url), { method: "POST", headers, body: "{}" });
  const signedOut = await getAuth().handler(signOut);
  const res = new Response(null, { status: 303, headers: { location: "/admin" } });
  for (const cookie of signedOut.headers.getSetCookie()) res.headers.append("set-cookie", cookie);
  return res;
}
