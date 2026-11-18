// The app-link files without the app's signing settings (#76 AC-5): the build
// ./serve-without-database.ts made and serves with APPLE_TEAM_ID and
// ANDROID_SHA256 unset succeeded (or the global setup would have failed), and
// both files answer, naming no app.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { UNSET_APP_LINK_SETTINGS } from "./serve-without-database";

const feature = await loadFeature("./app-links-unset.feature");

const baseURL = () => `http://127.0.0.1:${Number(process.env.PORT)}`;

const FILES = ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"] as const;

interface Fetched {
  address: string;
  status: number;
  type: string;
  body: unknown;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario("With APPLE_TEAM_ID and ANDROID_SHA256 unset the site builds, and both app-link files answer, claiming no app", ({ Given, When, Then, And }) => {
    const fetched: Fetched[] = [];
    const body = (address: string) => fetched.find((f) => f.address === address)?.body;

    Given("the site was built and is served without APPLE_TEAM_ID or ANDROID_SHA256", async () => {
      expect(UNSET_APP_LINK_SETTINGS.filter((name) => process.env[name] !== undefined), "settings left on the test run").toEqual([]);
      expect((await fetch(`${baseURL()}/privacy`)).status, "the build serves").toBe(200);
    });
    When("a phone fetches /.well-known/apple-app-site-association and /.well-known/assetlinks.json", async () => {
      for (const address of FILES) {
        const res = await fetch(`${baseURL()}${address}`, { redirect: "manual" });
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = undefined;
        }
        fetched.push({ address, status: res.status, type: res.headers.get("content-type") ?? "", body: parsed });
      }
    });
    Then("each answers 200 with JSON, without a redirect", () => {
      const wrong = fetched.filter((f) => f.status !== 200 || !f.type.includes("application/json") || f.body === undefined).map((f) => `${f.address}: ${f.status} ${f.type}`);
      expect(wrong).toEqual([]);
    });
    And("the Apple app site association names no app", () => {
      const details = (body(FILES[0]) as { applinks?: { details?: { appIDs?: string[]; appID?: string }[] } } | undefined)?.applinks?.details;
      expect(details, "its app links").toBeDefined();
      expect(details!.flatMap((d) => d.appIDs ?? (d.appID ? [d.appID] : [])), "the apps it names").toEqual([]);
    });
    And("the Android asset links name no app", () => {
      expect(body(FILES[1])).toEqual([]);
    });
  });
});
