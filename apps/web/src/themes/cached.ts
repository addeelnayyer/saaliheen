// The Themes as every page that shows them reads them (#170, ADR 0016, ADR
// 0020): ./themes.ts's reads, kept in Next's data cache under tags, so that a
// page reads Neon once and then the cache until its tag is refreshed. There is
// no refresh on a timer. `THEMES_TAG` holds what every Theme feeds (the Themes
// list, Explore's count, the Theme chips, the Link previews' names and counts,
// and the published Surah files); `themeTag(slug)` one Theme page's read.

import { unstable_cache } from "next/cache";
import { everyAyahThemes, themeIndex, themeWithAyahs } from "./themes.ts";

/** The tag of every read a change to any Theme changes: the index and every Ayah's Themes. */
export const THEMES_TAG = "themes";

/** The tag of Theme `slug`'s own read, its Theme page's. */
const themeTag = (slug: string) => `theme-${slug}`;

// The data cache can outlive a deployment, and a deployment's content
// migrations may change the Themes: each deployment keeps its own entries. Off
// Vercel, each build does (BUILD_TIME, next.config.ts), so a build never reads
// what an earlier build's server left in .next/cache.
export const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.BUILD_TIME ?? "local";

/** Every Theme category and Theme, as `themeIndex` gives them, cached under `THEMES_TAG`. */
export const cachedThemeIndex = unstable_cache(() => themeIndex(), ["theme-index", DEPLOYMENT], { tags: [THEMES_TAG] });

/** Every Ayah's Themes, as `everyAyahThemes` gives them, cached under `THEMES_TAG`. */
export const cachedAyahThemes = unstable_cache(() => everyAyahThemes(), ["every-ayah-themes", DEPLOYMENT], { tags: [THEMES_TAG] });

/** Theme `slug` with its Ayahs, as `themeWithAyahs` gives it, cached under the Theme's own tag. */
export const cachedThemeWithAyahs = (slug: string) =>
  unstable_cache(() => themeWithAyahs(slug), ["theme-with-ayahs", slug, DEPLOYMENT], { tags: [themeTag(slug)] })();
