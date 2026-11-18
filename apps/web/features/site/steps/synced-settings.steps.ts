// Script and Language following an Account between browsers (#70). Each
// "browser" is its own browser context, as a phone and a computer are, signed
// in through the Account test-only sign-in (#66); `reader.page` is the one the
// person is looking at, and turning to the other waits for this one's saves to
// the versioned API to finish. What an Account holds is set and read through
// the API's settings resource, /api/v1/settings, as the mobile app would.

import { expect, request as playwrightRequest, type APIRequestContext, type Page, type Request } from "@playwright/test";
import type { Language } from "../support";
import { accountTestSignIn } from "./account.steps";
import { Given, Then, When, type Reader, type Reading } from "./fixtures";
import type { Script } from "./reader";

const SETTINGS = "/api/v1/settings";
const AUTH_BASE = "/api/v1/auth";

/** Each browser's requests to the versioned API (but its sign-in) still in flight. */
const inFlight = new WeakMap<Page, Set<Request>>();

function watchApi(page: Page) {
  const pending = new Set<Request>();
  inFlight.set(page, pending);
  const isApi = (url: string) => {
    const { pathname } = new URL(url);
    return pathname.startsWith("/api/v1/") && !pathname.startsWith(`${AUTH_BASE}/`);
  };
  // Whether the page is opening another document, which cuts off whatever the
  // page it leaves still has under way, saves included, once it arrives:
  // unanswered, and never reported finished or failed. The next page sends its
  // Reading places again (#71).
  let leaving = false;
  page.on("request", (req) => {
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) leaving = true;
    if (isApi(req.url())) pending.add(req);
  });
  // A save is done once the API has answered it, even when the page moves on
  // before its body arrives, and neither finishes nor fails it.
  page.on("response", (res) => pending.delete(res.request()));
  page.on("requestfinished", (req) => pending.delete(req));
  page.on("requestfailed", (req) => pending.delete(req));
  // A read the page left behind by opening another is never answered, nor
  // reported finished or failed: only its saves can still be under way.
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    for (const req of pending) if (leaving || req.method() === "GET") pending.delete(req);
    leaving = false;
  });
}

/** Wait until `page` has no request to the versioned API in flight, and has sent none for a moment. */
export async function settled(page: Page) {
  const pending = inFlight.get(page);
  if (!pending) return;
  await page.waitForTimeout(250);
  await expect
    .poll(() => [...pending].map((req) => `${req.method()} ${new URL(req.url()).pathname}`), {
      message: "this browser's saves to the API have finished",
    })
    .toEqual([]);
}

/** A fresh browser with no saved reader settings, signed in to the Account `email`. */
async function signedInBrowser(reader: Reader, email: string) {
  const context = await reader.newContext();
  const state = await context.storageState();
  expect(state.origins, "saved browser storage").toEqual([]);
  const page = await context.newPage();
  watchApi(page);
  // Signed in, the browser asks the Account for its settings and, when it has
  // none yet, saves its own; wait for that, as a person's device is ready
  // before they pick up the next.
  const asked = page.waitForResponse((res) => new URL(res.url()).pathname === SETTINGS && res.request().method() === "GET");
  await accountTestSignIn(page, email, "Google");
  await asked;
  await settled(page);
  return page;
}

const browsersOf = (reading: Reading) => {
  if (!reading.browsers) throw new Error("no two browsers in this scenario");
  return reading.browsers;
};

Given(
  "two browsers with no saved reader settings, both signed in to an Account as {string}",
  async ({ reader, reading }, email: string) => {
    const first = await signedInBrowser(reader, email);
    const second = await signedInBrowser(reader, email);
    reading.browsers = { first, second };
    reader.page = first;
  },
);

When(/^I turn to the (first|second) browser$/, async ({ reader, reading }, which: "first" | "second") => {
  const browsers = browsersOf(reading);
  const to = browsers[which];
  if (reader.page !== to) await settled(reader.page);
  reader.page = to;
});

When(
  "a second browser with no saved reader settings signs in to the Account as {string}",
  async ({ reader }, email: string) => {
    await settled(reader.page);
    reader.page = await signedInBrowser(reader, email);
  },
);

// The address bar: the path and fragment, with nothing else added.
Then("this browser is on {string}", async ({ reader }, address: string) => {
  const [path, hash = ""] = address.split("#");
  await expect(reader.page, `this browser is on ${address}`).toHaveURL(
    (url) => url.pathname === path && url.search === "" && url.hash === (hash ? `#${hash}` : ""),
  );
});

// ---------------------------------------------------------------- signing in

When(
  "I sign in to the Account as {string} on the {language} test sign-in page",
  async ({ reader }, email: string, lang: Language) => {
    const page = reader.page;
    if (!inFlight.has(page)) watchApi(page);
    const res = await page.goto(`/${lang}/test-sign-in`);
    expect(res?.status(), `/${lang}/test-sign-in is found`).toBe(200);
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("button", { name: "Test sign-in via Google", exact: true }).click();
    await expect(page, "signed in, the test sign-in moves on").toHaveURL((url) => url.pathname !== `/${lang}/test-sign-in`);
  },
);

Then("the Sign-in page I land on is in {language}", async ({ reader }, lang: Language) => {
  await expect(reader.page, `the Sign-in page in ${lang}`).toHaveURL((url) => url.pathname === `/${lang}/sign-in`);
  await settled(reader.page);
});

// ---------------------------------------------------------------- the Account, through the API

/** A client of the API signed in to the Account `email` through the Account test sign-in. */
export async function apiSignedIn(baseURL: string, email: string): Promise<APIRequestContext> {
  const api = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { origin: new URL(baseURL).origin } });
  const res = await api.post(`${AUTH_BASE}/test-sign-in`, { data: { email, method: "google" } });
  expect(res.status(), `the test sign-in signs ${email} in`).toBe(200);
  return api;
}

Given(
  "the Account {string} has the Script {script} and the Language {language}",
  async ({ reader }, email: string, script: Script, lang: Language) => {
    const api = await apiSignedIn(reader.baseURL, email);
    try {
      const res = await api.patch(SETTINGS, { data: { script, language: lang } });
      expect(res.status(), `the API saved the Account's settings: ${(await res.text()).slice(0, 200)}`).toBe(200);
    } finally {
      await api.dispose();
    }
  },
);

Then(
  "the Account {string} has the Script {script} and the Language {language}, as the API answers",
  async ({ reader }, email: string, script: Script, lang: Language) => {
    await settled(reader.page);
    const api = await apiSignedIn(reader.baseURL, email);
    try {
      const res = await api.get(SETTINGS);
      expect(res.status(), `the API answers the Account's settings: ${(await res.text()).slice(0, 200)}`).toBe(200);
      expect(await res.json()).toEqual({ script, language: lang });
    } finally {
      await api.dispose();
    }
  },
);
