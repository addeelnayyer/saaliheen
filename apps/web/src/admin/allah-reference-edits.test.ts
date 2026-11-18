// Marking Allah references (#152): each tap turns a Word into an Allah
// reference or out of one, replayed on the Allah references of the version
// the taps were made on, and kept as text in the Admin's browser.

import { describe, expect, it } from "vitest";
import { allahReferenceChangesStoredAs, allahReferencesAfter, keptTaps, parsedTaps } from "./allah-reference-edits";

describe("Allah reference changes", () => {
  it("turns an untapped Word into an Allah reference and an Allah reference out of one", () => {
    expect([...allahReferencesAfter(["112:2:1", "112:1:4"], ["112:1:1", "112:2:1"])].sort()).toEqual(["112:1:1", "112:1:4"]);
  });

  it("takes a Word tapped twice back to how it was", () => {
    expect([...allahReferencesAfter(["112:2:1"], ["112:1:1", "112:1:1", "112:2:1", "112:2:1"])]).toEqual(["112:2:1"]);
  });

  it("keeps the changes by Surah and version", () => {
    expect(allahReferenceChangesStoredAs(108, 3)).toBe("saaliheen-allah-reference-changes:108:3");
    expect(allahReferenceChangesStoredAs(108, 4)).not.toBe(allahReferenceChangesStoredAs(108, 3));
  });

  it("reads back what it keeps, and nothing from missing or unreadable text", () => {
    expect(parsedTaps(keptTaps(["112:1:1", "112:3:1"]))).toEqual(["112:1:1", "112:3:1"]);
    expect(keptTaps([])).toBeNull();
    expect(parsedTaps(null)).toEqual([]);
    expect(parsedTaps("not json")).toEqual([]);
    expect(parsedTaps('{"112:1:1":true}')).toEqual([]);
    expect(parsedTaps('["112:1:1", 3, "Allah", null]')).toEqual(["112:1:1"]);
  });
});
