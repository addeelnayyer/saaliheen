import net from "node:net";
import { describeFeature, loadFeature, type StepTest } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { UNREACHABLE } from "./serve-without-database";

const feature = await loadFeature("./allah-references-without-neon.feature");

type StepFn = Parameters<StepTest["Given"]>[1];

const baseURL = () => `http://127.0.0.1:${Number(process.env.PORT)}`;

/** What the API answered: its status, headers and body, parsed when JSON. */
interface Answer {
  status: number;
  headers: Headers;
  text: string;
  json: unknown;
}

describeFeature(feature, ({ ScenarioOutline, BeforeEachScenario, defineSteps }) => {
  let answer: Answer | undefined;

  BeforeEachScenario(() => {
    answer = undefined;
  });

  const answered = () => {
    if (!answer) throw new Error("no request sent yet in this scenario");
    return answer;
  };

  defineSteps((keywords) => {
    const step = (text: string, fn: StepFn) => {
      for (const define of [keywords.Given, keywords.When, keywords.Then, keywords.And, keywords.But]) define(text, fn);
    };

    step("the site was built and is served with its database unreachable", async () => {
      // The database the build was made and is served with takes no connections.
      const { hostname, port } = new URL(UNREACHABLE);
      const connects = await new Promise<boolean>((resolve) => {
        const socket = net.connect(Number(port), hostname, () => (socket.destroy(), resolve(true)));
        socket.on("error", () => resolve(false));
      });
      expect(connects, `something takes connections at ${hostname}:${port}`).toBe(false);
      expect((await fetch(`${baseURL()}/ur/1`)).status, "the build serves").toBe(200);
    });

    step("I GET {string} with neither cookie nor token", async (_, url: string) => {
      const res = await fetch(`${baseURL()}${url}`);
      const text = await res.text();
      let json: unknown = undefined;
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
      answer = { status: res.status, headers: res.headers, text, json };
    });

    step("the API answers {int} with a JSON error", (_, status: number) => {
      const { status: got, headers, text, json } = answered();
      expect(got, `the API's answer: ${text.slice(0, 200)}`).toBe(status);
      expect(headers.get("content-type"), "a JSON answer").toMatch(/^application\/json\b/);
      expect(typeof (json as { error?: unknown } | undefined)?.error, "an error named in the answer's `error`").toBe("string");
    });

    step("the answer names no Word locations and no version", () => {
      const json = (answered().json ?? {}) as Record<string, unknown>;
      expect("locations" in json || "version" in json, `the answer: ${answered().text.slice(0, 200)}`).toBe(false);
    });

    step("the answer names the minimum app version in its Min-App-Version header", () => {
      expect(answered().headers.get("min-app-version"), "the Min-App-Version header").toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  ScenarioOutline("With Neon unreachable, GET /api/v1/allah-references/<surah> answers the API's usual error, never an empty list", () => {});
});
