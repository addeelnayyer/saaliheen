// Marking a Supplication's spans on its editor's Word cards (#271): what a tap
// on a Word card does to the spans and to a span's pending start.

import { describe, expect, it } from "vitest";
import { tapped } from "./span-taps";

describe("Supplication span taps", () => {
  it("starts a span on a first tap, and ends it on a later Word in the same Ayah", () => {
    const started = tapped([], undefined, "7:23:5");
    expect(started).toEqual({ spans: [], pending: "7:23:5" });
    expect(tapped(started.spans, started.pending, "7:23:9")).toEqual({ spans: [{ from: "7:23:5", to: "7:23:9" }], pending: undefined });
  });

  it("adds a span across Ayahs before one already marked, the spans kept in reading order", () => {
    const later = [{ from: "3:193:3", to: "3:193:6" }];
    expect(tapped(later, "3:191:12", "3:192:5")).toEqual({
      spans: [
        { from: "3:191:12", to: "3:192:5" },
        { from: "3:193:3", to: "3:193:6" },
      ],
      pending: undefined,
    });
  });

  it("removes the span holding a tapped Word, at its ends or inside it, keeping a span's pending start", () => {
    const spans = [
      { from: "3:191:12", to: "3:192:5" },
      { from: "3:193:3", to: "3:193:6" },
    ];
    expect(tapped(spans, undefined, "3:192:1")).toEqual({ spans: [spans[1]], pending: undefined });
    expect(tapped(spans, undefined, "3:193:6")).toEqual({ spans: [spans[0]], pending: undefined });
    expect(tapped(spans, "3:194:1", "3:191:12")).toEqual({ spans: [spans[1]], pending: "3:194:1" });
  });

  it("starts the span again at a Word tapped before its start", () => {
    expect(tapped([], "7:23:5", "7:23:1")).toEqual({ spans: [], pending: "7:23:1" });
  });

  it("takes in the spans a new span holds, so that no two overlap", () => {
    const inside = [
      { from: "7:23:2", to: "7:23:3" },
      { from: "7:23:5", to: "7:23:6" },
      { from: "7:23:9", to: "7:23:9" },
    ];
    expect(tapped(inside, "7:23:1", "7:23:7")).toEqual({ spans: [{ from: "7:23:1", to: "7:23:7" }, inside[2]], pending: undefined });
  });

  it("makes a span of one Word when its start is tapped again", () => {
    expect(tapped([], "2:201:4", "2:201:4")).toEqual({ spans: [{ from: "2:201:4", to: "2:201:4" }], pending: undefined });
  });
});
