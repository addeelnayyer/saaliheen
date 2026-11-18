// The Themes list's and a Theme page's addresses (#130, #129): `/<lang>/themes`
// and `/<lang>/themes/<slug>`, the same in both Languages apart from the Language.

import type { Language } from "@/dataset/reader";

/** The Themes list's address without the Language, as the site bar takes it. */
export const THEMES_ADDRESS = "/themes";

/** A Theme page's address without the Language, as the site bar takes it. */
export const themeAddress = (slug: string) => `${THEMES_ADDRESS}/${slug}`;

export const themesListPath = (lang: Language) => `/${lang}${THEMES_ADDRESS}`;

export const themePath = (lang: Language, slug: string) => `/${lang}${themeAddress(slug)}`;
