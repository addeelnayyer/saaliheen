// Better Auth (#66, ADR 0008): Account sign-in with Google and Apple, the
// session answer (/api/v1/auth/get-session) and sign-out, at /api/v1/auth.
// Like every /api/v1 answer, each carries the Min-App-Version header (#70).

import { getAuth } from "@/account/auth";
import { withMinAppVersion } from "../../respond";

const handle = async (request: Request) => withMinAppVersion(await getAuth().handler(request));

export { handle as GET, handle as POST };
