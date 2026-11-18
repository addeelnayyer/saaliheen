// What a page that reads Neon (#170) does when Neon cannot answer and the page
// is not in the cache (ADR 0020): it is drawn as the error page with a Retry
// (app/[lang]/page-unavailable.tsx) rather than failing, since Next.js answers
// a failed render of a page rendered on request with a bare "Internal Server
// Error", and it is kept for a second only, so the next request after that
// reads Neon again. A page in the cache is still served: this runs only on a
// render.

import { unstable_cache } from "next/cache";

/** In place of what Neon could not give a page. */
export const UNAVAILABLE = Symbol("unavailable");
type Unavailable = typeof UNAVAILABLE;

/**
 * Lowers the page's time in the cache to a second: Next.js keeps a page for
 * the shortest `revalidate` of the cached reads it made, and no read of this
 * one fails.
 */
const keptForASecond = unstable_cache(async () => true, ["kept-for-a-second"], { revalidate: 1 });

/** `read`'s answer, or UNAVAILABLE when it fails, the page then kept for a second only. */
export async function orUnavailable<T>(read: () => Promise<T>): Promise<T | Unavailable> {
  try {
    return await read();
  } catch (error) {
    console.error(`Neon unread, the page drawn as unavailable: ${(error as Error).message}`);
    await keptForASecond();
    return UNAVAILABLE;
  }
}
