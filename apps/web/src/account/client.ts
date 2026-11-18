// Better Auth's client for the site's pages (#66): it talks to /api/v1/auth on
// the page's own origin, so a page can stay static and still learn, in the
// browser, whether this browser is signed in to an Account.

import { createAuthClient } from "better-auth/react";
import { AUTH_BASE_PATH } from "./settings";

export const accountClient = createAuthClient({ basePath: AUTH_BASE_PATH });
