// The Account test-only sign-in (#66, #67): a Better Auth endpoint,
// POST /api/v1/auth/test-sign-in with { email, method, name? }, that signs a
// person in to an Account by email as if they had come back from GitHub,
// Google or Apple with that verified email. It goes through Better Auth's own
// handling of a provider's answer, so finding, creating and linking Accounts,
// and refusing GitHub to anyone not on the Admin allow-list, is exactly what a
// real sign-in does. A name given becomes the Account's name, as the one a
// provider gives (an Admin's commits carry it, #45). auth-options.ts adds it only while the test
// configuration switches it on, and it refuses otherwise too.

import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { handleOAuthUserInfo } from "better-auth/oauth2";
import { normalEmail } from "../admin/settings.ts";
import { accountTestSignInOn, isMethod, type Method } from "./settings.ts";

interface Requested {
  email: string;
  method: Method;
  /** The name a provider would give, when the test sign-in gave one. */
  name?: string;
}

/** The email, method and name a test sign-in asks for, or undefined when the body names no email and method. */
function requested(body: unknown): Requested | undefined {
  const { email, method, name } = (body ?? {}) as { email?: unknown; method?: unknown; name?: unknown };
  if (typeof email !== "string" || !email.includes("@") || !isMethod(method)) return undefined;
  return { email: normalEmail(email), method, ...givenName(name) };
}

/** The name a test sign-in gave, when it gave a non-blank one. */
function givenName(name: unknown): { name?: string } {
  const given = typeof name === "string" ? name.trim() : "";
  return given ? { name: given } : {};
}

// One test sign-in at a time: the site tests sign the same person in from many
// browsers at once, and two first sign-ins racing would each make the Account.
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const turn = queue.then(work, work);
  queue = turn.catch(() => undefined);
  return turn;
}

type Context = Parameters<typeof handleOAuthUserInfo>[0];
type SignedInAccount = NonNullable<Awaited<ReturnType<typeof handleOAuthUserInfo>>["data"]>["user"];

/** `account` with the name the test sign-in gave, as a provider's fresh name would update it. */
async function renamed(ctx: Context, account: SignedInAccount, name: string): Promise<SignedInAccount> {
  if (account.name === name) return account;
  return (await ctx.context.internalAdapter.updateUser(account.id, { name })) ?? account;
}

export const accountTestSignIn = () =>
  ({
    id: "account-test-sign-in",
    endpoints: {
      accountTestSignIn: createAuthEndpoint("/test-sign-in", { method: "POST" }, async (ctx) => {
        if (!accountTestSignInOn()) throw new APIError("NOT_FOUND");
        const asked = requested(ctx.body);
        if (!asked) throw new APIError("BAD_REQUEST", { message: "an email and a method (github, google or apple)" });
        const { email, method, name } = asked;
        const id = `test-${method}-${email}`;
        const signedIn = await oneAtATime(() =>
          handleOAuthUserInfo(ctx, {
            userInfo: { id, email, name: name ?? email, emailVerified: true, image: null },
            account: { providerId: method, accountId: id },
          }),
        );
        if (!signedIn.data) throw new APIError("UNAUTHORIZED", { message: signedIn.error ?? "not signed in" });
        const account = name ? await renamed(ctx, signedIn.data.user, name) : signedIn.data.user;
        await setSessionCookie(ctx, { ...signedIn.data, user: account });
        return ctx.json({ user: { id: account.id, email: account.email, name: account.name } });
      }),
    },
  }) satisfies BetterAuthPlugin;
