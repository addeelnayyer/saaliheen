// Admins on Accounts (#67): the Sign-in page's Admin entry and where it sends
// the browser back to, GitHub kept off the plain Sign-in page, a GitHub
// sign-in refused to anyone not on the Admin allow-list without making an
// Account, and the hand-written Admin sign-in's addresses gone. Steps sign in
// through the Account test sign-in at /en/test-sign-in, as ./account.steps.ts
// does; which Account a browser is signed in to, and when it was made, is read
// from Better Auth's session answer at /api/v1/auth/get-session.

import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { accountTestSignIn, AUTH_BASE, signInWith } from "./account.steps";
import { Then, When, type Reading } from "./fixtures";

const TEST_SIGN_IN = "/en/test-sign-in";

// ------------------------------------------------------- the Sign-in page

Then("the Sign-in page does not offer signing in with GitHub", async ({ reader }) => {
  await expect(signInWith(reader.page, "Google"), "the Sign-in page has shown its choices").toBeVisible();
  await expect(signInWith(reader.page, "GitHub"), "no signing in with GitHub").toHaveCount(0);
});

Then("once signed in, the browser is to come back to {string}", async ({ reader, reading }, address: string) => {
  // The Sign-in page asks Better Auth to start a social sign-in, naming where to come back to.
  const asked = (reading.socialSignIns ?? []).at(-1);
  expect(asked, `the browser asked ${AUTH_BASE}/sign-in/social to start the sign-in`).toBeDefined();
  const callbackURL = (JSON.parse(asked!) as { callbackURL?: unknown }).callbackURL;
  expect(typeof callbackURL, "the sign-in names where to come back to").toBe("string");
  const back = new URL(callbackURL as string, reader.baseURL);
  expect(back.origin, "comes back to this site").toBe(new URL(reader.baseURL).origin);
  expect(back.pathname, `comes back to ${address}`).toBe(address);
});

// ------------------------------------------------ a refused GitHub sign-in

/** Try the Account test sign-in as `email` via GitHub, which may be refused. */
async function tryGitHub(page: Page, email: string) {
  const res = await page.goto(TEST_SIGN_IN);
  expect(res?.status(), "the Account test sign-in page is found").toBe(200);
  const github = page.getByRole("button", { name: "Test sign-in via GitHub", exact: true });
  await expect(github, "the Account test sign-in offers GitHub, as the Admin entry does").toBeVisible();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await github.click();
}

When(
  "I try the test sign-in via GitHub as someone new who is not on the Admin allow-list",
  async ({ reader, reading }) => {
    // Someone no scenario has signed in before, so no Account of theirs exists yet.
    const email = `newcomer-${randomUUID()}@saaliheen.test`;
    await tryGitHub(reader.page, email);
    reading.newcomer = { email };
  },
);

When("I try the test sign-in as {string} via GitHub", async ({ reader }, email: string) => {
  await tryGitHub(reader.page, email);
});

Then("the sign-in is refused", async ({ reader, reading }) => {
  const page = reader.page;
  // Next's own route announcer is an empty role="alert" too: the refusal is the alert that says something.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ }), "the test sign-in says it failed").toBeVisible();
  await expect(page, "still on the test sign-in").toHaveURL((url) => url.pathname === TEST_SIGN_IN);
  // Anything made from here on was made after the refusal.
  if (reading.newcomer) reading.newcomer.refusedAt = Date.now();
});

const newcomer = (reading: Reading) => {
  if (!reading.newcomer) throw new Error("no newcomer tried to sign in in this scenario");
  return reading.newcomer;
};

When("I sign in to an Account through the test sign-in as that person via Google", async ({ reader, reading }) => {
  await accountTestSignIn(reader.page, newcomer(reading).email, "Google");
});

Then(
  "the site knows me as that person, by an Account made after the refused GitHub sign-in",
  async ({ reader, reading }) => {
    const { email, refusedAt } = newcomer(reading);
    if (refusedAt === undefined) throw new Error("the GitHub sign-in was not seen refused");
    const res = await reader.page.request.get(`${AUTH_BASE}/get-session`);
    expect(res.status(), `${AUTH_BASE}/get-session answers`).toBe(200);
    const user = ((await res.json().catch(() => null)) as { user?: { email?: unknown; createdAt?: unknown } } | null)?.user;
    expect(user?.email, "the Account the site knows me by").toBe(email);
    const made = Date.parse(String(user?.createdAt));
    expect(Number.isNaN(made), "the Account says when it was made").toBe(false);
    expect(made, "the Account was made by the Google sign-in, not by the refused GitHub one").toBeGreaterThanOrEqual(refusedAt);
  },
);

// ------------------------------------------- the old Admin sign-in, gone

Then("{string} is not found on this site", async ({ reader }, address: string) => {
  const res = await reader.page.request.get(address, { maxRedirects: 0 });
  expect(res.status(), `${address} is not found`).toBe(404);
});
