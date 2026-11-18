Amends [0025](0025-offline-surahs-are-kept-as-files-and-refreshed-by-manifest-hash.md): a kept Surah keeps the particle files its Words name beside it.

# The app keeps a Surah's particle files beside it, noted by the Surah's hash

In the app a rootless Word card shows a Particle tag that opens the Particle dialog, as on the website (#249, #255, [0060](0060-a-rootless-word-belongs-to-a-particle-numbered-by-frequency-and-published-beside-the-roots.md)). A Surah a reader has opened must open with no connection, so its Particle dialogs must too. Root dialogs are still read online only ([0025](0025-offline-surahs-are-kept-as-files-and-refreshed-by-manifest-hash.md)).

**Particle files.** Whenever the app keeps a Surah, the first time it is opened or again for a changed hash, it then keeps `/data/v1/particles/<id>.json` for each particle the Surah's Words name, six at a time (Al-Baqarah names over a hundred), downloading again only those a changed hash asks for and reusing any already kept. Each is kept as a Surah is, under its `/data/v1` path with its SHA-256 beside it. Only then does it write `surahs/<n>.json.particles`, holding the Surah's kept hash. A particle file that cannot be had leaves that note unwritten and does not stop the Surah opening. The Particle dialog reads its file from the network when it can, so it always shows the published file, and falls back to the kept one.

**Updates.** The manifest has no particle hashes and is not changed. A particle file changes only with the import, which changes every Surah file naming the particle, so a Surah downloaded again for a changed hash keeps its particle files again. At each `checkForUpdates`, a kept Surah whose hash matches the manifest but whose note does not hold that hash keeps its particle files from its kept body. That covers a Surah an app before this release kept with particles in its file, and one whose particle files did not all download. A Surah kept before Surah files carried particles shows no Particle tag. The deploy that added particles changed its hash, so the next check downloads it again with its particle files.

**Particle list.** The Known words page's Particles tab reads `/data/v1/particles.json`, new with this release: every particle by number, with its kind, text, Indo-Pak text and its Spellings' distinct meanings in each Language, as the website's Particles tab lists them (#251). The app keeps it as it keeps the Root list, read from the network first and kept for when there is no connection.

**Known particles.** The app keeps a Known particle by its kind and text with the Known Roots under `qwt-known-words` ([0057](0057-known-words-are-kept-by-their-letters-and-merged-per-entry-with-unmarks-kept.md)), and tints its Words' cards green with Known words colour on, as a Known Root's.

## Consequences

- A particle's file is kept once however many Surahs name it. Particle files are not removed when no kept Surah names them, as Surahs are never removed.
- The first open of a Surah waits for its particle files, as many as a hundred small downloads for Al-Baqarah.

## Considered Options

- Particle hashes in the manifest: every app reading the manifest would download a larger one, for files that change only when Surah files change too.
- Keeping every particle file at the first launch: 352 files most readers never open.
- Reading particle files online only, as Root dialogs are: the issue asks for Particle dialogs offline.
