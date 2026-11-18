// The params of a page under a Language that is prerendered in each of the
// site's Languages. The layout says none (layout.tsx): a page that reads
// Neon (#170) is rendered on request, not at build (ADR 0020), and a
// layout's params bind every page below it, even one with no params of its
// own to leave out.

import { LANGUAGES } from "@/dataset/reader";

/** Each of the site's Languages, as a page's params. */
export const languageParams = () => LANGUAGES.map((lang) => ({ lang }));
