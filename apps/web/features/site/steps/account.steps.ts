// Accounts (#66): signing in on the Sign-in page with Google or Apple, seeing
// it, signing out, the same person getting the same Account, the Account
// test-only sign-in, and a reader who isn't signed in setting no cookie.
// Steps sign in through the Account test sign-in at /<lang>/test-sign-in,
// which the test configuration (../admin-settings.ts) switches on; they
// never reach Google or Apple, whose sign-in pages a stub answers (the
// "I am not signed in" step in ./admin.steps.ts). Which Account a browser is
// signed in to is read from Better Auth's session answer at
// /api/v1/auth/get-session, as any client of the site's API reads it.

import { expect, type Page } from "@playwright/test";
import { sourceSurahs, type Language } from "../support";
import { ACCOUNT_APPLE_CLIENT_ID, ACCOUNT_GITHUB_CLIENT_ID, ACCOUNT_GOOGLE_CLIENT_ID } from "../account-settings";
import { serveAgain } from "./admin.steps";
import { Given, Then, When, type Reading } from "./fixtures";

// GitHub is offered to Admins only, on the Sign-in page's Admin entry (#67).
type Method = "Google" | "Apple" | "GitHub";
function method(name: string): Method {
  if (name !== "Google" && name !== "Apple" && name !== "GitHub") throw new Error(`no Account sign-in method ${name}`);
  return name;
}

/** Better Auth's base path (#66). */
export const AUTH_BASE = "/api/v1/auth";

/** A button or link the page offers, by its exact name. */
export const control = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: typeof name === "string" }).or(page.getByRole("link", { name, exact: typeof name === "string" }));

/** The Sign-in page's control that starts signing in with `m`, in either Language: its name holds the method's name. */
export const signInWith = (page: Page, m: Method) =>
  page
    .getByRole("button", { name: new RegExp(m) })
    .or(page.getByRole("link", { name: new RegExp(m) }))
    .filter({ hasNotText: /test/i });

// ------------------------------------------------------- the Sign-in page

When("I open the Sign-in page in {language}", async ({ reader, reading }, lang: Language) => {
  reading.status = (await reader.page.goto(`/${lang}/sign-in`))?.status();
  reading.lang = lang;
  expect(reading.status, `/${lang}/sign-in is found`).toBe(200);
});

When("I choose to sign in with {word}", async ({ reader }, name: string) => {
  const chosen = signInWith(reader.page, method(name));
  await expect(chosen, `the Sign-in page offers signing in with ${name}`).toBeVisible();
  await chosen.click();
});

// Where each method's sign-in page is: the browser is sent there, and a stub
// answers in GitHub's, Google's or Apple's place.
export const PROVIDER: Record<Method, { host: string; path: RegExp; clientId: string; callback: string }> = {
  GitHub: { host: "github.com", path: /^\/login\/oauth\/authorize$/, clientId: ACCOUNT_GITHUB_CLIENT_ID, callback: `${AUTH_BASE}/callback/github` },
  Google: { host: "accounts.google.com", path: /^\/o\/oauth2\/(v2\/)?auth$/, clientId: ACCOUNT_GOOGLE_CLIENT_ID, callback: `${AUTH_BASE}/callback/google` },
  Apple: { host: "appleid.apple.com", path: /^\/auth\/authorize$/, clientId: ACCOUNT_APPLE_CLIENT_ID, callback: `${AUTH_BASE}/callback/apple` },
};

Then(
  "the browser is sent to {word}'s sign-in page for this site's Account app, to come back to this site's {word} callback",
  async ({ reader, reading }, name: string, again: string) => {
    expect(again).toBe(name);
    const provider = PROVIDER[method(name)];
    const sent = () => (reading.providerRequests ?? []).find((u) => new URL(u).hostname === provider.host);
    await expect.poll(sent, { message: `the browser went to ${provider.host}` }).toBeTruthy();
    const url = new URL(sent()!);
    expect(url.pathname, `${name}'s sign-in page`).toMatch(provider.path);
    expect(url.searchParams.get("client_id"), `this site's ${name} app for Accounts`).toBe(provider.clientId);
    const back = new URL(url.searchParams.get("redirect_uri") || "about:blank");
    expect(back.origin, "comes back to this site").toBe(new URL(reader.baseURL).origin);
    expect(back.pathname, `comes back to Better Auth's ${name} callback`).toBe(provider.callback);
  },
);

async function expectSignInPage(page: Page) {
  await expect(page).toHaveURL((url) => /^\/(ur|en)\/sign-in$/.test(url.pathname));
}

Then("the Sign-in page offers signing in with Google and with Apple", async ({ reader }) => {
  const page = reader.page;
  await expectSignInPage(page);
  await expect(signInWith(page, "Google"), "signing in with Google").toBeVisible();
  await expect(signInWith(page, "Apple"), "signing in with Apple").toBeVisible();
  await expect(control(page, "Sign out"), "no Sign out for a reader who isn't signed in").toHaveCount(0);
});

Then(
  "the Sign-in page shows me signed in as {string}, offering {string}",
  async ({ reader }, email: string, signOut: string) => {
    const page = reader.page;
    await expectSignInPage(page);
    await expect(page.getByText(email, { exact: false }).first(), `the page names ${email}`).toBeVisible();
    await expect(control(page, signOut)).toBeVisible();
    await expect(signInWith(page, "Google"), "no signing in again with Google").toHaveCount(0);
    await expect(signInWith(page, "Apple"), "no signing in again with Apple").toHaveCount(0);
  },
);

// -------------------------------------------------- the Account test sign-in

/** Sign in to an Account through the Account test sign-in as `email`, as if through `via`. */
export async function accountTestSignIn(page: Page, email: string, via: Method) {
  const res = await page.goto("/en/test-sign-in");
  expect(res?.status(), "the Account test sign-in page is found").toBe(200);
  const button = page.getByRole("button", { name: `Test sign-in via ${via}`, exact: true });
  await expect(button, `the Account test sign-in offers ${via}`).toBeVisible();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await button.click();
  await expect(page, `signed in via ${via}, the test sign-in moves on`).toHaveURL((url) => url.pathname !== "/en/test-sign-in");
}

When(
  "I sign in to an Account through the test sign-in as {string} via {word}",
  async ({ reader }, email: string, via: string) => {
    await accountTestSignIn(reader.page, email, method(via));
  },
);

When("I sign out on the Sign-in page in {language}", async ({ reader }, lang: Language) => {
  const page = reader.page;
  await page.goto(`/${lang}/sign-in`);
  await control(page, "Sign out").click();
  await expect(signInWith(page, "Google"), "signed out, the Sign-in page offers Google again").toBeVisible();
});

Then("the page offers the Account test sign-in", async ({ reader }) => {
  const page = reader.page;
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test sign-in via Google", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test sign-in via Apple", exact: true })).toBeVisible();
});

Given(
  "a second copy of the production build is served with the Account settings and {string}",
  async ({ reader, reading }, settings: string) => {
    await serveAgain(reader, reading, settings);
  },
);

// ------------------------------------------------- which Account, if any

/** The Account the site says this browser is signed in to, from Better Auth's session answer; undefined when none. */
export async function signedInAccount(page: Page): Promise<{ id: string; email: string } | undefined> {
  const res = await page.request.get(`${AUTH_BASE}/get-session`);
  expect(res.status(), `${AUTH_BASE}/get-session answers`).toBe(200);
  const body = (await res.json().catch(() => null)) as { user?: { id?: unknown; email?: unknown } } | null;
  const user = body?.user;
  return typeof user?.id === "string" && typeof user.email === "string" ? { id: user.id, email: user.email } : undefined;
}

Then("the site knows me as {string}", async ({ reader }, email: string) => {
  expect((await signedInAccount(reader.page))?.email, "the Account the site knows me by").toBe(email);
});

Then("the site does not know me", async ({ reader }) => {
  expect(await signedInAccount(reader.page), "no Account").toBeUndefined();
});

When("I note the Account the site knows me by", async ({ reader, reading }) => {
  const account = await signedInAccount(reader.page);
  expect(account, "signed in to an Account").toBeDefined();
  reading.account = account;
});

export const noted = (reading: Reading) => {
  if (!reading.account) throw new Error("no Account noted in this scenario");
  return reading.account;
};

Then("the site knows me by the Account I noted", async ({ reader, reading }) => {
  expect(await signedInAccount(reader.page), "the same Account").toEqual(noted(reading));
});

Then(
  "the site knows me as {string}, by an Account other than the one I noted",
  async ({ reader, reading }, email: string) => {
    const account = await signedInAccount(reader.page);
    expect(account?.email).toBe(email);
    expect(account?.id, "a different Account").not.toBe(noted(reading).id);
  },
);

// ------------------------------------------------------ no cookie (AC-3)

/** Each named page's addresses in `lang`; "every Surah page" is all 114, from QUL's Surah metadata. */
function addressesOf(name: string, lang: Language): string[] {
  switch (name) {
    case "the Surah index":
      return [`/${lang}`];
    case "every Surah page":
      return sourceSurahs().map((s) => `/${lang}/${s.number}`);
    case "the credits page":
      return [`/${lang}/credits`];
    case "a Share page":
      return [`/${lang}/share/18/83-88/uthmani`];
    case "the Sign-in page":
      return [`/${lang}/sign-in`];
    default:
      throw new Error(`no page named "${name}"`);
  }
}

/** Fetch each address as this browser, a few at a time, and expect it found and setting no cookie. */
async function expectFoundWithoutCookie(page: Page, addresses: string[]) {
  const problems: string[] = [];
  for (let i = 0; i < addresses.length; i += 6) {
    await Promise.all(
      addresses.slice(i, i + 6).map(async (address) => {
        const res = await page.request.get(address, { maxRedirects: 0 });
        if (res.status() !== 200) problems.push(`${address} answered ${res.status()}`);
        const cookie = res.headers()["set-cookie"];
        if (cookie !== undefined) problems.push(`${address} set a cookie: ${cookie}`);
        await res.dispose();
      }),
    );
  }
  expect(problems).toEqual([]);
}

Then("each of these pages in {language} is found and sets no cookie:", async ({ reader, $testInfo }, lang: Language, table) => {
  $testInfo.setTimeout(300_000);
  const addresses = (table.raw().flat() as string[]).flatMap((name) => addressesOf(name, lang));
  await expectFoundWithoutCookie(reader.page, addresses);
});

Then("each of these pages is found and sets no cookie:", async ({ reader }, table) => {
  await expectFoundWithoutCookie(reader.page, table.raw().flat());
});

Then("my browser holds no cookie for this site", async ({ reader }) => {
  expect(await reader.page.context().cookies(reader.baseURL)).toEqual([]);
});
