// The site's Better Auth instance (#66), made on the first request that needs
// it, never at build time, so the build needs none of Accounts' settings.

import { betterAuth } from "better-auth";
import { accountAuthOptions } from "./auth-options";

let auth: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  auth ??= betterAuth(accountAuthOptions());
  return auth;
}
