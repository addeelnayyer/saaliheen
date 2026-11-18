"use client";

// The error page (ADR 0020): what a page under a Language shows in place of
// itself when it cannot be drawn, such as a page that reads Neon (#170), not
// yet in the cache, while Neon cannot be reached. It says so and offers Retry,
// which asks for the page again.

import { STRINGS } from "./strings";
import { Failure } from "./in-parts/failure";

/** The error page's message and Retry; Retry calls `retry`, or reloads the page when there is none. */
export function PageUnavailable({ retry }: { retry?: () => void }) {
  return <Failure message={STRINGS.pageFailed} onRetry={() => (retry ? retry() : window.location.reload())} />;
}
