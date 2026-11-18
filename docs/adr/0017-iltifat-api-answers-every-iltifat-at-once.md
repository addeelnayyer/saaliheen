# /api/v1/iltifat answers every Iltifat at once, on request, from the overview's cache

The mobile app reads the Iltifat over the versioned API ([0011](0011-all-data-in-neon-behind-the-versioned-api.md), [0012](0012-iltifat-live-only-in-neon.md)). `GET /api/v1/iltifat` answers them all in one JSON answer, needing no Account: `iltifat`, every Iltifat in Quran order (Surah, run, cited Ayah, then id), Disputed ones included, and `counts`, each Iltifat direction's counted and Disputed Iltifat in the overview's order. 326 Iltifat are small enough to cache whole on the device, and an app finds the Iltifat cited at any Ayah, or those of one direction, from this answer alone, so there are no per-Ayah or per-direction endpoints. Each Iltifat carries `markedWords`, an empty list until Marked Words are kept (#143), so the shape does not change when they are.

The Route Handler reads no request but is not prerendered (`ƒ` in the build's route table): Next.js 16 does not cache a `GET` Route Handler unless it opts in, and opting in with `force-static` would read Neon at build, which [0016](0016-iltifat-pages-render-on-request-cached-by-tag.md) rules out. It runs on each request and reads through `apps/web/src/iltifat/cached.ts`: the list as `cachedEveryIltifat`, the counts as the overview's `cachedIltifatCounts`, both under the overview's tag `iltifat-overview` and keyed by the deployment, as [0016](0016-iltifat-pages-render-on-request-cached-by-tag.md) describes. Every save of an Iltifat refreshes that tag, whatever its direction, so the next answer after a save reads Neon once and shows it.

## Considered Options

- An endpoint per Ayah or per direction: more requests for an app that wants them all, and a cache entry per key.
- Its own tag for the list: every save would have to refresh it as well as the overview's, for no gain, since both change on every save.
- `force-static`: rejected, as above.
