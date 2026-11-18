# A Grammar page arrives with its first part and fills in from Grammar parts

A Grammar page sets out a whole Surah as a Surah page does, and more: each Word carries its Arabic in both Scripts, its Word meaning and its Grammar line ([0064](0064-word-grammar-is-the-quranic-arabic-corpus-used-as-published-beside-quls-roots.md)), so Al-Baqarah's is some 6,100 Words, each three lines of markup. [#278](https://github.com/addeelnayyer/quran-word-by-word/issues/278) asks that a long Surah's Grammar page show its first Ayahs quickly and fill in the rest behind a skeleton.

However it is reached, a Grammar page's HTML carries its first Grammar part, then a skeleton; parts 2 onwards are fetched from `/parts/{lang}/grammar/{surah}/{n}.json`, by the one hook every page opened in parts uses (`apps/web/src/app/[lang]/in-parts/use-parts.ts`, [0005](0005-surahs-open-in-parts-inside-the-app.md), [0014](0014-theme-pages-open-in-parts-inside-the-app.md)). A Grammar part is cut as its Surah's parts are (`surahParts`: at most 60 Words first, then at most 400), and each holds, in the page's Language only, every Word with its Grammar line, each Ayah's Ayah translation and the Passage beginning at it (`apps/web/src/grammar/parts.ts`). Like the Surah and Theme parts, each file is made from Neon on its first request and then served from the cache ([0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)); part 1 has no file. A Grammar page keeps its parts only while it is open, as a Theme page does.

This departs from 0005 and 0014, where a page loaded directly, reloaded or crawled carries everything in its HTML and only an in-app link opens it in parts, through an `rsc: 1` rewrite to an opening page. A Grammar page has no in-app link yet (Explore's entry and the Surah list come with [#279](https://github.com/addeelnayyer/quran-word-by-word/issues/279)), so a direct load is the only way in, and it is the load that must be quick.

## Consequences

- A crawler, and a reader without scripts, gets a Grammar page's first part only. A Grammar page is studied, not searched for; a Surah page, which a crawler gets whole, holds the same Ayahs.
- A link to a Word location beyond the first part, and Back or Forward to a place beyond it, land at the top until the hook learns to land there, as it does for a Surah; that waits on the in-app links of #279.
- A Grammar page's Ayahs are its own markup, not a Surah page's Word cards: the Phrase colours, Allah reference colour, Known words colour and Hide Word meanings are drawn on those cards only, so none of them reach a Grammar page without a rule of its own.
- A Grammar page and its parts read the Passages, so a Publish's Passage tag remakes them on their next request; but neither the deploy's warm-up nor a Publish asks for them (`apps/web/src/passages/addresses.ts`), so their first reader after either waits for Neon. They can join those addresses when #279 links to them.

## Considered Options

- The whole Surah in the HTML, as #275 shipped it: Al-Baqarah's page then waits for all of it, which is what #278 rules out.
- An `rsc: 1` opening page as 0005's and 0014's: it speeds only an in-app link, of which a Grammar page has none yet; it can be added beside this when #279 brings them, the parts and the hook unchanged.
