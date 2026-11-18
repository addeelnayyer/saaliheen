// A Conversation's title (#79): its first question, on one line, cut short.

import { describe, expect, it } from "vitest";
import { titleOf } from "./conversations";

describe("a Conversation's title", () => {
  it("is a short question as it was asked", () => {
    expect(titleOf("Who was Dhul-Qarnayn?")).toBe("Who was Dhul-Qarnayn?");
  });

  it("is on one line, its spaces and line breaks one space each", () => {
    expect(titleOf("  Who was\n\n Dhul-Qarnayn?\t")).toBe("Who was Dhul-Qarnayn?");
  });

  it("is a long question's first 80 characters, ending in an ellipsis", () => {
    const question = "What does the Quran say about patience in hardship, and how did the Prophets show it when their people turned away?";
    expect(titleOf(question)).toBe("What does the Quran say about patience in hardship, and how did the Prophets sh…");
    expect(titleOf(question)).toHaveLength(80);
  });
});
