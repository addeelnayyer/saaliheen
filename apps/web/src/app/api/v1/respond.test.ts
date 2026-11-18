// Which /api/v1 answers the CDN may keep: a public answer that succeeded, for
// the seconds its route names, and never an error.

import { describe, expect, it } from "vitest";
import { apiError, apiJson, cachedAtEdge, MIN_APP_VERSION_HEADER } from "./respond";

describe("an answer cached at the edge", () => {
  it("is kept by the CDN for its seconds, then served stale for five times as long", () => {
    const answer = cachedAtEdge(apiJson({ ok: true }), 60);
    expect(answer.headers.get("Cache-Control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
  });

  it("still names the minimum app version", () => {
    expect(cachedAtEdge(apiJson({}), 15).headers.get(MIN_APP_VERSION_HEADER)).toBeTruthy();
  });

  it("is never an error", () => {
    expect(cachedAtEdge(apiError(503, "down"), 60).headers.get("Cache-Control")).toBeNull();
  });
});
