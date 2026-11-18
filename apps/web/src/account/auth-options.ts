// Better Auth's options for Accounts (#66, ADR 0008): Accounts and their
// sign-ins in Postgres (DATABASE_URL), sign-in with GitHub, Google and Apple,
// one Account per verified email whichever method a person signs in with, and
// the Account test-only sign-in while the test configuration switches it on,
// and the bearer token the mobile app answers with instead of a cookie (#70).
// The mobile app signs in itself (#75, ADR 0048): the device's Google or Apple
// sheet gives it an id token, which Better Auth's native sign-in checks against
// the app's own client ids as well as the website's; its requests name its
// scheme, saaliheen://, which is trusted beside the website, in an
// expo-origin header the expo() plugin reads as their origin.
// GitHub is for Admins only (#67): a GitHub sign-in whose verified email is not
// on the Admin allow-list is refused before any Account is made or linked.
// Shared by the site (./auth.ts) and `pnpm db:migrate`, which applies the
// schema these options need.

import { expo } from "@better-auth/expo";
import type { BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { bearer } from "better-auth/plugins/bearer";
import { isAdmin } from "../admin/settings.ts";
import { allahReferencesSchema } from "../allah-references/schema.ts";
import { conversationsSchema } from "../quran-chat/conversations.ts";
import { accountDatabase } from "./database.ts";
import { SIGNED_IN_COOKIE } from "./signed-in-mark.ts";
import { syncedReadingPlacesSchema } from "./synced-reading-places.ts";
import { syncedSettingsSchema } from "./synced-settings.ts";
import { accountTestSignIn } from "./test-sign-in.ts";
import { accountTestSignInOn, AUTH_BASE_PATH, METHODS, methodApp } from "./settings.ts";

/**
 * Whether the session cookie is a Secure one: so when the site's address
 * (BETTER_AUTH_URL) is https, or, without one, on any Vercel deployment,
 * which only serves https; not when the build is served over plain http,
 * as the site tests serve it.
 */
function secureCookies() {
  const url = process.env.BETTER_AUTH_URL;
  return url ? url.startsWith("https:") : process.env.VERCEL === "1";
}

/** The mobile app's own scheme (apps/mobile/app.json), which its requests name as their origin. */
export const APP_SCHEME = "saaliheen://";

/** The mobile app's bundle identifier on iOS (apps/mobile/app.json), the audience of the id tokens Sign in with Apple gives it. */
const APP_BUNDLE_IDENTIFIER = "com.saaliheen.app";

/** The ids of the mobile app's own Google clients (iOS, Android), GOOGLE_NATIVE_CLIENT_IDS, comma-separated. */
const googleNativeClientIds = () => (process.env.GOOGLE_NATIVE_CLIENT_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);

type ProviderApp = { clientId: string; clientSecret: string };

/**
 * What each method's app also accepts from the mobile app's native sign-in
 * (#75): Google, id tokens issued to the app's own clients beside the
 * website's; Apple, id tokens issued to the app's bundle identifier beside the
 * website's Services ID.
 */
const NATIVE: Partial<Record<(typeof METHODS)[number], (app: ProviderApp) => object>> = {
  google: (app) => ({ clientId: [app.clientId, ...googleNativeClientIds()] }),
  apple: (app) => ({ appBundleIdentifier: APP_BUNDLE_IDENTIFIER, audience: [app.clientId, APP_BUNDLE_IDENTIFIER] }),
};

/** The configured sign-in methods' apps, by method; a method with no app id and secret is left out. */
function socialProviders(): BetterAuthOptions["socialProviders"] {
  return Object.fromEntries(METHODS.flatMap((method) => {
    const app = methodApp(method);
    return app ? [[method, { ...app, ...NATIVE[method]?.(app) }]] : [];
  }));
}

type ValidateUserInfo = NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]>;

/** Set the signed-in mark with every new session, lasting as long as a session; clear it on signing out or deleting the Account. */
const signedInMark = createAuthMiddleware(async (ctx) => {
  const options = { path: "/", httpOnly: false, sameSite: "lax" as const, secure: secureCookies() };
  if (ctx.context.newSession) ctx.setCookie(SIGNED_IN_COOKIE, "1", { ...options, maxAge: ctx.context.sessionConfig.expiresIn });
  else if (ctx.path === "/sign-out" || ctx.path.startsWith("/delete-user")) ctx.setCookie(SIGNED_IN_COOKIE, "", { ...options, maxAge: 0 });
});

/**
 * Refuse a GitHub sign-in by anyone not on the Admin allow-list. Better Auth
 * asks this before it makes an Account, links a sign-in to one, or signs in
 * again through one, for a provider's real answer and the test sign-in alike.
 */
export const githubForAdminsOnly: ValidateUserInfo = ({ user: account, source }) => {
  if (source.oauth?.providerId !== "github") return;
  const email = typeof account.email === "string" ? account.email : "";
  if (!isAdmin(email)) return { error: "not_an_admin", errorDescription: "GitHub sign-in is for Admins only" };
};

export function accountAuthOptions(): BetterAuthOptions {
  const testing = accountTestSignInOn();
  return {
    appName: "Saaliheen",
    basePath: AUTH_BASE_PATH,
    secret: process.env.BETTER_AUTH_SECRET,
    database: accountDatabase(),
    socialProviders: socialProviders(),
    // Apple answers by posting its form back from its own origin; the mobile
    // app names its own scheme (#75). Expo Go's exp:// is never trusted.
    trustedOrigins: ["https://appleid.apple.com", APP_SCHEME],
    // The same person, by their verified email, is one Account whichever method they sign in with.
    account: { accountLinking: { enabled: true, trustedProviders: [...METHODS] } },
    // A signed-in person deletes their Account at once (#68): the Account, its
    // sign-ins and its sessions on every device, with no grace period. Better
    // Auth asks for a session made in the last day, as a password stands in
    // for elsewhere.
    user: { validateUserInfo: githubForAdminsOnly, deleteUser: { enabled: true } },
    // Without BETTER_AUTH_URL, this site's origin is the one the browser asked
    // for, as the proxy in front (Vercel's, or Next's own server) says.
    advanced: { trustedProxyHeaders: true, useSecureCookies: secureCookies() },
    // The site tests sign many browsers in from one address at once.
    rateLimit: testing ? { enabled: false } : undefined,
    // The mobile app signs in for a bearer token (set-auth-token) and sends it
    // as Authorization: Bearer; the synced settings' (#70) and Reading places' (#71)
    // tables come with `pnpm db:migrate`, and so do Allah references' (#147)
    // and Quran Chat's Conversations' (#79).
    // The signed-in mark (#192, ./signed-in-mark.ts) follows the session cookie.
    hooks: { after: signedInMark },
    plugins: [bearer(), expo(), syncedSettingsSchema(), syncedReadingPlacesSchema(), allahReferencesSchema(), conversationsSchema(), ...(testing ? [accountTestSignIn()] : [])],
  };
}
