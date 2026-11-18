# The app keeps a Surah's Allah references beside it and takes a new version when the Surah opens

The mobile app shows the website's Allah references in gold (#151), read from `GET /api/v1/allah-references/{surah}` ([0028](0028-the-allah-references-endpoint-reads-neon-on-each-request-and-says-when-it-cannot.md)), and a Surah kept for offline reading must show them without a connection ([0025](0025-offline-surahs-are-kept-as-files-and-refreshed-by-manifest-hash.md)). Opening a Surah, the app's data layer (`src/quran-analysis.ts`) asks the endpoint for that Surah's Allah references while it reads or downloads the Surah, and marks each Word card at a Word location in the answer (`WordCard.allahReference`). The answer is kept in `DeviceFiles` beside the Surah, as `allah-references/<n>.json`, the endpoint's JSON as it came, and is written again only when its `version` differs from the kept one's.

When the endpoint cannot be read — no connection, a 503, any answer but 200, or no answer within 3 seconds — the Surah still opens, its Words marked by the kept answer, or by none when nothing is kept. Nothing is ever kept as "none" from such an answer, so an outage never drops a Surah's gold until its version next moves. A kept answer the app cannot read (a file cut short) counts as none kept, and the next answer replaces it; it never stops the Surah opening.

This amends [0025](0025-offline-surahs-are-kept-as-files-and-refreshed-by-manifest-hash.md)'s "opening a kept Surah reads the file and makes no request": a kept Surah opened online now asks for its Allah references too, the one request the issue's refetch on a new version needs. The 3-second wait keeps 0025's point, that a kept Surah opens from its file whatever the network does: a network that hangs, rather than fails, holds the Surah back for at most that long, and it opens with its kept Allah references.

The Allah reference colour switch is kept in `DeviceStorage` under the website's own key, `qwt-allah-reference-colour`, as `on` or `off`; anything but `off`, a missing value included, reads as on. It is never sent anywhere. The data layer marks the Words whatever the switch says; the Word card screen draws a marked Word's Arabic in Allah reference colour (`allah` in `src/theme.ts`, #A87A0A light and #E3B84F dark, the website's `--allah`) only while the switch is on, and leaves the Word meaning, the Root tag and the Recited Word's marking as they are.

## Consequences

- A kept Surah that opens online makes one request, for its Allah references, where it made none before. It is asked alongside the Surah file, so a Surah that downloads waits for the slower of the two, and a kept Surah waits for the answer, the failure or the 3 seconds, whichever comes first. Offline the request fails at once.
- An answer slower than 3 seconds is dropped for that opening, so on a very slow connection a Surah opened for the first time can show no gold until it is opened again.
- A new version reaches a kept Surah the next time it is opened online, without downloading `/data/v1/surahs/<n>.json` again: the manifest is built at deploy time and does not move when an Admin corrects a Surah's Allah references, so `checkForUpdates` cannot see the change.
- A Surah opened once while the endpoint was unread, and never online since, shows no gold offline until it is opened again with the endpoint answering.

## Considered Options

- Refreshing every kept Surah's Allah references in `checkForUpdates`: one request per kept Surah at each launch and reconnection, up to 114, to learn about changes most readers never open.
- Putting the version in the manifest: the manifest is built at deploy time from the static dataset, and an Admin's publish of Allah references changes only Neon, so it would go stale until the next deploy.
- Keeping the answer in `DeviceStorage`: it holds small settings; the answers sit naturally beside the Surah files they mark.
- Opening the Surah first and marking its Allah references when the answer comes: no wait at all, but the Surah would open, then repaint, and the data layer would answer a Surah twice; a bounded wait keeps one answer per opening.
- Waiting with no bound: a captive portal or a stalled connection would hold a kept Surah back for as long as the platform lets a request run, which fetch does not bound.
- Keeping a 503 as an empty answer: the app would lose its gold for that Surah until the version moved, the very outage [0028](0028-the-allah-references-endpoint-reads-neon-on-each-request-and-says-when-it-cannot.md) answers 503 to avoid.
