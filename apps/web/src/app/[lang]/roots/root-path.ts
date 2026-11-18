// A Root page's address (#287, ADR 0065): `/<lang>/roots/<letters>`, the
// Root's letters with their spaces taken out (`/en/roots/رحم` for ر ح م), under
// the Roots list's, `/<lang>/roots` (#290).

import type { Language } from "@/dataset/reader";

/** The Roots list's address without the Language, as the site bar takes it. */
export const ROOTS_ADDRESS = "/roots";

/** Where the Roots list is in `lang`. */
export const rootsListPath = (lang: Language) => `/${lang}${ROOTS_ADDRESS}`;

/** A Root's letters as its address writes them: without their spaces. */
const addressLetters = (letters: string) => letters.replaceAll(" ", "");

/** The Root page's address without the Language, as the site bar takes it. */
export const rootAddress = (letters: string) => `${ROOTS_ADDRESS}/${addressLetters(letters)}`;

/** The Root page's address in `lang`, as a link to it takes it (#289). */
export const rootPageHref = (lang: string, letters: string) => `/${lang}${rootAddress(letters)}`;
