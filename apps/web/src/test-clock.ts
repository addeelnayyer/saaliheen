// The server's clock as the tests control it (#80): a request's Test-Now
// header, an ISO time, is the time the server takes for now in answering it,
// so a scenario can ask on any day of any month. Only under the test
// configuration (the Account test-only sign-in's switch, never on a Vercel
// deployment); anywhere else, or when it is not a time, the header is ignored.

import { accountTestSignInOn } from "./account/settings.ts";

export const TEST_NOW_HEADER = "Test-Now";

/** Now, for answering `request`: its Test-Now under the test configuration, else the real time. */
export function requestNow(request: Request): Date {
  const asked = accountTestSignInOn() ? request.headers.get(TEST_NOW_HEADER) : null;
  const time = asked ? new Date(asked) : undefined;
  return time && !Number.isNaN(time.getTime()) ? time : new Date();
}
