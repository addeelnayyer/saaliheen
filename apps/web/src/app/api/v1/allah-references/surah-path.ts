// The Surah an Allah references path names (#150, #153, #154), shared by the
// Allah references endpoint and its revisions.

import { apiError } from "../respond";
import { NOT_A_SURAH } from "../surah-number";

export { surahOf } from "../surah-number";

/** The answer to a path naming no Surah. */
export const notASurah = () => apiError(404, NOT_A_SURAH);
