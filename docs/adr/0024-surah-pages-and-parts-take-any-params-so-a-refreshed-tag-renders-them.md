Amended by [0046](0046-pages-read-each-surahs-passages-from-neon-under-its-own-cache-tag.md): the Share pages carry their Surah's `passages:<n>` tag and which Ayah runs they take depends on its Passages in Neon, so they take any params too and check them against those Passages.
Amended by [0040](0040-pages-that-read-themes-render-on-request-and-are-the-error-page-for-a-second.md): the Surah pages and parts are no longer prerendered, and their trace no longer names the Themes file.

# Surah pages and their parts take any params, so a refreshed cache tag renders them again

An Iltifat save refreshes the `iltifat-overview` tag with `revalidateTag(tag, { expire: 0 })` ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md), [0023](0023-an-iltifat-save-writes-the-iltifat-and-its-revision-in-one-transaction.md)), and the Surah pages and Surah parts carry that tag through their Iltifat chips ([0018](0018-iltifat-chips-are-part-of-the-ayah-data.md)). Next 16 drops a prerendered page whose tag has expired from its cache, and a route with `dynamicParams = false` answers a params set missing from its cache as not found (`NoFallbackError`) instead of rendering it: after the first save, every Surah page and part 404'd until the next deploy. So `/[lang]/[surah]` and `/parts/[lang]/[surah]/[part]` take any params (`dynamicParams = true`), are still prerendered for every Surah in each Language, and check their own params with `surahAddress` (`apps/web/src/app/[lang]/[surah]/surah-address.ts`): anything but a Language and a Surah number as the Surah list writes it (`/fr/1`, `/en/115`, `/en/01`) is not found, as before. Since they now render while the site is served, their output trace names what they read: the Surah files, the Recitation timings and the Themes file (`next.config.ts`).

## Consequences

- Every Surah page and part reads the whole Iltifat list under the overview's tag ([0018](0018-iltifat-chips-are-part-of-the-ayah-data.md)), so a save expires all of them, not only those that cite the saved Iltifat. The first reader of each afterwards waits for one render; the rest are served from the cache. The render reads the committed Surah files and the cached Allah references and Iltifat, the Iltifat read once from Neon for every page, so it costs about what a build's prerender of that page costs.
- An Iltifat save warms no page. [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)'s warm-up after a publish is for a publish of one Surah's data, which requests that Surah's pages; a save of one Iltifat would have to request every Surah page and part in both Languages, for a cold render that reads Neon once in all, for the Iltifat. This amends 0020 for Iltifat saves.
- An address that names no Surah (`/fr/1`, `/en/115`) is answered not found after the page starts rendering rather than before, so it costs one call of `surahAddress`.
- Any later page that carries a refreshed tag and lists its params needs the same: `dynamicParams = true` and its own check of its params.

## Considered Options

- Refreshing with the `"max"` profile, which serves the stale page once and renders it behind: the chips would show the save only on the second visit, and the issue asks for at once.
- Keeping `dynamicParams = false` and warming the pages after a save: the warm-up request meets the same not-found answer.
