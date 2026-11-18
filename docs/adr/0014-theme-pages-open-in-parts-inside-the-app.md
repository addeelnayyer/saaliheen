# Theme pages open in parts inside the app, by the Surahs' mechanism

A Theme page lists every Ayah of its Theme, and the largest, Disbelief, has 947, each in both Scripts with its Ayah translation; opening it from a Theme chip waited for the whole page ([#131](https://github.com/addeelnayyer/quran-word-by-word/issues/131)). Now a Theme page opened from inside the app (a Theme chip, the Themes list, the Language switch, Back and Forward) loads in parts by the mechanism [0005](0005-surahs-open-in-parts-inside-the-app.md) set up for Surahs, with no second one beside it; a Theme page loaded directly, reloaded or crawled still has every Ayah in its HTML.

What it reuses from 0005, unchanged: the `rsc: 1` header tells the app's router's requests from a browser loading the page, and a second `beforeFiles` rewrite in `next.config.ts` sends the router's requests for `/{lang}/themes/{slug}` to `/{lang}/opening/themes/{slug}`, keeping the address bar on `/{lang}/themes/{slug}`. The parts are static JSON prerendered from the dataset, one Language each, under `/parts/`: a Theme's at `/parts/{lang}/themes/{slug}/{n}.json`, beside the Surahs' `/parts/{lang}/{surah}/{n}.json`. One client hook (`apps/web/src/app/[lang]/in-parts/use-parts.ts`) fetches either kind in order, a few ahead, with one timeout before Retry; one visits store (`in-parts/visits.ts`), keyed by the Navigation API's history entry, lets Back and Forward land where the visit was left.

What is the Theme page's own:

- **Theme parts** are cut on Passage-group edges, so a group is never split: runs of whole, consecutive groups, the first holding at most 20 Ayahs and each later one at most 150, by the same rule as Surah parts (`themeParts` beside `surahParts` in `@saaliheen/dataset/parts`). A Theme of up to 20 Ayahs is a single part; Disbelief is eight, its first 18 Ayahs. Ayahs, not Words, are the measure, since a Theme page shows no Word cards.
- **The first part comes with the page.** The opening page carries the header (name, Theme category, count of Ayahs) and the first part's Passage groups, then a skeleton; parts 2 onwards are fetched. A Surah opening carries none of its Ayahs, since a Surah may open at a Reading place far into it; a Theme page has no Reading place, so it always opens at its top.
- **Back and Forward** keep the skeleton until the part holding the Ayah that visit was left at has arrived, then land on it. The visit is noted on the whole page too, so Back to a Theme page first loaded directly lands where it was left.
- **No Reading place.** A Theme page moves no Reading place, opened in parts or whole.
- **Parts are kept only while the page is open.** A Surah's parts stay in memory for the last three Surahs, so Back to one shows it at once; a Theme page's are fetched again on Back and Forward (from the browser's HTTP cache when it has them), so a few large Themes' Ayahs in both Scripts do not stay in memory.

The Themes themselves are Saaliheen's own data, imported once from quran-says with cleanup ([0012](0012-themes-imported-once-from-quran-says.md)): a one-off import wrote the Themes file, merging, dropping and renaming tags and drafting Urdu names, and from then on the file, not quran-says, is the source. That decision stands as 0012 records it; this one adds only how a Theme page is delivered.

## Consequences

- The Theme parts are new static JSON, interim like the Themes file they are cut from. When Themes move into Neon under [0011](0011-all-data-in-neon-behind-the-versioned-api.md), the Theme parts move with them: the same split, served from the server-side data layer behind the same addresses, or a versioned API shape if the clients need one.
- A change to the opening mechanism (the rewrite, the hook, the visits) changes Surahs and Theme pages together; `features/site/surah-opening.feature` and `features/site/theme-opening.feature` both guard it. 0005's warning holds for both rewrites: should Next move RSC requests to their own `.rsc` addresses, both stop matching and both features fail.
- Theme chips and the Themes list's links are in-app links, not prefetched (a Surah has hundreds of chips; the list has 258 Themes).

## Considered Options

- A second, Theme-only loader: rejected by the issue, and it would let the two openings drift apart on timeouts, Retry and Back.
- Theme parts cut by Word count, like Surah parts: rejected because a Theme page draws each Ayah as one line of text, not as Word cards, so its weight follows its Ayahs.
- A first Theme part fetched like the rest: rejected because the header and first groups would then wait for a second request, and the page would open as a skeleton only.
- Keeping Theme parts in memory like Surahs': rejected for now; a Theme page on Back lands where it was left once its part arrives, which the HTTP cache makes quick, without holding the largest Themes in memory.
