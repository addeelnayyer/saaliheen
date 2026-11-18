// Accounts' settings (#66), read from the environment while a request is
// served, never at build time: the build needs none of them, and the same
// build serves with or without them. Accounts live in Postgres (ADR 0008):
// Neon's in production, whose connection string the Vercel Marketplace
// integration sets as DATABASE_URL.

/** Where Better Auth answers. */
export const AUTH_BASE_PATH = "/api/v1/auth";

/**
 * The ways a person signs in to an Account. GitHub is for Admins only (#67):
 * the Sign-in page offers it only on its Admin entry, and a GitHub sign-in
 * whose verified email is not on the Admin allow-list is refused (./auth-options.ts).
 */
export const METHODS = ["github", "google", "apple"] as const;
export type Method = (typeof METHODS)[number];

/** The ways the plain Sign-in page offers a reader. */
export const READER_METHODS = ["google", "apple"] as const satisfies readonly Method[];

/** Each sign-in method's name as people see it. */
export const METHOD_NAMES: Record<Method, string> = { github: "GitHub", google: "Google", apple: "Apple" };

export const isMethod = (name: unknown): name is Method => (METHODS as readonly unknown[]).includes(name);

/**
 * Whether the Account test-only sign-in is on: only when ACCOUNT_TEST_SIGN_IN=on,
 * which only the site tests' configuration sets, and never on a Vercel
 * deployment (`VERCEL=1`), so no production or preview deployment can turn it on.
 */
export const accountTestSignInOn = () => process.env.ACCOUNT_TEST_SIGN_IN === "on" && process.env.VERCEL !== "1";

/** A sign-in method's app id and secret (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET, GOOGLE_…, APPLE_…). */
export function methodApp(method: Method): { clientId: string; clientSecret: string } | undefined {
  const prefix = method.toUpperCase();
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}
