// Question limits as both apps read them (#80, ADR 0058): an Account's
// Question limits as /api/v1/question-limits answers them, which limit a
// question past them would reach, and what Quran Chat says of them — how few
// questions are left today, or the limit reached and when it resets, in UTC.
// The words around these are each app's own (ADR 0029).

export type LimitName = "daily" | "monthly";

/** One limit as it stands for an Account: what it allows, what has been asked against it, what is left and when it resets. */
export interface Limit {
  limit: number;
  asked: number;
  left: number;
  resetsAt: string;
}

/** An Account's Question limits: its Plan, and each limit as it stands. */
export interface QuestionLimits {
  plan: string;
  daily: Limit;
  monthly: Limit;
}

/** The limit a question past both would reach: the monthly, which resets no sooner. */
export function limitReached(limits: QuestionLimits): LimitName | undefined {
  if (limits.monthly.left === 0) return "monthly";
  if (limits.daily.left === 0) return "daily";
  return undefined;
}

/** How many questions are left today: the fewer of what either limit leaves. */
export const leftToday = (limits: QuestionLimits) => Math.min(limits.daily.left, limits.monthly.left);

/** Once fewer than this many questions are left today, Quran Chat says how many. */
const FEW_LEFT = 5;

const RESET_TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
const RESET_DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** When a limit resets, as Quran Chat says it: "00:00 UTC on 17 November 2026". */
const resetTime = (resetsAt: string) => {
  const resets = new Date(resetsAt);
  return `${RESET_TIME.format(resets)} UTC on ${RESET_DAY.format(resets)}`;
};

/** What Quran Chat says of the Question limits: the limit reached, all it allows and when it resets; or how few are left today. */
export type LimitsNotice = { reached: LimitName; limit: number; resets: string } | { reached?: undefined; left: number };

/** What Quran Chat says of `limits`, or undefined while five or more questions are left today. */
export function limitsNotice(limits: QuestionLimits): LimitsNotice | undefined {
  const reached = limitReached(limits);
  if (reached) return { reached, limit: limits[reached].limit, resets: resetTime(limits[reached].resetsAt) };
  const left = leftToday(limits);
  return left < FEW_LEFT ? { left } : undefined;
}
