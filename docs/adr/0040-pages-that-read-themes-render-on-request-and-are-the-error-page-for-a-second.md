Amends [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md), [0024](0024-surah-pages-and-parts-take-any-params-so-a-refreshed-tag-renders-them.md) and [0026](0026-link-previews-of-pages-that-read-neon-are-drawn-on-request.md).

# Pages that read Themes render on request, and are the error page for a second when Neon cannot answer

Themes are read from Neon ([0037](0037-themes-are-three-content-tables-loaded-once.md), #170) through one server-side data layer, `apps/web/src/themes/` (`themes.ts` reads, `cached.ts` keeps each read in Next's data cache keyed by the deployment, `VERCEL_DEPLOYMENT_ID`, and tagged `themes` or `theme-<slug>`). Every page that shows them reads them on request, never at build ([0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)): the Themes list, Explore (its count of Theme categories), the Theme pages, Theme openings and Theme parts, the Theme pages' Link preview pictures, the Surah pages, Surah openings and Surah parts (each Ayah's Theme chips), and `/data/v1/surahs/<n>.json` and `/data/v1/manifest.json` (each Ayah's `themes`). Each page and file is made on its first request and then served from the cache (`x-nextjs-cache: HIT`); `pnpm build` prerenders none of them, so it still runs without a database.

- A page or file with params of its own lists none (`generateStaticParams` gives `[]`), takes any (`dynamicParams = true`) and checks its own ([0024](0024-surah-pages-and-parts-take-any-params-so-a-refreshed-tag-renders-them.md)): a Language (`isLanguage`), a Surah number as the Surah list writes it, a Theme's slug, a Theme part from the second on.
- A layout's params bind every page below it, and the Themes list and Explore have no params of their own to leave out. So `/[lang]/layout.tsx` lists no Languages; each page prerendered in both Languages lists them itself (`apps/web/src/app/[lang]/language-params.ts`) with `dynamicParams = false`.
- `/data/v1/manifest.json` hashes the Surah files as they are served, Themes merged from Neon, so its hashes match their bytes, through a cached read tagged `themes`. It has no params of its own to leave out, so it takes its name as one (`/data/v1/[file]`, answering only `manifest.json`): rendered on every request instead, it would carry no `s-maxage` a CDN may cache it by. The hash is made once per cache entry, not stored: 0020's hash column comes with the Quran text's move.
- The output traces in `next.config.ts` name what each of these reads while the site runs: the Surah files, the Recitation timings, and for the manifest the Root files too; none names the Themes file.

When Neon cannot answer and the page is not in the cache, a page shows the error page with a Retry (0020). Next.js answers a failed render of a page rendered on request and then cached with a bare `Internal Server Error`, not the page's `error.tsx`, so such a page catches its failed read (`orUnavailable`, `apps/web/src/themes/unavailable.ts`) and draws the error page itself (`apps/web/src/app/[lang]/unavailable-page.tsx`), answering 200 and never indexed (the error page puts its own robots `noindex` in the head, whatever the page's metadata says). To keep that page out of the cache, it also makes a cached read with `revalidate: 1`, which shortens the page's own time in the cache to a second; the request after that renders it again. A page rendered on every request (an Iltifat page) still fails into `apps/web/src/app/[lang]/error.tsx`, which shows the same message and Retry. A Surah or Theme part answers 500 and its page's own Retry asks again ([0005](0005-surahs-open-in-parts-inside-the-app.md)).

## Consequences

- A Theme page's `generateImageMetadata` answers no picture without a slug, as at build ([0026](0026-link-previews-of-pages-that-read-neon-are-drawn-on-request.md)), and no picture when Neon cannot answer, so the Theme page is its error page rather than failing.
- The error page is served stale while it is rendered again: once Neon is back, the first Retry may still get the error page and the next gets the page.
- A Surah page no longer builds with Neon unreachable and fills its gold in later (#147): its Themes come from Neon too, so it is the error page until Neon answers. Its Allah references still fall back to none.
- Until 0020's warm-up (#170, AC-5) runs after each deploy, the first reader of each page waits for one render.

## Considered Options

- Throwing from the page into `error.tsx`: Next.js never shows it for a page rendered on request and then cached, only the bare text.
- Rendering these pages on every request (`connection()`): `error.tsx` would show, but every page would read the data cache and render on each request, with no `x-nextjs-cache` HIT and no CDN caching.
- A page-level `generateStaticParams` giving `[]` under the layout's Languages: Next.js still prerenders a page with no params of its own for each of its layout's params sets.
