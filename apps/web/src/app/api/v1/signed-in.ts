// Who a /api/v1 request is from (#70, ADR 0008): the Account signed in by the
// website's session cookie or the mobile app's bearer token.

import { getAuth } from "@/account/auth";
import { apiError } from "./respond";

/** The signed-in Account's id, from the session cookie or the bearer token. */
export async function signedInAccount(request: Request): Promise<string | undefined> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user.id;
}

/** The answer to a request from no signed-in Account. */
export const notSignedIn = () => apiError(401, "not signed in: send the session cookie or a bearer token");

/** The answer to a request from an Account that is not an Admin. */
export const notAnAdmin = () => apiError(403, "not an Admin: only an Account on the Admin allow-list may do this");
