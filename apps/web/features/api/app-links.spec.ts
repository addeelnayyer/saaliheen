// The website's app-link files (#76 AC-5): /.well-known/apple-app-site-association
// and /.well-known/assetlinks.json fetched over HTTP, as a phone fetches them,
// from the server ./serve-api.ts serves with ../site/app-link-settings.ts.

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { APP_ID, TEST_ANDROID_SHA256, TEST_APPLE_TEAM_ID } from "../site/app-link-settings.ts";
import { baseURL } from "./support";

const feature = await loadFeature("./app-links.feature");

interface Fetched {
  status: number;
  type: string;
  redirected: boolean;
  body: unknown;
}

/** GET `address` as a phone does: not following redirects, which iOS refuses. */
async function fetchAsPhone(address: string): Promise<Fetched> {
  const res = await fetch(`${baseURL()}${address}`, { redirect: "manual" });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: res.status, type: res.headers.get("content-type") ?? "", redirected: res.status >= 300 && res.status < 400, body };
}

/** One Apple app links entry: the app IDs it names and the addresses it claims, as components or as the older paths. */
interface AppleDetail {
  appIDs?: string[];
  appID?: string;
  components?: { "/"?: string; exclude?: boolean }[];
  paths?: string[];
}

/** An Apple app links pattern as a regular expression: `*` any characters, `?` any one. */
const appleGlob = (pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`);

/** Whether `detail` claims `path`: its first matching rule decides, an exclusion or `NOT` refusing it. */
function appleClaims(detail: AppleDetail, path: string): boolean {
  const rules = detail.components
    ? detail.components.filter((c) => c["/"] !== undefined).map((c) => ({ pattern: c["/"]!, exclude: c.exclude === true }))
    : (detail.paths ?? []).map((p) => (p.startsWith("NOT ") ? { pattern: p.slice(4), exclude: true } : { pattern: p, exclude: false }));
  const rule = rules.find((r) => appleGlob(r.pattern).test(path));
  return rule !== undefined && !rule.exclude;
}

const appIDsOf = (detail: AppleDetail) => detail.appIDs ?? (detail.appID ? [detail.appID] : []);

describeFeature(feature, ({ Scenario }) => {
  let fetched: Fetched;

  const answersJson = () => {
    expect(fetched.redirected, `it redirects, with ${fetched.status}`).toBe(false);
    expect(fetched.status).toBe(200);
    expect(fetched.type).toContain("application/json");
    expect(fetched.body, "its body parses as JSON").toBeDefined();
  };

  Scenario("The Apple app site association names the app and claims only Share page links", ({ When, Then, And }) => {
    let details: AppleDetail[] = [];

    When("a phone fetches /.well-known/apple-app-site-association", async () => {
      fetched = await fetchAsPhone("/.well-known/apple-app-site-association");
    });
    Then("it answers 200 with JSON, without a redirect", answersJson);
    And("its app links name only the app com.saaliheen.app of the configured Apple team", () => {
      details = ((fetched.body as { applinks?: { details?: AppleDetail[] } }).applinks?.details ?? []) as AppleDetail[];
      expect(details.flatMap(appIDsOf), "the apps its app links name").toEqual([`${TEST_APPLE_TEAM_ID}.${APP_ID}`]);
    });
    And("those app links claim these addresses on saaliheen.com, and no others of them:", (_, table: { address: string; claimed: string }[]) => {
      const wrong = table.flatMap(({ address, claimed }) => {
        const claims = details.some((d) => appleClaims(d, address));
        return claims === (claimed === "yes") ? [] : [`${address} is ${claims ? "" : "not "}claimed`];
      });
      expect(wrong).toEqual([]);
    });
  });

  Scenario("The Android asset links name the app and the configured signing certificate", ({ When, Then, And }) => {
    When("a phone fetches /.well-known/assetlinks.json", async () => {
      fetched = await fetchAsPhone("/.well-known/assetlinks.json");
    });
    Then("it answers 200 with JSON, without a redirect", answersJson);
    And("it lets only the app com.saaliheen.app, signed with the configured certificate, handle the website's links", () => {
      expect(fetched.body).toEqual([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: [TEST_ANDROID_SHA256] },
        },
      ]);
    });
  });
});
