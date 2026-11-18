// The test configuration of the admin area (#42, #67): the settings the site
// tests serve the production build with, shared by playwright.config.ts (which
// puts them on the web server) and the admin steps (which sign in with them).
//
// Admins sign in to their Account (#67): Admin is a role an Account holds,
// decided on every request from ADMIN_ALLOW_LIST by the Account's verified
// email, so the admin area runs on Accounts' settings (./account-settings.ts)
// plus the allow-list. The Account test-only sign-in (ACCOUNT_TEST_SIGN_IN=on)
// signs Admins in too. The Passage editor reads and publishes Passages and
// Phrases in the run's own Postgres (#171, ./passages-in-the-test-database.ts).

import { ACCOUNT_SETTINGS } from "./account-settings";
import { APP_LINK_SETTINGS } from "./app-link-settings";

/** On the Admin allow-list in the test configuration. */
export const ADMIN_EMAIL = "admin@saaliheen.test";
/** Signs in fine, but is not on the Admin allow-list. */
export const NON_ADMIN_EMAIL = "reader@saaliheen.test";

/** The settings every admin test server runs with, the test-only sign-in aside. */
export const ADMIN_SETTINGS: Record<string, string> = {
  ...ACCOUNT_SETTINGS,
  ADMIN_ALLOW_LIST: ADMIN_EMAIL,
};

/** The test server's Tafsir reload secret, which a Tafsir load sends to refresh it (#233, ADR 0054). */
export const TAFSIR_RELOAD_SECRET = "tafsir-reload-test-secret";

/** The site tests' own server: the admin settings with the Account test-only sign-in on, and the app links' test team and certificate (#76), and the Tafsir reload secret. */
export const TEST_SERVER_SETTINGS: Record<string, string> = {
  ...ADMIN_SETTINGS,
  ...APP_LINK_SETTINGS,
  ACCOUNT_TEST_SIGN_IN: "on",
  TAFSIR_RELOAD_SECRET,
};
