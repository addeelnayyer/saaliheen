Amended by [0034](0034-the-app-keeps-a-surahs-allah-references-beside-it-and-takes-a-new-version-at-open.md): a kept Surah opened online also asks for its Allah references, waiting at most 3 seconds, and still opens from its file.
Amended by [0062](0062-the-app-keeps-a-surahs-particle-files-beside-it-noted-by-the-surahs-hash.md): a kept Surah keeps the particle files its Words name beside it.
# Offline Surahs are kept as files and refreshed by manifest hash

The mobile app reads Surahs from `/data/v1`, whose URLs and JSON shapes stay as they are for it ([0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md)), and a Surah a reader has opened must open again with no connection (#73). The app keeps each Surah the first time it is opened: its `/data/v1/surahs/<n>.json`, byte for byte as downloaded, is written to the app's document directory under its `/data/v1` path (`DeviceFiles`, `src/config.ts`), with the SHA-256 of those bytes beside it (`surahs/<n>.json.sha256`). Opening a kept Surah reads the file and makes no request. Only opened Surahs are kept; nothing downloads the whole Quran ahead of the reader. The Surah index (`/data/v1/surahs.json`) is kept the same way but read from the network first, falling back to the kept copy offline, so the index lists every Surah offline and gives a Surah's Skeleton while that Surah downloads.

At launch and whenever the connection comes back, `checkForUpdates` reads `/data/v1/manifest.json`. For each Surah the device keeps, it compares the manifest's hash with the kept hash and downloads again only those that differ, so an Admin's Passage edit, which changes only its own Surah's file and hash, reaches offline readers at the cost of one Surah. With no connection it changes nothing and shows no Update prompt.

The Update prompt shows when the app's version (app.json's `version`, read from `Constants.expoConfig.version`) is below the manifest's `minAppVersion`, compared numerically part by part, a missing part counting as 0: `1.9.0` is below `1.10.0`. The reader can dismiss it and keep reading the Surahs they have; it shows again at the next check.

Opening a Surah that is not kept while there is no connection rejects with `SurahNotDownloaded`, whose message, in the Language, names the Surah and says it needs a connection to download. It is the one interface message shown in the Language rather than English (`CONTEXT.md`, Language): a reader reading in Urdu must understand why the Surah is not there to do anything about it. Its Urdu is drafted copy for a Scholar to check.

## Consequences

- The hash is computed on the device from the bytes it keeps (`@noble/hashes`, pure JavaScript, so `src/quran-analysis.ts` still runs in Node for the scenarios), because a Surah is first opened before any manifest has been read. It must be the hash of exactly the bytes served, which `publishedFile` and the manifest already guarantee. When Surahs move into Neon ([0011](0011-all-data-in-neon-behind-the-versioned-api.md)), the hash column [0020](0020-pages-read-neon-on-request-warmed-after-each-deploy-and-publish.md) stores must stay the SHA-256 of the bytes the `/data/v1` Route Handler sends; otherwise every kept Surah downloads again at every check.
- A kept file whose hash file was never written (the app stopped between the two writes) is never refreshed until it is opened from a new install; the Surah file is written first so the opposite case, a new hash over an old file, cannot happen.
- Root dialogs and Recitations are not kept offline; that is later work and would follow the same layout (`roots/<n>.json`, `recitations/<n>.json`).
- Raising `MIN_APP_VERSION` (`packages/dataset/src/published.ts`) is how a dataset change that old apps cannot read reaches them as an Update prompt; app.json's `version` starts at 1.0.0 to match today's minimum.

## Considered Options

- Keeping Surahs in AsyncStorage: its values are meant to be small, and the largest Surah file (Al-Baqarah) is over a megabyte.
- Recording the manifest's hash at download time instead of hashing on the device: the first open of a Surah reads no manifest, so the app would have to fetch it on every first open or re-download Surahs of unknown hash at the next check.
- Refreshing when `datasetVersion` changes: it changes with any published file, so every kept Surah would download again after any Admin edit.
- Downloading every Surah ahead of time: one large first download that most readers never need.
