// How every /api/v1 answer is made (#70, ADR 0008): plain JSON, carrying the
// minimum app version still supported in its Min-App-Version header, as the
// published dataset's manifest names it, so an app too old to be supported
// can ask its reader to update, whatever the answer.

import { MIN_APP_VERSION } from "@saaliheen/dataset/published";

export const MIN_APP_VERSION_HEADER = "Min-App-Version";

/** `response` with the Min-App-Version header. */
export function withMinAppVersion(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set(MIN_APP_VERSION_HEADER, MIN_APP_VERSION);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** `body` as a JSON answer with `status`. */
export const apiJson = (body: unknown, status = 200) => withMinAppVersion(Response.json(body, { status }));

/**
 * `response` cached by the CDN for `seconds`, then served stale for up to five
 * times as long while it is fetched again, so a public answer that needs no
 * Account isn't rendered by a function on every request (Fast Origin
 * Transfer). Only for answers that are the same for everyone, and only when
 * they succeeded: an error is never cached.
 */
export function cachedAtEdge(response: Response, seconds: number): Response {
  if (!response.ok) return response;
  response.headers.set("Cache-Control", `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`);
  return response;
}

/** An error answer: `{ error }` with `status`. */
export const apiError = (status: number, error: string) => apiJson({ error }, status);
