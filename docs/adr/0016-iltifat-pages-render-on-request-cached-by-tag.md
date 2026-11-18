Amended by [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md): every page that shows Saaliheen's data renders this way, warmed after each deploy and publish.
Amended by [0026](0026-link-previews-of-pages-that-read-neon-are-drawn-on-request.md): the Iltifat pages' Link previews read Neon on request too, never at build.

# The Iltifat pages render on request, from Neon cached by tag

The Iltifat pages are the first pages to read Neon ([0011](0011-all-data-in-neon-behind-the-versioned-api.md), [0012](0012-iltifat-live-only-in-neon.md)). They read through `apps/web/src/iltifat/iltifat.ts`, wrapped by `apps/web/src/iltifat/cached.ts` in Next's data cache (`unstable_cache`) under tags: `iltifat-overview` for the overview's counts and `iltifat-direction-<direction>` for each direction page's Iltifat. A save of an Iltifat refreshes `iltifatTags(direction)`, the overview's tag and its direction's, with `revalidateTag(tag, { expire: 0 })`, so the next request reads the save: the save is a Route Handler, where `updateTag` is not available, Next 16 deprecates the one-argument `revalidateTag`, and the recommended `"max"` profile would serve the page from before the save once more. Nothing refreshes on a timer.

The pages are not prerendered at build. A direction page lists no static params and is rendered on its first request, then kept as a static page under its tag. The overview waits on `connection()` and is rendered on each request from its cached counts. The deploy builds before it runs `db:migrate`, and `pnpm build` runs without a database, so a page that read Neon at build would fail on the first deploy of a new table, and on every build without one. Their Ayahs come from the generated Surah files, which their output trace includes, as for the Share pages.

Each cache entry is keyed by the deployment (`VERCEL_DEPLOYMENT_ID`), since the data cache can outlive a deployment whose content migrations change the Iltifat.

## Considered Options

- `"use cache"` with `cacheTag`: it needs `cacheComponents`, which changes how every page of the site renders (route segment configs such as `dynamicParams`, request-time data inside Suspense). Turning it on is a decision for the whole site, not for the first pages to read Neon. When it is turned on, `cached.ts` becomes `"use cache"` functions with the same tags.
- Prerendering the pages at build from Neon: rejected, for the deploy order and database-less builds above.
- `dynamic = "force-dynamic"`: rejected, as it also bypasses the data cache, so every visit would query Neon.
