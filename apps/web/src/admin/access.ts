// Who is asking for an admin page (#42, #67), from their Account's session and
// the Admin allow-list: a visitor who isn't signed in, a signed-in person who
// isn't an Admin, or an Admin. Admin is decided here on every request from the
// Account's verified email, never kept from the moment they signed in. Reading
// the session makes every admin page render on demand.

import { headers } from "next/headers";
import { getAuth } from "@/account/auth";
import { isAdmin } from "./settings";

export type Access =
  | { kind: "visitor" }
  | { kind: "not-an-admin"; email: string }
  | { kind: "admin"; id: string; email: string; name?: string };

/** Who a request with `asked` headers is from: an admin page's, or an Admin-only /api/v1 endpoint's (#142). */
export async function accessOf(asked: Headers): Promise<Access> {
  const session = await getAuth().api.getSession({ headers: asked });
  const account = session?.user;
  if (!account) return { kind: "visitor" };
  if (!account.emailVerified || !isAdmin(account.email)) return { kind: "not-an-admin", email: account.email };
  return { kind: "admin", id: account.id, email: account.email, name: account.name || undefined };
}

export async function currentAccess(): Promise<Access> {
  // The request's headers first: they make the page render on demand, so the build never makes Better Auth.
  return accessOf(await headers());
}
