// The Supplications page's address (#199): `/<lang>/supplications`, the same in
// both Languages apart from the Language.

import type { Language } from "@/dataset/reader";

/** The page's address without the Language, as the site bar takes it. */
export const SUPPLICATIONS_ADDRESS = "/supplications";

export const supplicationsPath = (lang: Language) => `/${lang}${SUPPLICATIONS_ADDRESS}`;
