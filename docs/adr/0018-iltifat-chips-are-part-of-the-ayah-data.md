# Iltifat chips are part of the Ayah data, read under the Iltifat overview's tag

An Ayah in Study shows a chip for each Iltifat cited at it (#140). `AyahSection` is memoised and drawn by two renderers: the Surah page, on the server, and a Surah opened in parts ([0005](0005-surahs-open-in-parts-inside-the-app.md)), in the browser from the part files. A chip is therefore part of the Ayah each of them is handed, never a lookup the server alone makes: `PartAyah` carries an optional `iltifat` (id, Iltifat direction, Disputed) on the Ayah an Iltifat is cited at, and absent on every other. The Surah page and the parts route fill it with `withIltifatChips` (`apps/web/src/iltifat/mark.ts`), as Allah references fill their Words ([0014](0014-allah-reference-tables.md)). The dataset build never writes it, so the committed dataset and `/data/v1` are unchanged.

The chips come from the one cached read the Iltifat pages and `/api/v1/iltifat` share, `cachedEveryIltifat`, under the `iltifat-overview` tag ([0016](0016-iltifat-pages-render-on-request-cached-by-tag.md), [0017](0017-iltifat-api-answers-every-iltifat-at-once.md)). A save of any Iltifat already refreshes that tag, so the Surah pages and part files that cite it are regenerated with the Iltifat pages, with no tag of their own and no change to `iltifatTags`. The Surah page and the parts stay static, as ADR 0016 allows Allah references to: when `DATABASE_URL` is unset, or Neon does not answer in five seconds, a Surah is built without chips and the next revalidation fills them in.

A chip is a link to `/{lang}/iltifat/{direction}#iltifat-{id}`, English and left to right in either Language, in the footer that also holds the Ayah's Theme chips. Flowing hides the footer.

## Considered Options

- A client fetch of `/api/v1/iltifat` for the chips: rejected, as every Ayah of the page would draw without chips first, and a crawler would never see them.
- A tag of its own per Surah, as Allah references have: rejected; the overview's tag is already refreshed by every save, and a save moving an Iltifat between Surahs would otherwise have to name both.
