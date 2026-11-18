Follows [0034](0034-the-app-keeps-a-surahs-allah-references-beside-it-and-takes-a-new-version-at-open.md) for the Tafsir ([0053](0053-a-published-tafsir-replaces-saaliheens-own-explanations.md)), and departs from it in when a kept answer is asked for again.

# The app keeps a Surah's Tafsir beside it in each Language and asks again for it at each update check

A Surah downloaded in the mobile app must show its Tafsir offline in the reader's Language (#238). Opening a Surah while the Tafsir is switched on, the app's data layer (`src/quran-analysis.ts`) asks `GET /api/v1/tafsir/{surah}?lang=` ([0054](0054-the-tafsir-is-loaded-by-a-script-that-asks-the-deployment-to-refresh-it.md)) and keeps the answer in `DeviceFiles` beside the Surah, as `tafsir/<language>/<n>.json`, one file for each Language the Surah was opened in. A file is written again only when the answer is not, byte for byte, the kept one. A 200 with no entries, a Language whose edition is not loaded, is a real answer and is kept like any other.

When the endpoint cannot be read (no connection, any answer but 200, an answer that is no Tafsir, or none within 3 seconds), the kept Tafsir in that Language shows, else none. So a reader who changes Language offline to one not kept sees the Surah without Tafsir, and a missing, cut-short or unreadable file counts as none kept, never stopping the Surah opening; the next answer replaces it. Nothing is ever kept as "none", for 0034's reason.

Unlike the Allah references, the Tafsir has no version, and 0054's reload is the owner correcting a source, never an Admin edit. So at launch and whenever the connection comes back, `checkForUpdates` asks again for every Tafsir file the device keeps, every Surah in every Language, and writes those whose answer changed, so a reloaded Tafsir reaches a kept Surah that is next opened offline. It asks only for files that exist: a Surah never opened, or a Language never read, costs nothing.

## Consequences

- A launch online makes one Tafsir request for each kept Surah in each kept Language, up to 228, which 0034 judged too many for the Allah references. The Tafsir is what a reader reads offline at length, the answers are cached by the CDN and Next's data cache (0054), and a reader keeps only the Surahs they opened; the issue chose freshness over the requests.
- With the release switch off, the update check asks for no Tafsir, as opening a Surah does not, so a build that holds the Tafsir back sends no Tafsir request at all.
- A Language is kept for a Surah when the Surah is opened in it online: changing Language online keeps the new Language's Tafsir for the Surah open then, and for each other kept Surah as it is next opened online, not for every kept Surah at once. Likewise a Surah kept before the Tafsir was switched on gets its Tafsir the next time it is opened online.
- A Tafsir file that cannot be read or written never stops a Surah opening: the answer shows unkept, or the Surah shows without Tafsir.
- A kept file that cannot be read (cut short, say) is asked for again at the update check like any other, and the answer replaces it.

## Considered Options

- Asking again only when the Surah opens, as 0034 does: a reader who reads a kept Surah only offline would keep the old Tafsir forever.
- A Tafsir version or hash in the manifest: the manifest is built at deploy time, and a Tafsir load changes only Neon, so it would go stale until the next deploy.
- Keeping only the reader's current Language: changing Language offline would lose the other Language's Tafsir, which the device had already downloaded.
