// The test configuration of Accounts (#66): the settings the site tests serve
// the production build with, shared by the admin settings (./admin-settings.ts,
// which playwright.config.ts puts on the web server) and the Account steps
// (which sign in with them).
//
// Accounts live in Postgres (ADR 0008): in production Neon's, whose
// connection string the Vercel Marketplace integration sets as DATABASE_URL;
// here the run's own Postgres (./test-database.ts). Sign-in runs on Better
// Auth, mounted at /api/v1/auth. Admins sign in to their Account too (#67),
// GitHub offered to them only, so GitHub's app is one of Accounts' settings.
//
// ACCOUNT_TEST_SIGN_IN=on switches the Account test-only sign-in on, for
// readers and Admins alike. Nothing but this test configuration sets it, and
// the site refuses it on any Vercel deployment (`VERCEL=1`). The GitHub,
// Google and Apple app ids are placeholders: a test only follows the browser
// as far as the provider's sign-in page, never signs in there.

import { testDatabase } from "./test-database";

export const ACCOUNT_GITHUB_CLIENT_ID = "saaliheen-test-github-accounts-app";
export const ACCOUNT_GOOGLE_CLIENT_ID = "saaliheen-test-google-accounts-app";
export const ACCOUNT_APPLE_CLIENT_ID = "com.saaliheen.test.accounts";

/** The settings every Account test server runs with, the test-only sign-in aside. */
export const ACCOUNT_SETTINGS: Record<string, string> = {
  DATABASE_URL: testDatabase(Number(process.env.PORT)).url, // the run's own Postgres
  BETTER_AUTH_SECRET: "site-tests-only-accounts-secret-never-used-in-production-0123456789",
  GITHUB_CLIENT_ID: ACCOUNT_GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: "saaliheen-test-github-accounts-secret",
  GOOGLE_CLIENT_ID: ACCOUNT_GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: "saaliheen-test-google-accounts-secret",
  APPLE_CLIENT_ID: ACCOUNT_APPLE_CLIENT_ID,
  APPLE_CLIENT_SECRET: "saaliheen-test-apple-accounts-secret",
};
