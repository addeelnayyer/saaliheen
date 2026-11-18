import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { FREE_PLAN_LIMITS } from "../../scripts/content/plan.ts";
import type { Limit, LimitName } from "@saaliheen/quran-chat";
import { TEST_NOW_HEADER } from "../../src/test-clock.ts";
import { accountId, credentialHeaders, database, fakeClaude, recorded, send, signIn, type Answer, type SignedIn } from "./support";

const feature = await loadFeature("./quran-chat-limits.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const QUESTIONS = "/api/v1/questions";
const QUESTION_LIMITS = "/api/v1/question-limits";

/** Set the Free Plan's limits in the run's Postgres, as the owner sets them in Neon. */
const setFreePlan = (daily: number, monthly: number) =>
  database().query(`update plan set daily_question_limit = $1, monthly_question_limit = $2 where name = 'free'`, [daily, monthly]);

/** Record `count` questions asked by Account `id` at noon UTC on `day`. */
async function askedEarlier(id: string, count: number, day: string) {
  await database().query(
    `insert into asked_question ("userId", asked_at) select $1, $2::timestamptz from generate_series(1, $3)`,
    [id, `${day}T12:00:00Z`, count],
  );
}

describeFeature(feature, ({ Background, Scenario, ScenarioOutline, BeforeEachScenario, AfterAllScenarios, defineSteps }) => {
  let signedIn: SignedIn | undefined;
  let answer: Answer | undefined;
  let now: string | undefined;

  BeforeEachScenario(async () => {
    signedIn = undefined;
    answer = undefined;
    now = undefined;
    await fetch(fakeClaude(), { method: "DELETE" });
  });

  AfterAllScenarios(async () => {
    await setFreePlan(FREE_PLAN_LIMITS.daily, FREE_PLAN_LIMITS.monthly);
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };
  /** `credential`'s headers, with the scenario's clock. */
  const headers = (credential: string) => ({ ...credentialHeaders(credential, signedIn), ...(now ? { [TEST_NOW_HEADER]: now } : {}) });
  const me = async () => {
    if (!signedIn) throw new Error("not signed in in this scenario");
    return accountId(signedIn);
  };
  const limitsAnswered = (which: LimitName) => (answered().json as Record<string, Limit>)[which];

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("the Free Plan allows {int} questions a day and {int} a month", async (_, daily: number, monthly: number) => {
      await setFreePlan(daily, monthly);
    });

    step("the Free Plan's daily limit is changed to {int} in Neon", async (_, daily: number) => {
      await database().query(`update plan set daily_question_limit = $1 where name = 'free'`, [daily]);
    });

    step("I am signed in to an Account as {string}", async (_, email: string) => {
      signedIn = await signIn(email);
    });

    for (const text of ["it is {string}", "the clock moves on to {string}"]) {
      step(text, (_, time: string) => {
        now = time;
      });
    }

    step("I have asked {int} questions earlier on {string}", async (_, count: number, day: string) => {
      await askedEarlier(await me(), count, day);
    });

    step("another Account has asked {int} questions earlier on {string}", async (_, count: number, day: string) => {
      const other = await signIn(`other-of-${signedIn?.email ?? "nobody"}`);
      await askedEarlier(await accountId(other), count, day);
    });

    step("I GET my Question limits with {any}", async (_, credential: string) => {
      answer = await send("GET", QUESTION_LIMITS, headers(credential.replace(/^my /, "")));
    });

    for (const text of ["I ask a question with my {any}", "I ask again with my {any}"]) {
      step(text, async (_, credential: string) => {
        answer = await send("POST", QUESTIONS, headers(credential), JSON.stringify({ question: "Dhul-Qarnayn", language: "en" }));
      });
    }

    step("the API answers {int} with JSON", (_, status: number) => {
      const { status: got, headers, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
      if (status >= 400) expect(typeof (answered().json as { error?: unknown }).error, "an error named in the answer's `error`").toBe("string");
    });

    step("the API answers {int} with newline-delimited JSON", (_, status: number) => {
      const { status: got, headers, text } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "newline-delimited JSON").toMatch(/^application\/x-ndjson\b/);
      expect(text.trim().split("\n").at(-1), "the answer's last event").toBe(JSON.stringify({ type: "end" }));
    });

    step("my Plan is {string}", (_, plan: string) => {
      expect((answered().json as { plan: string }).plan).toBe(plan);
    });

    for (const which of ["daily", "monthly"] as const) {
      step(
        `my ${which} limit allows {int}, with {int} asked and {int} left, resetting at {string}`,
        (_, limit: number, asked: number, left: number, resetsAt: string) => {
          expect(limitsAnswered(which), `my ${which} limit`).toEqual({ limit, asked, left, resetsAt });
        },
      );
    }

    const expectRefusal = (limit: string, resetsAt: string) => {
      const refusal = answered().json as { limit?: unknown; resetsAt?: unknown };
      expect(refusal.limit, "the limit reached").toBe(limit);
      expect(refusal.resetsAt, "when it resets").toBe(resetsAt);
    };

    step("the refusal names the {string} limit, resetting at {string}", (_, limit: string, resetsAt: string) => expectRefusal(limit, resetsAt));

    step(
      "the refusal names the {string} limit, resetting at {string}, {int} seconds away",
      (_, limit: string, resetsAt: string, seconds: number) => {
        expectRefusal(limit, resetsAt);
        expect(answered().headers.get("retry-after"), "the Retry-After header").toBe(String(seconds));
      },
    );

    step("Claude was not asked", async () => {
      expect(await recorded()).toBeNull();
    });
  });

  Background(() => {});
  Scenario("A new Account is on the Free Plan, with every question left", () => {});
  Scenario("Question limits need an Account", () => {});
  Scenario("Each question counts against the day and the month, whichever credential asks it", () => {});
  Scenario("Another Account's questions do not count against mine", () => {});
  Scenario("A question past the daily limit is refused, naming the limit and when it resets, and does not count", () => {});
  Scenario("The daily limit resets at midnight UTC, and the day's questions still count against the month", () => {});
  ScenarioOutline("A question at <now>, past the monthly limit, is refused, naming it and the first of the next month", () => {});
  Scenario("Last month's questions do not count against this month", () => {});
  Scenario("A change to the Free Plan's limits applies to the next question", () => {});
});
