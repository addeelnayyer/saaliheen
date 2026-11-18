// A Grammar page's address (#275), as Explore, the picker and the foot link to it (#279): `/<lang>/grammar/<surah>`, the same in both
// Languages apart from the Language; and the Grammar guide's (#280), `/<lang>/grammar/guide`.

import type { Language } from "@/dataset/reader";

/** The Grammar page of Surah `surah` in `lang`. */
export const grammarPath = (lang: Language, surah: number) => `/${lang}/grammar/${surah}`;

/** The Grammar guide in `lang`. */
export const grammarGuidePath = (lang: Language) => `/${lang}/grammar/guide`;
