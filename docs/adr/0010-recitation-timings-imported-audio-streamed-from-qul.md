# Recitation timings are imported, the audio is streamed from QUL

Quran Analysis marks the Recited Word as a Recitation plays, so it needs a Reciter whose every Word is timed. We use Yasser ad-Dussary's Surah-by-Surah Murattal from QUL (resource 422): one gapless MP3 per Surah and, for every Ayah, `[word position, start ms, end ms]` timings whose positions are already our Word locations, in either Script ([0002](0002-script-specific-quran-text.md)). The timings are imported into the static dataset like the rest of QUL's data ([0001](0001-static-quran-dataset.md)); the audio, about 1.5 GB, is streamed from Tarteel's CDN (`audio-cdn.tarteel.ai`) and not hosted by Saaliheen. QUL publishes both in its resources without a stated licence, which we take as permission to use them as published.

## Consequences

- Saaliheen depends on Tarteel's CDN staying up and free; if it goes, Recitation stops while reading carries on. Hosting the same files ourselves later changes only the audio's base URL, since the timings are relative to each Surah's file.
- The timings follow the Reciter, not the text: 1,092 Ayahs repeat Words (e.g. 2:9 runs 1–9 then 6–10) and the Recited Word goes back with them; five Words have no timing (21:87:9, 40:40:20, 49:11:33, 74:31:45–46) and the previous Word stays marked over them.
- The Surah files start at Ayah 1 with no recited Bismillah, so the Bismillah line above a Surah is never marked.

## Considered Options

- QUL resource 351 (Dussary, Surah by Surah): rejected, its timings are per Ayah only.
- QUL resource 103 (Dussary, Ayah by Ayah, word-timed): rejected, 6,236 separate files leave gaps between Ayahs on the web and on the lock screen.
- quran.com API: has no Dussary timings, and calling it at runtime would break [0001](0001-static-quran-dataset.md).
- Hosting the audio ourselves from the start: deferred; 1.5 GB of storage and bandwidth per Reciter for no gain while QUL serves it.
