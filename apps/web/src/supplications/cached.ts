// The Supplications as the Supplications page and /api/v1/supplications read
// them (#199, ADR 0027, ADR 0016): ./supplications.ts's read, kept in Next's
// data cache under one tag, so that a page or answer reads Neon once and then
// the cache until a save in the Supplication editor refreshes the tag. There
// is no refresh on a timer.

import { unstable_cache } from "next/cache";
import { everySupplication } from "./supplications.ts";

/** The tag every Supplications read is cached under, and a save refreshes. */
export const SUPPLICATIONS_TAG = "supplications";

// The data cache can outlive a deployment, and a deployment's content
// migrations may change the Supplications: each deployment keeps its own entries.
const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? "local";

/** Every Supplication and Speaker, as `everySupplication` gives them, cached under the Supplications tag. */
export const cachedEverySupplication = unstable_cache(() => everySupplication(), ["every-supplication", DEPLOYMENT], {
  tags: [SUPPLICATIONS_TAG],
});
