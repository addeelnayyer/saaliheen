import { describe, expect, it } from "vitest";
import { limitsNotice, type QuestionLimits } from "./index.ts";

const limits = (daily: [limit: number, asked: number], monthly: [limit: number, asked: number]): QuestionLimits => ({
  plan: "Free",
  daily: { limit: daily[0], asked: daily[1], left: Math.max(0, daily[0] - daily[1]), resetsAt: "2026-11-17T00:00:00.000Z" },
  monthly: { limit: monthly[0], asked: monthly[1], left: Math.max(0, monthly[0] - monthly[1]), resetsAt: "2026-12-01T00:00:00.000Z" },
});

describe("what the Question limits say", () => {
  it("says nothing while five or more questions are left today", () => {
    expect(limitsNotice(limits([20, 15], [300, 15]))).toBeUndefined();
  });

  it("says how many are left today once fewer than five are", () => {
    expect(limitsNotice(limits([20, 16], [300, 16]))).toEqual({ left: 4 });
  });

  it("counts what the monthly limit leaves when it leaves fewer", () => {
    expect(limitsNotice(limits([20, 2], [300, 299]))).toEqual({ left: 1 });
  });

  it("names the daily limit reached, and when it resets, in UTC", () => {
    expect(limitsNotice(limits([20, 20], [300, 40]))).toEqual({ reached: "daily", limit: 20, resets: "00:00 UTC on 17 November 2026" });
  });

  it("names the monthly limit when both are reached", () => {
    expect(limitsNotice(limits([20, 20], [300, 300]))).toEqual({ reached: "monthly", limit: 300, resets: "00:00 UTC on 1 December 2026" });
  });
});
